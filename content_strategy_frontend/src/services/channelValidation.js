import { channelConfig, CHANNELS, MediaType } from './channelConfig';

/**
 * @typedef {Object} MediaMeta
 * @property {'image'|'video'} type
 * @property {string} [mimeType]
 * @property {number} [fileSizeBytes]
 * @property {{width:number,height:number}} [dimensions]
 * @property {number} [durationSeconds]
 */

/**
 * @typedef {Object} PreviewContent
 * @property {string} [title]
 * @property {string} [body]
 * @property {MediaMeta|null} [media]
 */

/**
 * @typedef {Object} ValidationIssue
 * @property {'error'|'warning'} severity
 * @property {string} code
 * @property {Record<string, any>} [params]
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} ok
 * @property {ValidationIssue[]} issues
 */

function safeString(v) {
  return (v ?? '').toString();
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function simplifyRatio(width, height) {
  if (!isFiniteNumber(width) || !isFiniteNumber(height) || width <= 0 || height <= 0) return null;
  const g = gcd(width, height);
  return { w: width / g, h: height / g };
}

function ratioDistance(a, b) {
  // compare as floats; smaller is closer.
  const ra = a.w / a.h;
  const rb = b.w / b.h;
  return Math.abs(ra - rb);
}

function closestRecommendedRatio({ width, height }, recommended) {
  const simp = simplifyRatio(width, height);
  if (!simp) return null;

  let best = null;
  for (const r of recommended) {
    const dist = ratioDistance(simp, { w: r.width, h: r.height });
    if (!best || dist < best.dist) best = { dist, ratio: r };
  }
  return best?.ratio || null;
}

function validateText({ text, maxChars }) {
  /** @type {ValidationIssue[]} */
  const issues = [];
  const len = safeString(text).length;

  if (len > maxChars) {
    issues.push({
      severity: 'error',
      code: 'text.tooLong',
      params: { max: maxChars, actual: len }
    });
  }
  return issues;
}

function validateMedia({ media, cfg }) {
  /** @type {ValidationIssue[]} */
  const issues = [];
  if (!media) return issues;

  const supported = cfg.media.supportedMimeTypes || [];
  const maxBytes = cfg.media.maxFileSizeBytes;

  if (media.mimeType && supported.length && !supported.includes(media.mimeType)) {
    issues.push({
      severity: 'error',
      code: 'media.unsupportedType',
      params: { mimeType: media.mimeType, supported: supported.join(', ') }
    });
  }

  if (isFiniteNumber(media.fileSizeBytes) && isFiniteNumber(maxBytes) && media.fileSizeBytes > maxBytes) {
    issues.push({
      severity: 'error',
      code: 'media.fileTooLarge',
      params: { maxBytes, actualBytes: media.fileSizeBytes }
    });
  }

  if (media.dimensions?.width && media.dimensions?.height) {
    const closest = closestRecommendedRatio(
      { width: media.dimensions.width, height: media.dimensions.height },
      cfg.media.recommendedAspectRatios || []
    );

    // If we have a closest ratio but it isn't a "near match", warn.
    // Heuristic tolerance; tweak via code if desired later.
    const simp = simplifyRatio(media.dimensions.width, media.dimensions.height);
    if (closest && simp) {
      const dist = ratioDistance(simp, { w: closest.width, h: closest.height });
      if (dist > 0.08) {
        issues.push({
          severity: 'warning',
          code: 'media.aspectRatioRecommended',
          params: {
            recommended: closest.label,
            actual: `${media.dimensions.width}:${media.dimensions.height}`
          }
        });
      }
    }
  }

  if (media.type === MediaType.video) {
    const maxDur = cfg.video?.maxDurationSeconds;
    if (isFiniteNumber(media.durationSeconds) && isFiniteNumber(maxDur) && media.durationSeconds > maxDur) {
      issues.push({
        severity: 'warning',
        code: 'video.tooLong',
        params: { maxSeconds: maxDur, actualSeconds: media.durationSeconds }
      });
    }
  }

  return issues;
}

function validateForChannel(channelKey, content) {
  /** @type {ValidationIssue[]} */
  const issues = [];
  const cfg = channelConfig[channelKey];
  if (!cfg) return { ok: true, issues: [] };

  const body = content?.body ?? '';
  issues.push(...validateText({ text: body, maxChars: cfg.text.maxChars }));

  issues.push(...validateMedia({ media: content?.media ?? null, cfg }));

  return { ok: issues.every((i) => i.severity !== 'error'), issues };
}

// PUBLIC_INTERFACE
export function validateForWhatsApp(content) {
  /** Validate a preview payload for WhatsApp constraints (client-side only). */
  return validateForChannel(CHANNELS.whatsapp, content);
}

// PUBLIC_INTERFACE
export function validateForFacebook(content) {
  /** Validate a preview payload for Facebook constraints (client-side only). */
  return validateForChannel(CHANNELS.facebook, content);
}

// PUBLIC_INTERFACE
export function formatBytes(bytes) {
  /** Small helper for UI/tests to present bytes consistently. */
  if (!isFiniteNumber(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
