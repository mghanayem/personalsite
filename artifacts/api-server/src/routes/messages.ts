import { Router, type IRouter, type Request, type Response } from "express";
import { db, contactMessagesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /messages — list all non-archived messages (newest first)
router.get("/messages", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const messages = await db
    .select()
    .from(contactMessagesTable)
    .where(eq(contactMessagesTable.isArchived, false))
    .orderBy(desc(contactMessagesTable.receivedAt));

  res.json(messages);
});

// GET /messages/archived — list archived messages
router.get("/messages/archived", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const messages = await db
    .select()
    .from(contactMessagesTable)
    .where(eq(contactMessagesTable.isArchived, true))
    .orderBy(desc(contactMessagesTable.receivedAt));

  res.json(messages);
});

// PATCH /messages/:id/read — mark a message as read
router.patch("/messages/:id/read", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid message ID." });
    return;
  }

  const [updated] = await db
    .update(contactMessagesTable)
    .set({ isRead: true })
    .where(eq(contactMessagesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Message not found." });
    return;
  }

  res.json(updated);
});

// PATCH /messages/:id/archive — archive a message
router.patch("/messages/:id/archive", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid message ID." });
    return;
  }

  const [updated] = await db
    .update(contactMessagesTable)
    .set({ isArchived: true, isRead: true })
    .where(and(eq(contactMessagesTable.id, id), eq(contactMessagesTable.isArchived, false)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Message not found or already archived." });
    return;
  }

  res.json(updated);
});

// PATCH /messages/:id/unarchive — restore a message from archive
router.patch("/messages/:id/unarchive", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid message ID." });
    return;
  }

  const [updated] = await db
    .update(contactMessagesTable)
    .set({ isArchived: false })
    .where(and(eq(contactMessagesTable.id, id), eq(contactMessagesTable.isArchived, true)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Message not found or not archived." });
    return;
  }

  res.json(updated);
});

export default router;
