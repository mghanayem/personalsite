import { useState, useRef, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateAnthropicConversation, getListAnthropicConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, Sparkles, CheckCircle2, XCircle, Copy, Check } from "lucide-react";

interface StreamEvent {
  content?: string;
  toolCall?: { name: string };
  toolResult?: { name: string; success: boolean; data?: unknown; error?: string };
  done?: boolean;
  error?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  toolCalls?: Array<{ name: string; success: boolean }>;
}

interface AiAssistPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Describe the context: section type, existing content, etc. */
  contextDescription: string;
  /** Initial prompt pre-filled in the input */
  initialPrompt?: string;
  /** Called with field-keyed content when the user copies a block */
  title?: string;
}

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
  if (!res.ok || !res.body) { onEvent({ error: "Request failed", done: true }); return; }

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
        try { onEvent(JSON.parse(line.slice(6)) as StreamEvent); } catch { /**/ }
      }
    }
  }
}

function ToolBadge({ name, success }: { name: string; success: boolean }) {
  const labels: Record<string, string> = {
    update_section: "Updated section", update_section_item: "Updated item", add_section: "Added section",
    update_blog_post: "Updated post", create_blog_post: "Created post",
    update_page: "Updated page", update_branding: "Updated branding",
    get_all_pages_with_sections: "Read all pages", get_branding_settings: "Read settings",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
      {success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {labels[name] ?? name}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /**/ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={handleCopy} title="Copy text" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity p-1 rounded">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function AiAssistPanel({ open, onOpenChange, contextDescription, initialPrompt, title = "AI Assistant" }: AiAssistPanelProps) {
  const queryClient = useQueryClient();
  const createConv = useCreateAnthropicConversation();

  const [convId, setConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setMessages([]);
      setConvId(null);
      setInput(initialPrompt ?? "");
    }
  }, [open, initialPrompt]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const ensureConversation = useCallback(async () => {
    if (convId) return convId;
    const conv = await createConv.mutateAsync({ data: { title: `AI Assist — ${title}` } });
    queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
    setConvId(conv.id);
    return conv.id;
  }, [convId, createConv, queryClient, title]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;
    const userContent = input.trim();
    setInput("");
    setIsStreaming(true);

    // Include context in first message
    const fullContent = messages.length === 0
      ? `Context: ${contextDescription}\n\n${userContent}`
      : userContent;

    setMessages(prev => [...prev, { role: "user", content: userContent }]);
    setMessages(prev => [...prev, { role: "assistant", content: "", isStreaming: true, toolCalls: [] }]);

    let accText = "";
    const id = await ensureConversation();

    await streamConversationMessage(id, fullContent, (event) => {
      if (event.content) {
        accText += event.content;
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") last.content = accText;
          return next;
        });
      }
      if (event.toolResult) {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            last.toolCalls = [...(last.toolCalls ?? []), { name: event.toolResult!.name, success: event.toolResult!.success }];
          }
          return next;
        });
      }
      if (event.done || event.error) {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") last.isStreaming = false;
          return next;
        });
        setIsStreaming(false);
      }
    });
  }, [input, isStreaming, messages, contextDescription, ensureConversation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[480px] flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            {title}
          </SheetTitle>
          <p className="text-xs text-muted-foreground leading-relaxed">{contextDescription}</p>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-3">
          <div ref={scrollRef} className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-xs space-y-1">
                <p>Claude will generate content for this section.</p>
                <p className="opacity-60">Tip: ⌘+Enter to send. Hover responses to copy.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[90%] space-y-1.5">
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {msg.toolCalls.map((tc, j) => <ToolBadge key={j} name={tc.name} success={tc.success} />)}
                    </div>
                  )}
                  {(msg.content || msg.isStreaming) && (
                    <div className={`relative group rounded-xl px-3 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}>
                      {msg.content}
                      {msg.isStreaming && <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse rounded-sm" />}
                      {msg.role === "assistant" && msg.content && !msg.isStreaming && (
                        <CopyButton text={msg.content} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-3 flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Claude to write, rewrite, or translate…"
            className="min-h-[72px] resize-none text-sm"
            disabled={isStreaming}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isStreaming} size="icon" className="shrink-0">
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
