import React from 'react';
import { useTranslation } from 'react-i18next';

// PUBLIC_INTERFACE
export default function PreviewPanel({ title, content }) {
  /** Right panel placeholder: preview/export scaffolding (no API integration yet). */
  const { t } = useTranslation();

  return (
    <section className="card" aria-label={title}>
      <div className="cardHeader">
        <h2 className="h2">{title}</h2>
        <span className="badge" aria-label={t('preview.channelLabel')}>
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

        <div className="muted">{t('preview.exportStub')}</div>
      </div>
    </section>
  );
}
