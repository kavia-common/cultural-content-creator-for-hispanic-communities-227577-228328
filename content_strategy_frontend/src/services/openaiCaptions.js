/**
 * Frontend-only OpenAI caption generation service.
 *
 * SECURITY NOTE:
 * - This module makes requests directly from the browser.
 * - Never persist API keys (no localStorage). Keys are stored in-memory only.
 * - Prefer REACT_APP_OPENAI_API_KEY at build/runtime if available.
 */

import {
  callOpenAIChatCompletions,
  extractModelText,
  getEffectiveOpenAIKey as getEffectiveKey,
  getOpenAIKeySource as getKeySource,
  mapOpenAIErrorToI18nKey,
  normalizeLanguage,
  parseStrictJsonFromModelText,
  setOpenAIKeyForSession as setKeyForSession
} from './openaiClient';

const VariationType = Object.freeze({
  long: 'long',
  short: 'short',
  question: 'question'
});

function truncate(str, max) {
  const s = (str || '').toString();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function normalizeVariationType(v) {
  const value = (v || '').toString().toLowerCase().trim();
  if (value.includes('long')) return VariationType.long;
  if (value.includes('short')) return VariationType.short;
  if (value.includes('question')) return VariationType.question;
  return VariationType.short;
}

// PUBLIC_INTERFACE
export function setOpenAIKeyForSession(apiKey) {
  /** Set a temporary OpenAI API key in memory for this browser session only. */
  setKeyForSession(apiKey);
}

// PUBLIC_INTERFACE
export function getOpenAIKeySource() {
  /** Return where the OpenAI key is coming from (env, memory, none). */
  return getKeySource();
}

// PUBLIC_INTERFACE
export function getEffectiveOpenAIKey() {
  /** Return the effective OpenAI API key (env first, then memory). */
  return getEffectiveKey();
}

// PUBLIC_INTERFACE
export function buildCaptionPrompt({ topic, niche, emotion, language }) {
  /**
   * Build a prompt instructing the model to return three caption variants in JSON.
   * This is a pure function (unit-testable).
   */
  const lang = normalizeLanguage(language);
  const topicSafe = truncate((topic || '').trim(), 180);
  const nicheSafe = truncate((niche || '').trim(), 90);
  const emotionSafe = truncate((emotion || '').trim(), 60);

  const localeInstruction = lang === 'es' ? 'Write in Spanish (es).' : 'Write in English (en).';

  const culturallyAware =
    'Target audience: US Hispanic community. Use culturally respectful, warm, and practical language.';

  return [
    `You are a senior bilingual social media copywriter.`,
    `${localeInstruction}`,
    culturallyAware,
    `Topic: "${topicSafe}"`,
    `Niche: "${nicheSafe || 'general'}"`,
    `Brand emotion: "${emotionSafe || 'closeness'}"`,
    '',
    `Generate EXACTLY 3 caption variations optimized for Instagram/Facebook organic lead generation:`,
    `1) long (2-4 short paragraphs + CTA)`,
    `2) short (1-2 sentences + CTA)`,
    `3) question (a question hook + 1 sentence + CTA)`,
    '',
    `Return ONLY valid JSON in this exact shape (no markdown, no extra keys):`,
    `{"captions":[{"variationType":"long","text":"..."},{"variationType":"short","text":"..."},{"variationType":"question","text":"..."}]}`,
    '',
    `Constraints:`,
    `- Keep it human, not salesy. No medical/legal guarantees.`,
    `- Avoid stereotypes; keep respectful and inclusive.`,
    `- Include 1 subtle CTA that fits the niche (e.g., "Send me a DM", "Comment 'INFO'", "Escríbeme").`
  ].join('\n');
}

function normalizeCaptionsResult({ raw, language, emotion }) {
  const lang = normalizeLanguage(language);
  const emo = (emotion || '').toString();

  const captions = Array.isArray(raw?.captions) ? raw.captions : [];
  if (!captions.length) {
    return { ok: false, errorKey: 'captions.errors.parse' };
  }

  const normalized = captions
    .slice(0, 3)
    .map((c, idx) => ({
      id: c?.id || `${Date.now()}-${idx}-${Math.random().toString(16).slice(2)}`,
      text: (c?.text || '').toString().trim(),
      variationType: normalizeVariationType(c?.variationType),
      language: lang,
      emotion: emo
    }))
    .filter((c) => c.text.length);

  if (!normalized.length) return { ok: false, errorKey: 'captions.errors.parse' };

  // Ensure we always have all 3 variation types. If missing, fill with best-effort.
  const byType = new Map(normalized.map((c) => [c.variationType, c]));
  const ordered = [VariationType.long, VariationType.short, VariationType.question].map((type, i) => {
    return (
      byType.get(type) || {
        id: `${Date.now()}-fallback-${i}-${Math.random().toString(16).slice(2)}`,
        text: normalized[i]?.text || normalized[0]?.text || '',
        variationType: type,
        language: lang,
        emotion: emo
      }
    );
  });

  return { ok: true, data: { captions: ordered } };
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
  const apiKey = getEffectiveKey();
  if (!apiKey) {
    return { ok: false, errorKey: 'captions.errors.missingKey' };
  }

  const prompt = buildCaptionPrompt({ topic, niche, emotion, language });

  try {
    const payload = await callOpenAIChatCompletions({ apiKey, prompt, temperature: 0.8 });
    const text = extractModelText(payload);

    const parsed = parseStrictJsonFromModelText(text);
    if (!parsed.ok) return { ok: false, errorKey: 'captions.errors.parse' };

    return normalizeCaptionsResult({ raw: parsed.value, language, emotion });
  } catch (err) {
    const errorKey = mapOpenAIErrorToI18nKey(err);
    // Keep the previous captions.* keys for UI compatibility.
    const mapped =
      errorKey === 'openai.errors.auth'
        ? 'captions.errors.auth'
        : errorKey === 'openai.errors.rateLimit'
          ? 'captions.errors.rateLimit'
          : errorKey === 'openai.errors.network'
            ? 'captions.errors.network'
            : errorKey === 'openai.errors.server'
              ? 'captions.errors.server'
              : 'captions.errors.generic';

    return { ok: false, errorKey: mapped, details: err?.message };
  }
}

// PUBLIC_INTERFACE
export const CaptionVariationType = VariationType;
