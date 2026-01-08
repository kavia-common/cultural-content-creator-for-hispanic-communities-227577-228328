export const CHANNELS = Object.freeze({
  whatsapp: "whatsapp",
  facebook: "facebook",
});

export const MediaType = Object.freeze({
  image: "image",
  video: "video",
});

/**
 * Central validation config for per-channel constraints.
 * Keep all tweakable values here so UX + validators remain stable as rules evolve.
 */
export const channelConfig = Object.freeze({
  whatsapp: {
    text: {
      maxChars: 4096,
    },
    media: {
      supportedMimeTypes: ["image/png", "image/jpeg", "video/mp4"],
      // Common WhatsApp-ish constraints (kept conservative; update as needed).
      maxFileSizeBytes: 16 * 1024 * 1024, // 16MB
      // "Recommended" only: warnings, not hard failures.
      recommendedAspectRatios: [
        { label: "1:1", width: 1, height: 1 },
        { label: "4:5", width: 4, height: 5 },
        { label: "9:16", width: 9, height: 16 },
      ],
    },
    video: {
      // Optional (only enforced if metadata includes durationSeconds)
      maxDurationSeconds: 60,
    },
  },

  facebook: {
    text: {
      // Typical caption guidance (config-driven as requested).
      maxChars: 2200,
    },
    media: {
      supportedMimeTypes: ["image/png", "image/jpeg", "video/mp4"],
      // Conservative client-side limit for validation hints.
      maxFileSizeBytes: 25 * 1024 * 1024, // 25MB
      recommendedAspectRatios: [
        { label: "1.91:1", width: 191, height: 100 },
        { label: "1:1", width: 1, height: 1 },
        { label: "4:5", width: 4, height: 5 },
      ],
    },
    video: {
      maxDurationSeconds: 120,
    },
  },
});
