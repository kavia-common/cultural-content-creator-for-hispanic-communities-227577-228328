/**
 * Frontend-only OpenAI caption generation service.
 *
 * SECURITY NOTE:
 * - This module makes requests directly from the browser.
 * - Never persist API keys (no localStorage). Keys are stored in-memory only.
 * - Prefer REACT_APP_OPENAI_API_KEY at build/runtime if available.
 */

const VariationType = Object.freeze({
  long: "long",
  short: "short",
  question: "question",
});

const Language = Object.freeze({
  en: "en",
  es: "es",
});

// In-memory key (session-only). Do not persist.
let inMemoryApiKey = "";

function truncate(str, max) {
  const s = (str || "").toString();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function normalizeVariationType(v) {
  const value = (v || "").toString().toLowerCase().trim();
  if (value.includes("long")) return VariationType.long;
  if (value.includes("short")) return VariationType.short;
  if (value.includes("question")) return VariationType.question;
  return VariationType.short;
}

function normalizeLanguage(lang) {
  return lang === Language.es ? Language.es : Language.en;
}

function mapHttpErrorToKey(status) {
  if (status === 401 || status === 403) return "captions.errors.auth";
  if (status === 429) return "captions.errors.rateLimit";
  if (status >= 500) return "captions.errors.server";
  return "captions.errors.generic";
}

function mapExceptionToKey(err) {
  const msg = (err?.message || "").toLowerCase();
  if (msg.includes("network") || msg.includes("failed to fetch"))
    return "captions.errors.network";
  return "captions.errors.generic";
}

// PUBLIC_INTERFACE
export function setOpenAIKeyForSession(apiKey) {
  /** Set a temporary OpenAI API key in memory for this browser session only. */
  inMemoryApiKey = (apiKey || "").trim();
}

// PUBLIC_INTERFACE
export function getOpenAIKeySource() {
  /** Return where the OpenAI key is coming from (env, memory, none). */
  if (process.env.REACT_APP_OPENAI_API_KEY) return "env";
  if (inMemoryApiKey) return "memory";
  return "none";
}

// PUBLIC_INTERFACE
export function getEffectiveOpenAIKey() {
  /** Return the effective OpenAI API key (env first, then memory). */
  return process.env.REACT_APP_OPENAI_API_KEY || inMemoryApiKey || "";
}

// PUBLIC_INTERFACE
export function buildCaptionPrompt({ topic, niche, emotion, language }) {
  /**
   * Build a prompt instructing the model to return three caption variants in JSON.
   * This is a pure function (unit-testable).
   */
  const lang = normalizeLanguage(language);
  const topicSafe = truncate((topic || "").trim(), 180);
  const nicheSafe = truncate((niche || "").trim(), 90);
  const emotionSafe = truncate((emotion || "").trim(), 60);

  const localeInstruction =
    lang === Language.es ? "Write in Spanish (es)." : "Write in English (en).";

  const culturallyAware =
    lang === Language.es
      ? "Target audience: US Hispanic community. Use culturally respectful, warm, and practical language."
      : "Target audience: US Hispanic community. Use culturally respectful, warm, and practical language.";

  return [
    `You are a senior bilingual social media copywriter.`,
    `${localeInstruction}`,
    culturallyAware,
    `Topic: "${topicSafe}"`,
    `Niche: "${nicheSafe || "general"}"`,
    `Brand emotion: "${emotionSafe || "closeness"}"`,
    "",
    `Generate EXACTLY 3 caption variations optimized for Instagram/Facebook organic lead generation:`,
    `1) long (2-4 short paragraphs + CTA)`,
    `2) short (1-2 sentences + CTA)`,
    `3) question (a question hook + 1 sentence + CTA)`,
    "",
    `Return ONLY valid JSON in this exact shape (no markdown, no extra keys):`,
    `{"captions":[{"variationType":"long","text":"..."},{"variationType":"short","text":"..."},{"variationType":"question","text":"..."}]}`,
    "",
    `Constraints:`,
    `- Keep it human, not salesy. No medical/legal guarantees.`,
    `- Avoid stereotypes; keep respectful and inclusive.`,
    `- Include 1 subtle CTA that fits the niche (e.g., "Send me a DM", "Comment 'INFO'", "Escríbeme").`,
  ].join("\n");
}

async function callOpenAIChatCompletions({ apiKey, prompt }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content:
            "You generate marketing captions with cultural nuance and return strict JSON when asked.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`OpenAI HTTP ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

function extractTextFromChatCompletionPayload(payload) {
  const content =
    payload?.choices?.[0]?.message?.content ??
    payload?.choices?.[0]?.message?.content?.text ??
    "";
  return (content || "").toString().trim();
}

// PUBLIC_INTERFACE
export async function generateCaptions({ topic, niche, emotion, language }) {
  /**
   * Generate captions from OpenAI.
   *
   * Returns:
   *  { ok: true, data: { captions: Array<{ id, text, variationType, language, emotion }> } }
   *  { ok: false, errorKey: string, details?: string }
   */
  const apiKey = getEffectiveOpenAIKey();
  if (!apiKey) {
    return { ok: false, errorKey: "captions.errors.missingKey" };
  }

  const prompt = buildCaptionPrompt({ topic, niche, emotion, language });

  try {
    const payload = await callOpenAIChatCompletions({ apiKey, prompt });
    const text = extractTextFromChatCompletionPayload(payload);

    const parsed = safeJsonParse(text);
    if (!parsed.ok) {
      // Sometimes models wrap JSON with leading text; attempt to salvage.
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        const salvage = safeJsonParse(text.slice(start, end + 1));
        if (salvage.ok) {
          return normalizeCaptionsResult({
            raw: salvage.value,
            language,
            emotion,
          });
        }
      }
      return { ok: false, errorKey: "captions.errors.parse" };
    }

    return normalizeCaptionsResult({ raw: parsed.value, language, emotion });
  } catch (err) {
    const status = err?.status;
    const errorKey =
      typeof status === "number"
        ? mapHttpErrorToKey(status)
        : mapExceptionToKey(err);
    return { ok: false, errorKey, details: err?.message };
  }
}

function normalizeCaptionsResult({ raw, language, emotion }) {
  const lang = normalizeLanguage(language);
  const emo = (emotion || "").toString();

  const captions = Array.isArray(raw?.captions) ? raw.captions : [];
  if (!captions.length) {
    return { ok: false, errorKey: "captions.errors.parse" };
  }

  const normalized = captions
    .slice(0, 3)
    .map((c, idx) => ({
      id:
        c?.id || `${Date.now()}-${idx}-${Math.random().toString(16).slice(2)}`,
      text: (c?.text || "").toString().trim(),
      variationType: normalizeVariationType(c?.variationType),
      language: lang,
      emotion: emo,
    }))
    .filter((c) => c.text.length);

  if (!normalized.length)
    return { ok: false, errorKey: "captions.errors.parse" };

  // Ensure we always have all 3 variation types. If missing, fill with best-effort.
  const byType = new Map(normalized.map((c) => [c.variationType, c]));
  const ordered = [
    VariationType.long,
    VariationType.short,
    VariationType.question,
  ].map((type, i) => {
    return (
      byType.get(type) || {
        id: `${Date.now()}-fallback-${i}-${Math.random().toString(16).slice(2)}`,
        text: normalized[i]?.text || normalized[0]?.text || "",
        variationType: type,
        language: lang,
        emotion: emo,
      }
    );
  });

  return { ok: true, data: { captions: ordered } };
}

// PUBLIC_INTERFACE
export const CaptionVariationType = VariationType;

/** @typedef {'env'|'memory'|'none'} OpenAIKeySource */
