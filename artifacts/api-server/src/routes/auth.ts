import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { AdminLoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.adminId = user.id;
  req.session.adminUsername = user.username;

  res.json({
    id: user.id,
    username: user.username,
    isDefaultPassword: password === "admin",
  });
});

// POST /auth/logout
router.post("/auth/logout", (_req, res): void => {
  _req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

// GET /auth/session
router.get("/auth/session", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.adminId!;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Session invalid" });
    return;
  }

  // Detect default password by checking if hash matches "admin"
  const isDefaultPassword = await bcrypt.compare("admin", user.passwordHash);

  res.json({
    id: user.id,
    username: user.username,
    isDefaultPassword,
  });
});

export default router;
