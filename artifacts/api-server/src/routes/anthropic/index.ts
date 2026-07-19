import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, conversations, aiMessages, settingsTable } from "@workspace/db";
import { requireAuth } from "../../middlewares/auth";
import { CMS_TOOLS, executeTool } from "./tools";
import { createAnthropicClient } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

/** Get an Anthropic client — uses admin's personal key if configured, else Replit proxy. */
async function getAnthropicClient() {
  const rows = await db.select().from(settingsTable);
  return createAnthropicClient(rows[0]?.anthropicApiKey ?? null);
}

const SYSTEM_PROMPT = `You are an expert bilingual (English and Arabic) content assistant and CMS manager for Mohammad Ghanayem's personal portfolio website.

Your capabilities:
- Write and improve content for any section or blog post
- Take real CMS actions: create/edit pages, add sections, update blog posts, change branding
- Conduct SEO/AEO audits and provide specific, actionable improvements
- Review the entire website and compare it with a CV to find gaps

Content guidelines:
- Always label bilingual output as [EN] and [AR] sections
- For Arabic content, write in formal Modern Standard Arabic (فصحى) appropriate for a professional portfolio
- Keep tone professional, concise, and achievement-focused
- For hero/bio sections: lead with the person's role and key value proposition

SEO/AEO guidelines when auditing:
- Meta titles: 50-60 characters, include name + role + value prop
- Meta descriptions: 150-160 characters, include primary keywords
- AEO: suggest direct-answer paragraphs, FAQ blocks, and concise definitions optimised for Perplexity, ChatGPT Search, and Google SGE
- Check JSON-LD structured data completeness (Person, BlogPosting, WebPage schemas)

Site review guidelines:
- Structure your report with sections: Content, Structure, SEO/AEO, Design & UX, Priority Actions
- Priority actions should be numbered 1–5, highest impact first
- When comparing with a CV, flag: missing experience, missing skills, inconsistent job titles or dates

Actions:
- ALWAYS ask for confirmation before deleting anything (pages, sections)
- When you take an action, briefly summarise what you did
- After taking actions, suggest the next logical step

Respond in the same language the user writes in (English or Arabic).`;

// GET /anthropic/conversations — list all
router.get("/anthropic/conversations", requireAuth, async (_req, res): Promise<void> => {
  const convs = await db.select().from(conversations).orderBy(asc(conversations.id));
  res.json(convs);
});

// POST /anthropic/conversations — create
router.post("/anthropic/conversations", requireAuth, async (req, res): Promise<void> => {
  const { title } = req.body as { title?: string };
  if (!title?.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [conv] = await db.insert(conversations).values({ title: title.trim() }).returning();
  res.status(201).json(conv);
});

// GET /anthropic/conversations/:id — with messages
router.get("/anthropic/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params["id"]), 10);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const msgs = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, id)).orderBy(asc(aiMessages.createdAt));
  res.json({ ...conv, messages: msgs });
});

// DELETE /anthropic/conversations/:id
router.delete("/anthropic/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params["id"]), 10);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  await db.delete(conversations).where(eq(conversations.id, id));
  res.sendStatus(204);
});

// GET /anthropic/conversations/:id/messages
router.get("/anthropic/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params["id"]), 10);
  const msgs = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, id)).orderBy(asc(aiMessages.createdAt));
  res.json(msgs);
});

// POST /anthropic/conversations/:id/messages — streaming SSE agentic loop
router.post("/anthropic/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params["id"]), 10);
  const { content } = req.body as { content?: string };

  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  // Save user message
  await db.insert(aiMessages).values({ conversationId: id, role: "user", content: content.trim() });

  // Load full conversation history
  const history = await db.select().from(aiMessages)
    .where(eq(aiMessages.conversationId, id))
    .orderBy(asc(aiMessages.createdAt));

  // Build Anthropic messages array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatMessages: any[] = history.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const client = await getAnthropicClient();
    let fullAssistantResponse = "";
    let continueLoop = true;
    let currentMessages = [...chatMessages];

    while (continueLoop) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        tools: CMS_TOOLS,
        messages: currentMessages,
      });

      // Stream text content blocks
      for (const block of response.content) {
        if (block.type === "text") {
          fullAssistantResponse += block.text;
          // Stream word by word for a smooth experience
          const words = block.text.split(/(\s+)/);
          for (const word of words) {
            if (word) sendEvent({ content: word });
          }
        }
      }

      if (response.stop_reason === "tool_use") {
        // Execute tool calls
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolUseBlocks = (response.content as any[]).filter((b: any) => b.type === "tool_use");
        const toolResults: any[] = [];

        for (const block of toolUseBlocks) {
          if (block.type !== "tool_use") continue;
          sendEvent({ toolCall: { name: block.name, input: block.input } });
          const result = await executeTool(block.name, block.input as Record<string, unknown>);
          sendEvent({ toolResult: { name: block.name, success: result.success, data: result.data, error: result.error } });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }

        // Continue conversation with tool results
        currentMessages = [
          ...currentMessages,
          { role: "assistant" as const, content: response.content },
          { role: "user" as const, content: toolResults },
        ];
      } else {
        continueLoop = false;
      }
    }

    // Save full assistant response to DB
    if (fullAssistantResponse) {
      await db.insert(aiMessages).values({ conversationId: id, role: "assistant", content: fullAssistantResponse });
    }

    sendEvent({ done: true });
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    sendEvent({ error: msg, done: true });
    res.end();
  }
});

export default router;
