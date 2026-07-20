import { useState, useRef, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useListAnthropicConversations,
  useCreateAnthropicConversation,
  useDeleteAnthropicConversation,
  useGetAnthropicConversation,
  useListPages,
  useListAdminPosts,
  getListAnthropicConversationsQueryKey,
  getGetAnthropicConversationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Loader2,
  MessageSquare,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface StreamEvent {
  content?: string;
  toolCall?: { name: string; input: Record<string, unknown> };
  toolResult?: { name: string; success: boolean; data?: unknown; error?: string };
  done?: boolean;
  error?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ name: string; success: boolean; summary: string }>;
  isStreaming?: boolean;
}

// ── Tool name → human label ───────────────────────────────────────────────────
function toolLabel(name: string): string {
  const map: Record<string, string> = {
    list_pages: "Listed pages",
    create_page: "Created page",
    update_page: "Updated page",
    delete_page: "Deleted page",
    list_sections: "Listed sections",
    add_section: "Added section",
    update_section: "Updated section",
    update_section_item: "Updated item",
    delete_section: "Deleted section",
    list_blog_posts: "Listed blog posts",
    create_blog_post: "Created blog post",
    update_blog_post: "Updated blog post",
    update_branding: "Updated branding",
    get_all_pages_with_sections: "Fetched all pages",
    get_all_blog_posts: "Fetched all posts",
    get_branding_settings: "Fetched settings",
  };
  return map[name] ?? name;
}

// ── Stream helper ─────────────────────────────────────────────────────────────
async function streamConversationMessage(
  conversationId: number,
  content: string,
  onEvent: (e: StreamEvent) => void
): Promise<void> {
  const res = await fetch(`/api/anthropic/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  if (!res.ok || !res.body) {
    onEvent({ error: "Request failed", done: true });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6)) as StreamEvent;
          onEvent(event);
        } catch { /* skip malformed */ }
      }
    }
  }
}

// ── Tool result card ──────────────────────────────────────────────────────────
function ToolCard({ name, success, summary }: { name: string; success: boolean; summary: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border w-fit ${
      success
        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
        : "bg-red-50 border-red-200 text-red-700"
    }`}>
      {success
        ? <CheckCircle2 className="w-3 h-3 shrink-0" />
        : <XCircle className="w-3 h-3 shrink-0" />
      }
      <span className="font-medium">{toolLabel(name)}</span>
      {summary && <span className="opacity-70">— {summary}</span>}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] space-y-2`}>
        {/* Tool call cards (assistant only) */}
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="flex flex-col gap-1">
            {msg.toolCalls.map((tc, i) => (
              <ToolCard key={i} name={tc.name} success={tc.success} summary={tc.summary} />
            ))}
          </div>
        )}
        {/* Text bubble */}
        {(msg.content || msg.isStreaming) && (
          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          }`}>
            {msg.content}
            {msg.isStreaming && (
              <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Streaming output area (SEO / Review tabs) ─────────────────────────────────
function StreamingOutput({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);

  if (!text && !isStreaming) return null;
  return (
    <div ref={ref} className="flex-1 overflow-y-auto rounded-xl border bg-muted/30 p-5 text-sm leading-relaxed whitespace-pre-wrap font-mono">
      {text}
      {isStreaming && <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse rounded-sm" />}
    </div>
  );
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTab() {
  const queryClient = useQueryClient();
  const { data: convList = [], isLoading: loadingList } = useListAnthropicConversations();
  const createConv = useCreateAnthropicConversation();
  const deleteConv = useDeleteAnthropicConversation();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: activeConv } = useGetAnthropicConversation(activeId!, {
    query: { enabled: !!activeId, queryKey: getGetAnthropicConversationQueryKey(activeId!) },
  });

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConv) {
      setMessages(
        activeConv.messages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
    } else {
      setMessages([]);
    }
  }, [activeConv]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewConversation = async () => {
    const title = `Chat ${new Date().toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
    const conv = await createConv.mutateAsync({ data: { title } });
    queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
    setActiveId(conv.id);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConv.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
    if (activeId === id) { setActiveId(null); setMessages([]); }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeId || isStreaming) return;
    const userMsg = input.trim();
    setInput("");
    setIsStreaming(true);

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);

    // Add streaming assistant placeholder
    const assistantIdx = (prev: ChatMessage[]) => prev.length;
    setMessages(prev => [...prev, { role: "assistant", content: "", isStreaming: true, toolCalls: [] }]);

    let accText = "";
    const pendingTools: ChatMessage["toolCalls"] = [];
    let pendingToolName = "";

    await streamConversationMessage(activeId, userMsg, (event) => {
      if (event.content) {
        accText += event.content;
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") last.content = accText;
          return next;
        });
      }
      if (event.toolCall) {
        pendingToolName = event.toolCall.name;
      }
      if (event.toolResult) {
        pendingTools?.push({
          name: event.toolResult.name,
          success: event.toolResult.success,
          summary: event.toolResult.success
            ? JSON.stringify(event.toolResult.data).slice(0, 80)
            : (event.toolResult.error ?? ""),
        });
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") last.toolCalls = [...(pendingTools ?? [])];
          return next;
        });
      }
      if (event.done || event.error) {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") last.isStreaming = false;
          return next;
        });
        setIsStreaming(false);
        queryClient.invalidateQueries({ queryKey: getGetAnthropicConversationQueryKey(activeId) });
      }
    });
    void assistantIdx; void pendingToolName;
  }, [input, activeId, isStreaming, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col gap-2">
        <Button size="sm" className="gap-2 w-full" onClick={handleNewConversation} disabled={createConv.isPending}>
          <Plus className="w-3.5 h-3.5" /> New Chat
        </Button>
        <ScrollArea className="flex-1 rounded-md border">
          {loadingList && <div className="p-3 text-xs text-muted-foreground">Loading…</div>}
          {!loadingList && convList.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">No conversations yet.</div>
          )}
          {convList.map(conv => (
            <div
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={`group flex items-center justify-between gap-1 px-3 py-2.5 cursor-pointer text-xs border-b transition-colors ${
                activeId === conv.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare className="w-3 h-3 shrink-0" />
                <span className="truncate">{conv.title}</span>
              </div>
              <button
                onClick={(e) => handleDelete(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </ScrollArea>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Sparkles className="w-10 h-10 opacity-30" />
            <p className="text-sm">Start a new chat or select an existing one.</p>
            <Button variant="outline" size="sm" onClick={handleNewConversation}>
              <Plus className="w-3.5 h-3.5 mr-2" /> New Chat
            </Button>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
              {messages.length === 0 && !isStreaming && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  <p>Ask me to write content, create pages, add sections, or anything else.</p>
                  <p className="mt-1 text-xs opacity-60">Tip: Press ⌘+Enter to send</p>
                </div>
              )}
              {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            </div>
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Claude to write content, create pages, add sections…"
                className="min-h-[80px] resize-none text-sm"
                disabled={isStreaming}
              />
              <Button onClick={handleSend} disabled={!input.trim() || isStreaming} className="h-10 px-3 gap-2">
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── SEO & AEO Tab ─────────────────────────────────────────────────────────────
function SeoTab() {
  const queryClient = useQueryClient();
  const createConv = useCreateAnthropicConversation();
  const { data: pages = [] } = useListPages();
  const { data: posts = [] } = useListAdminPosts();

  const [target, setTarget] = useState("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const handleAnalyse = async () => {
    if (!target || isStreaming) return;
    setOutput("");
    setIsStreaming(true);

    const [kind, id] = target.split(":");
    const prompt = kind === "page"
      ? `Run a full SEO and AEO audit for the page with ID ${id}. Use get_all_pages_with_sections to read its content, then provide:
1. Rewritten meta title (50-60 chars) and description (150-160 chars) — include character counts
2. Keyword gaps and suggestions for both English and Arabic
3. JSON-LD structured data improvements (WebPage/Person schema)
4. AEO checklist: direct-answer paragraphs, FAQ opportunities, concise definitions for AI search engines (Perplexity, ChatGPT, SGE)
5. Arabic-specific SEO recommendations
Format clearly with headers.`
      : `Run a full SEO and AEO audit for the blog post with ID ${id}. Use get_all_blog_posts to read its content, then provide:
1. Rewritten meta title (50-60 chars) and description (150-160 chars) — include character counts
2. Keyword gaps and content structure improvements
3. JSON-LD BlogPosting schema improvements
4. AEO checklist: direct-answer intro paragraph, FAQ opportunities, featured snippet optimisation
5. Arabic-specific SEO recommendations
Format clearly with headers.`;

    const conv = await createConv.mutateAsync({ data: { title: `SEO Audit — ${target}` } });
    queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });

    await streamConversationMessage(conv.id, prompt, (event) => {
      if (event.content) setOutput(prev => prev + event.content);
      if (event.done || event.error) setIsStreaming(false);
    });
  };

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-12rem)]">
      <div className="flex gap-3 items-end shrink-0">
        <div className="flex-1 space-y-1.5">
          <Label className="text-sm">Select page or blog post to audit</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a page or post…" />
            </SelectTrigger>
            <SelectContent>
              {pages.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pages</div>
                  {pages.map(p => (
                    <SelectItem key={`page:${p.id}`} value={`page:${p.id}`}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        {p.titleEn || p.titleAr}
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
              {posts.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Blog Posts</div>
                  {posts.map(p => (
                    <SelectItem key={`post:${p.id}`} value={`post:${p.id}`}>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                        {p.titleEn || p.titleAr}
                        {!p.isPublished && <Badge variant="secondary" className="text-[10px] h-4">Draft</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAnalyse} disabled={!target || isStreaming} className="gap-2">
          {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Analyse
        </Button>
      </div>

      {!output && !isStreaming && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2">
            <Search className="w-8 h-8 opacity-30 mx-auto" />
            <p className="text-sm">Select a page or post and click Analyse.</p>
            <p className="text-xs opacity-60">Claude will read the content and return specific, actionable SEO and AEO improvements.</p>
          </div>
        </div>
      )}
      <StreamingOutput text={output} isStreaming={isStreaming} />
    </div>
  );
}

// ── Site Review Tab ───────────────────────────────────────────────────────────
function ReviewTab() {
  const queryClient = useQueryClient();
  const createConv = useCreateAnthropicConversation();
  const [cvText, setCvText] = useState("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const handleReview = async () => {
    if (isStreaming) return;
    setOutput("");
    setIsStreaming(true);

    const cvSection = cvText.trim()
      ? `\n\nHere is the CV to compare against:\n<cv>\n${cvText.trim()}\n</cv>`
      : "\n\n(No CV provided — review the site on its own merits.)";

    const prompt = `Please conduct a full website review.

Use get_all_pages_with_sections to read all pages and their content.
Use get_all_blog_posts to read all blog posts.
Use get_branding_settings to check SEO structured data.
${cvSection}

Produce a structured review report with these exact sections:

## 1. Content
Assess clarity, completeness, tone, and missing information. If a CV was provided, flag any experience, skills, or achievements on the CV that are missing from the website, and note any inconsistencies.

## 2. Structure
Assess page hierarchy, section order, navigation logic, and whether the site tells a coherent professional story.

## 3. SEO & AEO
Assess site-wide meta coverage, structured data health, keyword opportunities, and answer-engine readiness.

## 4. Design & UX
Based on section types, content density, CTA placement, and branding settings — assess the user experience. Note anything that may confuse or lose visitors.

## 5. Priority Actions
List the 5 highest-impact changes to make first, numbered 1–5. Be specific and actionable.`;

    const conv = await createConv.mutateAsync({ data: { title: `Site Review — ${new Date().toLocaleDateString("en")}` } });
    queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });

    await streamConversationMessage(conv.id, prompt, (event) => {
      if (event.content) setOutput(prev => prev + event.content);
      if (event.done || event.error) setIsStreaming(false);
    });
  };

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-12rem)]">
      <div className="space-y-2 shrink-0">
        <Label className="text-sm">Your CV (optional — paste text for comparison)</Label>
        <Textarea
          value={cvText}
          onChange={e => setCvText(e.target.value)}
          placeholder="Paste your CV or résumé text here. Claude will compare it against your website and flag gaps, inconsistencies, and missing highlights."
          className="min-h-[120px] text-sm resize-none"
          disabled={isStreaming}
        />
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Button onClick={handleReview} disabled={isStreaming} className="gap-2">
          {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Run Full Review
        </Button>
        {isStreaming && (
          <p className="text-xs text-muted-foreground animate-pulse">
            Claude is reading all your pages, sections, and posts…
          </p>
        )}
      </div>

      {!output && !isStreaming && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2 max-w-sm">
            <Sparkles className="w-8 h-8 opacity-30 mx-auto" />
            <p className="text-sm font-medium">Full website review</p>
            <p className="text-xs opacity-70">Claude reads every page, section, and blog post — then delivers a structured report covering content, structure, SEO/AEO, design & UX, and your top 5 priority actions.</p>
            {!cvText && (
              <p className="text-xs opacity-50 flex items-center gap-1 justify-center">
                <ChevronRight className="w-3 h-3" /> Add your CV above for a gap analysis
              </p>
            )}
          </div>
        </div>
      )}
      <StreamingOutput text={output} isStreaming={isStreaming} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AiChat() {
  return (
    <AdminLayout>
      <div className="max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            Claude AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Write content, manage CMS, audit SEO/AEO, or get a full site review — all in one place.
          </p>
        </div>

        <Tabs defaultValue="chat">
          <TabsList className="mb-4">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Chat & CMS
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-2">
              <Search className="w-3.5 h-3.5" /> SEO & AEO Audit
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Site Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat"><ChatTab /></TabsContent>
          <TabsContent value="seo"><SeoTab /></TabsContent>
          <TabsContent value="review"><ReviewTab /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
