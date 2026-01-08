import React from 'react';

// PUBLIC_INTERFACE
export default function PreviewPanel({ title, content }) {
  /** Right panel placeholder: preview/export scaffolding (no API integration yet). */
  return (
    <section className="card" aria-label={title}>
      <div className="cardHeader">
        <h2 className="h2">{title}</h2>
        <span className="badge" aria-label="Channel">
          <span className="badgeDot" aria-hidden="true" />
          {(content?.channel || '—').toUpperCase()}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div className="card">
          <strong>{content?.title || '—'}</strong>
          <p className="muted" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
            {content?.body || '—'}
          </p>
        </div>

        <div className="muted">
          Export/share actions will be added here (WhatsApp, Facebook) once keys and endpoints are configured.
        </div>
      </div>
    </section>
  );
}
