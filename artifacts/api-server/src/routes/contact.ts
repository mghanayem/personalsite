import { Router, type IRouter, type Request, type Response } from "express";
import { Resend } from "resend";

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

  const contactEmail = process.env.CONTACT_EMAIL;
  if (!contactEmail) {
    res.status(503).json({ error: "Contact form is not configured yet." });
    return;
  }

  const client = getResend();
  if (!client) {
    res.status(503).json({ error: "Email delivery is not configured yet." });
    return;
  }

  const cleanName = name.trim();
  const cleanMessage = message.trim();

  const { error } = await client.emails.send({
    from: "Website Contact Form <onboarding@resend.dev>",
    to: contactEmail,
    replyTo: email,
    subject: `New message from ${cleanName}`,
    html: `
      <p><strong>Name:</strong> ${escapeHtml(cleanName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap">${escapeHtml(cleanMessage)}</p>
    `,
    text: `Name: ${cleanName}\nEmail: ${email}\n\nMessage:\n${cleanMessage}`,
  });

  if (error) {
    res.status(500).json({ error: "Failed to send message. Please try again later." });
    return;
  }

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
