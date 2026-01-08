import { openAIChatCompletionStub, metaGraphRequestStub } from './integrations';

/**
 * This module deliberately returns safe suggestions without requiring API keys.
 * Later: plug in OpenAI/Meta calls and merge results.
 */

// PUBLIC_INTERFACE
export async function getTopicSuggestionsStub(topic) {
  /** Return topic suggestions (stub). */
  const base = (topic || '').trim();
  if (base.length < 3) return [];

  // Attempt stubs (they will no-op if not configured).
  await openAIChatCompletionStub();
  await metaGraphRequestStub();

  // Simple culturally aware examples (static fallback).
  return [
    `${base}: a message for busy families`,
    `${base}: trust and peace of mind`,
    `${base}: protecting what matters most`
  ];
}
