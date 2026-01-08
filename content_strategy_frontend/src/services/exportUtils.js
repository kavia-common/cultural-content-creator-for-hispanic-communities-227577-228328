// PUBLIC_INTERFACE
export function downloadTextFile({ filename, text }) {
  /** Trigger a browser download for a text file (client-side only). */
  const safeName = (filename || 'export.txt').toString();
  const payload = (text || '').toString();

  const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

// PUBLIC_INTERFACE
export async function copyTextToClipboard(text) {
  /**
   * Copy text to clipboard. Uses Clipboard API if available; falls back to a hidden textarea.
   * Returns { ok: boolean }.
   */
  const payload = (text || '').toString();

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload);
      return { ok: true };
    } catch {
      // fall through to legacy
    }
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = payload;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return { ok: Boolean(ok) };
  } catch {
    return { ok: false };
  }
}
