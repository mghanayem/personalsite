import { Router, type IRouter, type Request, type Response } from "express";
import { db, messagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /messages — admin: list all messages newest first
router.get("/messages", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const messages = await db
    .select()
    .from(messagesTable)
    .orderBy(desc(messagesTable.createdAt));

  res.json(messages);
});

// PATCH /messages/:id/read — admin: mark a message as read
router.patch("/messages/:id/read", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid message id" });
    return;
  }

  const [updated] = await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(eq(messagesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.json(updated);
});

// DELETE /messages/:id — admin: delete a message
router.delete("/messages/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid message id" });
    return;
  }

  const [deleted] = await db
    .delete(messagesTable)
    .where(eq(messagesTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.json({ message: "Deleted" });
});

export default router;
