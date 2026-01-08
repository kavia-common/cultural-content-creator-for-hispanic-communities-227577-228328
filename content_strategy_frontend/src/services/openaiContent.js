import {
  callOpenAIChatCompletions,
  extractModelText,
  getEffectiveOpenAIKey,
  mapOpenAIErrorToI18nKey,
  normalizeLanguage,
  parseStrictJsonFromModelText
} from './openaiClient';
import { CaptionVariationType } from './openaiCaptions';

function truncate(str, max) {
  const s = (str || '').toString();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function normalizeVariationType(v) {
  const value = (v || '').toString().toLowerCase().trim();
  if (value.includes('long')) return CaptionVariationType.long;
  if (value.includes('short')) return CaptionVariationType.short;
  if (value.includes('question')) return CaptionVariationType.question;
  return CaptionVariationType.short;
}

function normalizeThreeVariations(rawList, { language, emotion }) {
  const lang = normalizeLanguage(language);
  const emo = (emotion || '').toString();

  const list = Array.isArray(rawList) ? rawList : [];
  const normalized = list
    .slice(0, 3)
    .map((c, idx) => ({
      id: c?.id || `${Date.now()}-${idx}-${Math.random().toString(16).slice(2)}`,
      text: (c?.text || '').toString().trim(),
      variationType: normalizeVariationType(c?.variationType),
      language: lang,
      emotion: emo
    }))
    .filter((c) => c.text.length);

  const byType = new Map(normalized.map((c) => [c.variationType, c]));
  const ordered = [CaptionVariationType.long, CaptionVariationType.short, CaptionVariationType.question].map(
    (type, i) =>
      byType.get(type) || {
        id: `${Date.now()}-fallback-${i}-${Math.random().toString(16).slice(2)}`,
        text: normalized[i]?.text || normalized[0]?.text || '',
        variationType: type,
        language: lang,
        emotion: emo
      }
  );

  return ordered;
}

// PUBLIC_INTERFACE
export function buildMicroreelScriptPrompt({ topic, niche, emotion, language }) {
  /** Build strict-JSON prompt for 3 microreel scripts (silent-first). */
  const lang = normalizeLanguage(language);
  const topicSafe = truncate((topic || '').trim(), 180);
  const nicheSafe = truncate((niche || '').trim(), 90);
  const emotionSafe = truncate((emotion || '').trim(), 60);

  const localeInstruction = lang === 'es' ? 'Write in Spanish (es).' : 'Write in English (en).';

  return [
    `You are a senior bilingual short-form video scriptwriter.`,
    `${localeInstruction}`,
    `Target audience: US Hispanic community. Be warm, respectful, culturally aware.`,
    `Topic: "${topicSafe}"`,
    `Niche: "${nicheSafe || 'general'}"`,
    `Brand emotion: "${emotionSafe || 'closeness'}"`,
    '',
    `Generate EXACTLY 3 microreel scripts optimized for SILENT viewing (no audio dependency).`,
    `Each script must include:`,
    `- Hook line (on-screen text)`,
    `- 5–7 visual beats (short lines), each with on-screen text`,
    `- A subtle CTA`,
    `Return ONLY valid JSON in this exact shape (no markdown, no extra keys):`,
    `{"scripts":[{"variationType":"long","text":"..."},{"variationType":"short","text":"..."},{"variationType":"question","text":"..."}]}`,
    '',
    `Constraints:`,
    `- No medical/legal guarantees.`,
    `- Avoid stereotypes; keep inclusive.`,
    `- Keep beats visually clear and easy to film.`
  ].join('\n');
}

// PUBLIC_INTERFACE
export function buildSilentVideoOutlinePrompt({ topic, niche, emotion, language }) {
  /** Build strict-JSON prompt for 3 silent video outlines. */
  const lang = normalizeLanguage(language);
  const topicSafe = truncate((topic || '').trim(), 180);
  const nicheSafe = truncate((niche || '').trim(), 90);
  const emotionSafe = truncate((emotion || '').trim(), 60);

  const localeInstruction = lang === 'es' ? 'Write in Spanish (es).' : 'Write in English (en).';

  return [
    `You are a senior silent-video director and storyboarder.`,
    `${localeInstruction}`,
    `Target audience: US Hispanic community. Be culturally respectful and practical.`,
    `Topic: "${topicSafe}"`,
    `Niche: "${nicheSafe || 'general'}"`,
    `Brand emotion: "${emotionSafe || 'closeness'}"`,
    '',
    `Generate EXACTLY 3 silent-video OUTLINES (optimized for IG/FB Reels).`,
    `Each outline must include:`,
    `- 6–9 scenes with: Shot idea + on-screen text + emotion cue`,
    `- Visual accessibility notes (contrast, readable text size)`,
    `Return ONLY valid JSON in this exact shape (no markdown, no extra keys):`,
    `{"outlines":[{"variationType":"long","text":"..."},{"variationType":"short","text":"..."},{"variationType":"question","text":"..."}]}`
  ].join('\n');
}

// PUBLIC_INTERFACE
export function buildPredictivePrompt({ topic, niche, emotion, language, contentSample }) {
  /** Build strict-JSON prompt for predictive segments + tweaks. */
  const lang = normalizeLanguage(language);
  const topicSafe = truncate((topic || '').trim(), 140);
  const nicheSafe = truncate((niche || '').trim(), 90);
  const emotionSafe = truncate((emotion || '').trim(), 60);
  const sampleSafe = truncate((contentSample || '').trim(), 800);

  const localeInstruction = lang === 'es' ? 'Write in Spanish (es).' : 'Write in English (en).';

  return [
    `You are a senior performance marketer and conversion copy editor.`,
    `${localeInstruction}`,
    `Audience: US Hispanic community. Optimize for organic lead gen.`,
    `Topic: "${topicSafe}"`,
    `Niche: "${nicheSafe || 'general'}"`,
    `Emotion: "${emotionSafe || 'closeness'}"`,
    '',
    `Given this draft content sample:`,
    `"${sampleSafe}"`,
    '',
    `Return ONLY valid JSON in this exact shape (no markdown, no extra keys):`,
    `{"segments":["...","...","..."],"tweaks":[{"title":"...","suggestion":"...","appliesTo":"captions|scripts|outlines","objection":"..."}]}`,
    '',
    `Rules:`,
    `- Segments must be culturally relevant and specific (e.g., family caretakers, first-gen professionals).`,
    `- Tweaks must be actionable and short, each addresses an objection/engagement barrier.`
  ].join('\n');
}

// PUBLIC_INTERFACE
export function buildEngagementPrompt({ topic, niche, emotion, language }) {
  /** Build strict-JSON prompt for engagement elements: survey, open question, challenge. */
  const lang = normalizeLanguage(language);
  const topicSafe = truncate((topic || '').trim(), 160);
  const nicheSafe = truncate((niche || '').trim(), 90);
  const emotionSafe = truncate((emotion || '').trim(), 60);

  const localeInstruction = lang === 'es' ? 'Write in Spanish (es).' : 'Write in English (en).';

  return [
    `You are a senior community manager for IG/FB.`,
    `${localeInstruction}`,
    `Audience: US Hispanic community.`,
    `Topic: "${topicSafe}"`,
    `Niche: "${nicheSafe || 'general'}"`,
    `Emotion: "${emotionSafe || 'closeness'}"`,
    '',
    `Generate 3 engagement elements for captions:`,
    `- survey: a 2-option poll question (formatted as "Option A / Option B")`,
    `- openQuestion: a friendly open-ended question`,
    `- challenge: a small, practical 24-hour challenge`,
    '',
    `Return ONLY valid JSON in this exact shape (no markdown, no extra keys):`,
    `{"survey":"...","openQuestion":"...","challenge":"..."}`
  ].join('\n');
}

// PUBLIC_INTERFACE
export async function generateMicroreelScripts({ topic, niche, emotion, language }) {
  /** Generate 3 microreel scripts (long/short/question) from OpenAI. */
  const apiKey = getEffectiveOpenAIKey();
  if (!apiKey) return { ok: false, errorKey: 'openai.errors.missingKey' };

  const prompt = buildMicroreelScriptPrompt({ topic, niche, emotion, language });

  try {
    const payload = await callOpenAIChatCompletions({ apiKey, prompt, temperature: 0.75 });
    const text = extractModelText(payload);
    const parsed = parseStrictJsonFromModelText(text);
    if (!parsed.ok) return { ok: false, errorKey: 'openai.errors.parse' };

    const scripts = normalizeThreeVariations(parsed.value?.scripts, { language, emotion });
    return { ok: true, data: { scripts } };
  } catch (err) {
    return { ok: false, errorKey: mapOpenAIErrorToI18nKey(err) };
  }
}

// PUBLIC_INTERFACE
export async function generateSilentVideoOutlines({ topic, niche, emotion, language }) {
  /** Generate 3 silent video outlines (long/short/question) from OpenAI. */
  const apiKey = getEffectiveOpenAIKey();
  if (!apiKey) return { ok: false, errorKey: 'openai.errors.missingKey' };

  const prompt = buildSilentVideoOutlinePrompt({ topic, niche, emotion, language });

  try {
    const payload = await callOpenAIChatCompletions({ apiKey, prompt, temperature: 0.7 });
    const text = extractModelText(payload);
    const parsed = parseStrictJsonFromModelText(text);
    if (!parsed.ok) return { ok: false, errorKey: 'openai.errors.parse' };

    const outlines = normalizeThreeVariations(parsed.value?.outlines, { language, emotion });
    return { ok: true, data: { outlines } };
  } catch (err) {
    return { ok: false, errorKey: mapOpenAIErrorToI18nKey(err) };
  }
}

// PUBLIC_INTERFACE
export async function generatePredictiveSuggestions({ topic, niche, emotion, language, contentSample }) {
  /** Generate predictive segments + actionable tweak suggestions. */
  const apiKey = getEffectiveOpenAIKey();
  if (!apiKey) return { ok: false, errorKey: 'openai.errors.missingKey' };

  const prompt = buildPredictivePrompt({ topic, niche, emotion, language, contentSample });

  try {
    const payload = await callOpenAIChatCompletions({ apiKey, prompt, temperature: 0.6 });
    const text = extractModelText(payload);
    const parsed = parseStrictJsonFromModelText(text);
    if (!parsed.ok) return { ok: false, errorKey: 'openai.errors.parse' };

    const segments = Array.isArray(parsed.value?.segments) ? parsed.value.segments.slice(0, 8) : [];
    const tweaks = Array.isArray(parsed.value?.tweaks) ? parsed.value.tweaks.slice(0, 10) : [];

    const normalizedTweaks = tweaks
      .map((t, idx) => ({
        id: t?.id || `${Date.now()}-tweak-${idx}-${Math.random().toString(16).slice(2)}`,
        title: (t?.title || '').toString().trim(),
        suggestion: (t?.suggestion || '').toString().trim(),
        appliesTo: (t?.appliesTo || 'captions').toString().trim(),
        objection: (t?.objection || '').toString().trim()
      }))
      .filter((x) => x.title && x.suggestion);

    return { ok: true, data: { segments, tweaks: normalizedTweaks } };
  } catch (err) {
    return { ok: false, errorKey: mapOpenAIErrorToI18nKey(err) };
  }
}

// PUBLIC_INTERFACE
export async function generateEngagementElements({ topic, niche, emotion, language }) {
  /** Generate engagement elements (survey/openQuestion/challenge). */
  const apiKey = getEffectiveOpenAIKey();
  if (!apiKey) return { ok: false, errorKey: 'openai.errors.missingKey' };

  const prompt = buildEngagementPrompt({ topic, niche, emotion, language });

  try {
    const payload = await callOpenAIChatCompletions({ apiKey, prompt, temperature: 0.7 });
    const text = extractModelText(payload);
    const parsed = parseStrictJsonFromModelText(text);
    if (!parsed.ok) return { ok: false, errorKey: 'openai.errors.parse' };

    return {
      ok: true,
      data: {
        survey: (parsed.value?.survey || '').toString().trim(),
        openQuestion: (parsed.value?.openQuestion || '').toString().trim(),
        challenge: (parsed.value?.challenge || '').toString().trim()
      }
    };
  } catch (err) {
    return { ok: false, errorKey: mapOpenAIErrorToI18nKey(err) };
  }
}

// PUBLIC_INTERFACE
export async function generateTopicSuggestions({ topic, language }) {
  /** Generate topic suggestions (used by TopicInput). */
  const trimmed = (topic || '').trim();
  if (trimmed.length < 3) return { ok: true, data: { suggestions: [] } };

  const apiKey = getEffectiveOpenAIKey();
  if (!apiKey) {
    // Safe fallback.
    return {
      ok: true,
      data: {
        suggestions: [
          `${trimmed}: a message for busy families`,
          `${trimmed}: trust and peace of mind`,
          `${trimmed}: protecting what matters most`
        ]
      }
    };
  }

  const lang = normalizeLanguage(language);
  const localeInstruction = lang === 'es' ? 'Write in Spanish (es).' : 'Write in English (en).';

  const prompt = [
    `You are a bilingual marketing strategist.`,
    `${localeInstruction}`,
    `Audience: US Hispanic community.`,
    `Given this base topic: "${truncate(trimmed, 120)}"`,
    `Generate 5 short topic variations with different angles (pain point, story, objection, family, trust).`,
    `Return ONLY JSON: {"suggestions":["...","..."]}`
  ].join('\n');

  try {
    const payload = await callOpenAIChatCompletions({ apiKey, prompt, temperature: 0.7 });
    const text = extractModelText(payload);
    const parsed = parseStrictJsonFromModelText(text);
    if (!parsed.ok) return { ok: false, errorKey: 'openai.errors.parse' };

    const suggestions = Array.isArray(parsed.value?.suggestions) ? parsed.value.suggestions.slice(0, 8) : [];
    return { ok: true, data: { suggestions } };
  } catch (err) {
    // Fall back safely if network/API fails.
    return {
      ok: true,
      data: {
        suggestions: [
          `${trimmed}: a message for busy families`,
          `${trimmed}: trust and peace of mind`,
          `${trimmed}: protecting what matters most`
        ]
      }
    };
  }
}
