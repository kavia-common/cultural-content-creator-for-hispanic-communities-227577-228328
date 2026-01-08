import React, { useEffect, useId, useRef, useState } from 'react';

// PUBLIC_INTERFACE
export default function HelpTooltip({ label, children, placement = 'right' }) {
  /** Accessible tooltip: open on hover/focus; close on blur/escape; supports aria-describedby. */
  const id = useId();
  const tipId = `help-tip-${id}`;
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        btnRef.current?.focus?.();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  return (
    <span className="helpTooltipWrap">
      <button
        type="button"
        className="helpIconBtn"
        ref={btnRef}
        aria-label={label}
        aria-describedby={open ? tipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>

      {open ? (
        <span role="tooltip" id={tipId} className={`helpTooltip helpTooltip-${placement}`}>
          {children}
        </span>
      ) : null}
    </span>
  );
}
