import Anthropic from "@anthropic-ai/sdk";

if (!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
  throw new Error(
    "AI_INTEGRATIONS_ANTHROPIC_BASE_URL must be set. Did you forget to provision the Anthropic AI integration?",
  );
}

if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
  throw new Error(
    "AI_INTEGRATIONS_ANTHROPIC_API_KEY must be set. Did you forget to provision the Anthropic AI integration?",
  );
}

/** Default client using the Replit integration proxy. */
export const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

/**
 * Create an Anthropic client.
 * - If a custom API key is supplied, uses the Anthropic API directly (no proxy).
 * - Otherwise falls back to the Replit integration proxy client.
 */
export function createAnthropicClient(customApiKey?: string | null): Anthropic {
  if (customApiKey?.trim()) {
    return new Anthropic({ apiKey: customApiKey.trim() });
  }
  return anthropic;
}

export type { Anthropic };
