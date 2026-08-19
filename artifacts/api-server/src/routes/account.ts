import { Router, type IRouter } from "express";
import bcrypts from "bcrypts";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { ChangePasswordBody, ChangeUsernameBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// PATCH /account/password
router.patch("/account/password", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.adminId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Session invalid" });
    return;
  }

  const valid = await bcrypts.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypts.hash(parsed.data.newPassword, 12);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, userId));

  res.json({ message: "Password changed successfully" });
});

// PATCH /account/username
router.patch("/account/username", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangeUsernameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.adminId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Session invalid" });
    return;
  }

  const valid = await bcrypts.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  let updated: typeof usersTable.$inferSelect | undefined;
  try {
    const rows = await db
      .update(usersTable)
      .set({ username: parsed.data.newUsername })
      .where(eq(usersTable.id, userId))
      .returning();
    updated = rows[0];
  } catch (err: unknown) {
    // PostgreSQL unique-constraint violation: code 23505
    const pgCode = (err as { code?: string }).code;
    if (pgCode === "23505") {
      res.status(400).json({ error: "Username already taken" });
      return;
    }
    throw err;
  }

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  req.session.adminUsername = parsed.data.newUsername;
  res.json({ message: "Username changed successfully" });
});

export default router;
