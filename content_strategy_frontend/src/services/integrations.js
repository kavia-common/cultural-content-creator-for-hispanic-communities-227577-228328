/**
 * All integrations are frontend-only and MUST be safe by default:
 * - no secrets hard-coded
 * - no network calls unless configured
 *
 * Each function returns a no-op fallback until keys are provided.
 */

function notConfiguredResult(serviceName) {
  return {
    ok: false,
    reason: `${serviceName} not configured`,
  };
}

// PUBLIC_INTERFACE
export function isOpenAIConfigured() {
  /** Returns true only if an OpenAI key is present in environment. */
  return Boolean(process.env.REACT_APP_OPENAI_API_KEY);
}

// PUBLIC_INTERFACE
export function isMetaConfigured() {
  /** Returns true only if Meta Graph config is present in environment. */
  return Boolean(process.env.REACT_APP_META_ACCESS_TOKEN);
}

// PUBLIC_INTERFACE
export function isWhatsAppConfigured() {
  /** Returns true only if WhatsApp Business config is present in environment. */
  return Boolean(process.env.REACT_APP_WHATSAPP_ACCESS_TOKEN);
}

// PUBLIC_INTERFACE
export function isCanvaConfigured() {
  /** Returns true only if Canva config is present in environment. */
  return Boolean(process.env.REACT_APP_CANVA_ACCESS_TOKEN);
}

// PUBLIC_INTERFACE
export async function openAIChatCompletionStub() {
  /** Placeholder for OpenAI calls (no-op until configured). */
  if (!isOpenAIConfigured()) return notConfiguredResult("OpenAI");
  // Intentionally a stub: add real fetch later.
  return { ok: true, data: null };
}

// PUBLIC_INTERFACE
export async function metaGraphRequestStub() {
  /** Placeholder for Meta Graph API calls (no-op until configured). */
  if (!isMetaConfigured()) return notConfiguredResult("Meta Graph");
  return { ok: true, data: null };
}

// PUBLIC_INTERFACE
export async function whatsappSendStub() {
  /** Placeholder for WhatsApp Business API calls (no-op until configured). */
  if (!isWhatsAppConfigured()) return notConfiguredResult("WhatsApp Business");
  return { ok: true, data: null };
}

// PUBLIC_INTERFACE
export async function canvaRequestStub() {
  /** Placeholder for Canva API calls (no-op until configured). */
  if (!isCanvaConfigured()) return notConfiguredResult("Canva");
  return { ok: true, data: null };
}
