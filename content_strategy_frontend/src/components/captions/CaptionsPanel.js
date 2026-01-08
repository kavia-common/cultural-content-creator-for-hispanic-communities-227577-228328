import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaptionVariationType } from '../../services/openaiCaptions';

function variationLabelKey(type) {
  if (type === CaptionVariationType.long) return 'captions.variation.long';
  if (type === CaptionVariationType.short) return 'captions.variation.short';
  if (type === CaptionVariationType.question) return 'captions.variation.question';
  return 'captions.variation.short';
}

// PUBLIC_INTERFACE
export default function CaptionsPanel({
  title,
  status, // 'idle' | 'loading' | 'success' | 'error'
  errorKey,
  captions,
  onEditCaption,
  onApproveCaption
}) {
  /** Displays generated captions with accessible status announcements and actions. */
  const { t } = useTranslation();
  const liveRef = useRef(null);

  // Focus the panel when new results arrive (helps keyboard and SR users).
  const headingRef = useRef(null);

  useEffect(() => {
    if (status !== 'success') return;
    headingRef.current?.focus?.();
  }, [status, captions?.length]);

  useEffect(() => {
    if (!liveRef.current) return;
    if (status === 'loading') {
      liveRef.current.textContent = t('captions.status.loading');
    } else if (status === 'success') {
      liveRef.current.textContent = t('captions.status.success');
    } else if (status === 'error') {
      liveRef.current.textContent = t(errorKey || 'captions.errors.generic');
    } else {
      liveRef.current.textContent = '';
    }
  }, [status, errorKey, t]);

  const hasCaptions = (captions || []).length > 0;

  const orderedCaptions = useMemo(() => {
    const list = Array.isArray(captions) ? captions : [];
    const order = [CaptionVariationType.long, CaptionVariationType.short, CaptionVariationType.question];
    const byType = new Map(list.map((c) => [c.variationType, c]));
    return order.map((type) => byType.get(type)).filter(Boolean);
  }, [captions]);

  return (
    <section className="card" aria-label={title}>
      <div className="srOnly" aria-live="polite" aria-atomic="true" ref={liveRef} />

      <div className="cardHeader">
        <h2 className="h2" tabIndex={-1} ref={headingRef}>
          {title}
        </h2>

        {status === 'loading' ? (
          <span className="badge" aria-label={t('captions.status.loading')}>
            <span className="badgeDot" aria-hidden="true" />
            {t('captions.status.loadingShort')}
          </span>
        ) : status === 'success' ? (
          <span className="badge badgeComplete" aria-label={t('captions.status.success')}>
            <span className="badgeDot" aria-hidden="true" />
            {t('captions.status.ready')}
          </span>
        ) : (
          <span className="badge" aria-label={t('captions.status.idle')}>
            <span className="badgeDot" aria-hidden="true" />
            {t('captions.status.idleShort')}
          </span>
        )}
      </div>

      {status === 'error' ? (
        <div className="callout calloutError" role="alert" style={{ marginTop: 8 }}>
          {t(errorKey || 'captions.errors.generic')}
        </div>
      ) : null}

      {status === 'idle' && !hasCaptions ? (
        <p className="muted" style={{ marginTop: 8 }}>
          {t('captions.empty')}
        </p>
      ) : null}

      {status === 'loading' ? (
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card" style={{ opacity: 0.85 }}>
              <div className="muted" style={{ fontWeight: 800 }}>
                {t('captions.loadingCard')}
              </div>
              <p className="muted" style={{ marginTop: 8 }}>
                …
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {hasCaptions && status !== 'loading' ? (
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {orderedCaptions.map((c) => (
            <CaptionCard
              key={c.id}
              caption={c}
              variationLabel={t(variationLabelKey(c.variationType))}
              onEditCaption={onEditCaption}
              onApproveCaption={onApproveCaption}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CaptionCard({ caption, variationLabel, onEditCaption, onApproveCaption }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(caption.text);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(caption.text);
    setDirty(false);
  }, [caption.id, caption.text]);

  return (
    <div className="card" aria-label={variationLabel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <strong>{variationLabel}</strong>
        <span className="badge" aria-label={t('captions.metaLabel')}>
          <span className="badgeDot" aria-hidden="true" />
          {(caption.language || '—').toUpperCase()} • {caption.emotion || '—'}
        </span>
      </div>

      <label className="srOnly" htmlFor={`cap-${caption.id}`}>
        {t('captions.editLabel', { variation: variationLabel })}
      </label>

      <textarea
        id={`cap-${caption.id}`}
        className="textarea"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        style={{ marginTop: 10 }}
      />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btnSecondary"
          onClick={() => {
            onEditCaption?.(caption.id, draft);
            setDirty(false);
          }}
          disabled={!dirty}
        >
          {t('captions.actions.saveEdit')}
        </button>

        <button
          type="button"
          className="btn btnPrimary"
          onClick={() => onApproveCaption?.(caption.id)}
        >
          {t('captions.actions.approve')}
        </button>
      </div>
    </div>
  );
}
