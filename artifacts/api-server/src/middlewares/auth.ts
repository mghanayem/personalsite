import { type Request, type Response, type NextFunction } from "express";
import "../types/session.d.ts";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session && req.session.adminId) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}
