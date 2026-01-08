import React, { useEffect, useId, useMemo, useRef } from 'react';

/**
 * Simple focus-trapping modal dialog.
 * - ESC closes
 * - Click on backdrop closes (optional)
 * - Restores focus on close
 */

function getFocusableElements(container) {
  if (!container) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];
  return Array.from(container.querySelectorAll(selectors.join(','))).filter(
    (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
  );
}

// PUBLIC_INTERFACE
export default function Modal({
  isOpen,
  title,
  labelledById,
  describedById,
  onClose,
  children,
  closeOnBackdrop = true,
  initialFocusRef,
  closeLabel = 'Close dialog'
}) {
  /** Accessible modal with focus trap and ESC/backdrop close. */
  const autoId = useId();
  const dialogLabelId = labelledById || `modal-title-${autoId}`;
  const dialogDescId = describedById;

  const panelRef = useRef(null);
  const lastActiveRef = useRef(null);

  const titleNode = useMemo(() => {
    if (!title) return null;
    return (
      <h2 id={dialogLabelId} className="h2" style={{ margin: 0 }}>
        {title}
      </h2>
    );
  }, [title, dialogLabelId]);

  useEffect(() => {
    if (!isOpen) return;

    lastActiveRef.current = document.activeElement;

    // Focus the initial focus target or first focusable element.
    window.setTimeout(() => {
      const initial = initialFocusRef?.current;
      if (initial && typeof initial.focus === 'function') {
        initial.focus();
        return;
      }
      const focusables = getFocusableElements(panelRef.current);
      (focusables[0] || panelRef.current)?.focus?.();
    }, 0);

    // Prevent background scroll
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      const last = lastActiveRef.current;
      if (last && typeof last.focus === 'function') last.focus();
    };
  }, [isOpen, initialFocusRef]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusables = getFocusableElements(panelRef.current);
      if (!focusables.length) {
        e.preventDefault();
        panelRef.current?.focus?.();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
        return;
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modalOverlay"
      role="presentation"
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="modalPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogLabelId}
        aria-describedby={dialogDescId}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="modalHeader">
          <div style={{ display: 'grid', gap: 4 }}>
            {titleNode}
            {dialogDescId ? <div id={dialogDescId} className="srOnly" /> : null}
          </div>

          <button type="button" className="btn" onClick={onClose} aria-label={closeLabel}>
            ✕
          </button>
        </div>

        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}
