/**
 * Frontend-only integration state.
 *
 * SECURITY:
 * - Never persist tokens (no localStorage/sessionStorage).
 * - Tokens live in-memory for the current tab session only.
 * - Env vars are supported for build/runtime injection, but still visible in a built frontend.
 *
 * NOTE:
 * - For Meta/WhatsApp/Canva, many endpoints are not CORS-friendly. Health checks are best-effort.
 */

const IntegrationKey = Object.freeze({
  openai: 'openai',
  meta: 'meta',
  whatsapp: 'whatsapp',
  canva: 'canva'
});

const HealthStatus = Object.freeze({
  healthy: 'healthy',
  disconnected: 'disconnected',
  degraded: 'degraded'
});

const memoryTokens = {
  meta: '',
  whatsapp: '',
  canva: ''
};

const healthState = {
  openai: { status: 'disconnected', lastCheckedAt: 0, lastErrorKey: '' },
  meta: { status: 'disconnected', lastCheckedAt: 0, lastErrorKey: '' },
  whatsapp: { status: 'disconnected', lastCheckedAt: 0, lastErrorKey: '' },
  canva: { status: 'disconnected', lastCheckedAt: 0, lastErrorKey: '' }
};

function nowTs() {
  return Date.now();
}

function hasMetaToken() {
  return Boolean(process.env.REACT_APP_META_ACCESS_TOKEN || memoryTokens.meta);
}

function hasWhatsAppToken() {
  return Boolean(process.env.REACT_APP_WHATSAPP_ACCESS_TOKEN || memoryTokens.whatsapp);
}

function hasCanvaToken() {
  return Boolean(process.env.REACT_APP_CANVA_ACCESS_TOKEN || memoryTokens.canva);
}

// PUBLIC_INTERFACE
export function setIntegrationTokenForSession(integration, token) {
  /** Set a temporary token in-memory for this session (Meta/WhatsApp/Canva). */
  if (!Object.values(IntegrationKey).includes(integration)) return;
  if (integration === IntegrationKey.openai) return; // handled by openaiClient
  memoryTokens[integration] = (token || '').trim();
}

// PUBLIC_INTERFACE
export function clearIntegrationTokenForSession(integration) {
  /** Clear an in-memory token for this session (Meta/WhatsApp/Canva). */
  if (!Object.values(IntegrationKey).includes(integration)) return;
  if (integration === IntegrationKey.openai) return;
  memoryTokens[integration] = '';
}

// PUBLIC_INTERFACE
export function getIntegrationTokenSource(integration) {
  /** Return token source: env | memory | none. */
  if (integration === IntegrationKey.meta) {
    if (process.env.REACT_APP_META_ACCESS_TOKEN) return 'env';
    if (memoryTokens.meta) return 'memory';
    return 'none';
  }
  if (integration === IntegrationKey.whatsapp) {
    if (process.env.REACT_APP_WHATSAPP_ACCESS_TOKEN) return 'env';
    if (memoryTokens.whatsapp) return 'memory';
    return 'none';
  }
  if (integration === IntegrationKey.canva) {
    if (process.env.REACT_APP_CANVA_ACCESS_TOKEN) return 'env';
    if (memoryTokens.canva) return 'memory';
    return 'none';
  }
  if (integration === IntegrationKey.openai) {
    const { getOpenAIKeySource } = require('./openaiClient');
    return getOpenAIKeySource();
  }
  return 'none';
}

// PUBLIC_INTERFACE
export function getIntegrationConfigured(integration) {
  /** True if the integration has a token configured (env or memory). */
  if (integration === IntegrationKey.openai) {
    const { getEffectiveOpenAIKey } = require('./openaiClient');
    return Boolean(getEffectiveOpenAIKey());
  }
  if (integration === IntegrationKey.meta) return hasMetaToken();
  if (integration === IntegrationKey.whatsapp) return hasWhatsAppToken();
  if (integration === IntegrationKey.canva) return hasCanvaToken();
  return false;
}

async function checkOpenAI() {
  const { getEffectiveOpenAIKey } = require('./openaiClient');
  const key = getEffectiveOpenAIKey();
  if (!key) return { status: HealthStatus.disconnected, lastErrorKey: '' };

  // CORS-friendly lightweight check: list models (or simply call /models).
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` }
    });
    if (res.ok) return { status: HealthStatus.healthy, lastErrorKey: '' };
    if (res.status === 401 || res.status === 403) return { status: HealthStatus.degraded, lastErrorKey: 'openai.errors.auth' };
    if (res.status === 429) return { status: HealthStatus.degraded, lastErrorKey: 'openai.errors.rateLimit' };
    return { status: HealthStatus.degraded, lastErrorKey: 'openai.errors.generic' };
  } catch {
    return { status: HealthStatus.degraded, lastErrorKey: 'openai.errors.network' };
  }
}

function checkNoCorsConfiguredOnly(integration) {
  // For integrations that are usually blocked by CORS in browser-only apps, we report "healthy"
  // if configured, otherwise "disconnected".
  const configured = getIntegrationConfigured(integration);
  return configured ? { status: HealthStatus.healthy, lastErrorKey: '' } : { status: HealthStatus.disconnected, lastErrorKey: '' };
}

// PUBLIC_INTERFACE
export async function checkIntegrationHealth(integration) {
  /** Check the health of a single integration (best-effort, browser-only). */
  let result = { status: HealthStatus.disconnected, lastErrorKey: '' };

  if (integration === IntegrationKey.openai) result = await checkOpenAI();
  else if (integration === IntegrationKey.meta) result = checkNoCorsConfiguredOnly(IntegrationKey.meta);
  else if (integration === IntegrationKey.whatsapp) result = checkNoCorsConfiguredOnly(IntegrationKey.whatsapp);
  else if (integration === IntegrationKey.canva) result = checkNoCorsConfiguredOnly(IntegrationKey.canva);

  healthState[integration] = {
    status: result.status,
    lastErrorKey: result.lastErrorKey,
    lastCheckedAt: nowTs()
  };

  return { ok: true, data: healthState[integration] };
}

// PUBLIC_INTERFACE
export async function checkAllIntegrationsHealth() {
  /** Check health for all integrations. */
  await Promise.all([
    checkIntegrationHealth(IntegrationKey.openai),
    checkIntegrationHealth(IntegrationKey.meta),
    checkIntegrationHealth(IntegrationKey.whatsapp),
    checkIntegrationHealth(IntegrationKey.canva)
  ]);

  return {
    ok: true,
    data: {
      ...healthState
    }
  };
}

// PUBLIC_INTERFACE
export function getCachedIntegrationHealth() {
  /** Return last known health state (no network). */
  return { ...healthState };
}

// PUBLIC_INTERFACE
export const Integrations = IntegrationKey;

// PUBLIC_INTERFACE
export const IntegrationHealthStatus = HealthStatus;
