import { Router, type IRouter, type Request, type Response } from "express";
import { Resend } from "resend";
import { db, contactMessagesTable } from "@workspace/db";

const router: IRouter = Router();

// Lazy-initialize Resend so the server starts even if the key is absent.
let resend: Resend | null = null;
function getResend(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /public/contact
router.post("/public/contact", async (req: Request, res: Response): Promise<void> => {
  const { name, email, message } = req.body ?? {};

  // Basic validation
  if (
    typeof name !== "string" || name.trim().length === 0 || name.length > 100 ||
    typeof email !== "string" || !EMAIL_REGEX.test(email) || email.length > 254 ||
    typeof message !== "string" || message.trim().length === 0 || message.length > 5000
  ) {
    res.status(400).json({ error: "Invalid form data. Please check all fields and try again." });
    return;
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanMessage = message.trim();

  // Always save to DB first — independent of email delivery.
  await db.insert(contactMessagesTable).values({
    name: cleanName,
    email: cleanEmail,
    message: cleanMessage,
  });

  const contactEmail = process.env.CONTACT_EMAIL;
  if (!contactEmail) {
    // Message saved; email delivery not configured.
    res.json({ message: "Message sent successfully." });
    return;
  }

  const client = getResend();
  if (!client) {
    // Message saved; email delivery not configured.
    res.json({ message: "Message sent successfully." });
    return;
  }

  // Best-effort email — do not fail the response if this errors.
  await client.emails.send({
    from: "Website Contact Form <onboarding@resend.dev>",
    to: contactEmail,
    replyTo: cleanEmail,
    subject: `New message from ${cleanName}`,
    html: `
      <p><strong>Name:</strong> ${escapeHtml(cleanName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap">${escapeHtml(cleanMessage)}</p>
    `,
    text: `Name: ${cleanName}\nEmail: ${cleanEmail}\n\nMessage:\n${cleanMessage}`,
  });

  res.json({ message: "Message sent successfully." });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default router;
