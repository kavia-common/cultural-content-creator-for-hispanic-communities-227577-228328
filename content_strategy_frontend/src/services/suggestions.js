import { generateTopicSuggestions } from './openaiContent';

// PUBLIC_INTERFACE
export async function getTopicSuggestions(topic, language) {
  /** Return topic suggestions, preferring OpenAI when configured; otherwise a safe fallback. */
  const result = await generateTopicSuggestions({ topic, language });
  if (!result.ok) return [];
  return result.data.suggestions || [];
}
