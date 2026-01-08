/**
 * Shared OpenAI client helpers (frontend-only).
 *
 * SECURITY NOTE:
 * - Keys are never persisted (no localStorage/sessionStorage).
 * - Keys are stored in-memory only for this tab/session.
 * - Env var REACT_APP_OPENAI_API_KEY is supported as a build/runtime override.
 */

const Language = Object.freeze({
  en: 'en',
  es: 'es'
});

// In-memory key (session-only). Do not persist.
let inMemoryOpenAIKey = '';

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function extractTextFromChatCompletionPayload(payload) {
  const content =
    payload?.choices?.[0]?.message?.content ??
    payload?.choices?.[0]?.message?.content?.text ??
    '';
  return (content || '').toString().trim();
}

function mapHttpErrorToKey(status) {
  if (status === 401 || status === 403) return 'openai.errors.auth';
  if (status === 429) return 'openai.errors.rateLimit';
  if (status >= 500) return 'openai.errors.server';
  return 'openai.errors.generic';
}

function mapExceptionToKey(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'openai.errors.network';
  return 'openai.errors.generic';
}

// PUBLIC_INTERFACE
export function setOpenAIKeyForSession(apiKey) {
  /** Set a temporary OpenAI API key in memory for this browser session only. */
  inMemoryOpenAIKey = (apiKey || '').trim();
}

// PUBLIC_INTERFACE
export function getOpenAIKeySource() {
  /** Return where the OpenAI key is coming from (env, memory, none). */
  if (process.env.REACT_APP_OPENAI_API_KEY) return 'env';
  if (inMemoryOpenAIKey) return 'memory';
  return 'none';
}

// PUBLIC_INTERFACE
export function getEffectiveOpenAIKey() {
  /** Return the effective OpenAI API key (env first, then memory). */
  return process.env.REACT_APP_OPENAI_API_KEY || inMemoryOpenAIKey || '';
}

// PUBLIC_INTERFACE
export async function callOpenAIChatCompletions({
  apiKey,
  system,
  prompt,
  temperature = 0.7,
  model = 'gpt-4o-mini'
}) {
  /**
   * Call OpenAI Chat Completions endpoint (browser-safe).
   *
   * Params:
   * - apiKey: OpenAI key
   * - system: system message
   * - prompt: user prompt
   *
   * Returns: raw JSON response payload.
   */
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        {
          role: 'system',
          content:
            system ||
            'You generate culturally nuanced marketing content and you MUST return strict JSON when asked.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`OpenAI HTTP ${res.status}: ${text}`);
    err.status = res.status;
    err.mappedKey = mapHttpErrorToKey(res.status);
    throw err;
  }

  return res.json();
}

// PUBLIC_INTERFACE
export function parseStrictJsonFromModelText(text) {
  /**
   * Parse strict JSON from an LLM response.
   * Attempts salvage by extracting the first {...} JSON object if needed.
   */
  const trimmed = (text || '').toString().trim();
  const parsed = safeJsonParse(trimmed);
  if (parsed.ok) return parsed;

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return safeJsonParse(trimmed.slice(start, end + 1));
  }

  return parsed;
}

// PUBLIC_INTERFACE
export function extractModelText(payload) {
  /** Extract assistant text from a chat completion payload. */
  return extractTextFromChatCompletionPayload(payload);
}

// PUBLIC_INTERFACE
export function normalizeLanguage(lang) {
  /** Normalize language input into 'en' or 'es'. */
  return lang === Language.es ? Language.es : Language.en;
}

// PUBLIC_INTERFACE
export function mapOpenAIErrorToI18nKey(err) {
  /** Convert thrown OpenAI error to an i18n key safe for UI. */
  if (err?.mappedKey) return err.mappedKey;
  const status = err?.status;
  if (typeof status === 'number') return mapHttpErrorToKey(status);
  return mapExceptionToKey(err);
}

export const OpenAILanguage = Language;
