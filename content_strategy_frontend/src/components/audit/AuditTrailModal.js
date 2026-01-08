import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { useArtifacts } from '../../state/artifacts';
import { downloadTextFile } from '../../services/exportUtils';

function formatTs(ts, locale) {
  try {
    return new Date(ts).toLocaleString(locale || undefined, { hour12: false });
  } catch {
    return String(ts || '');
  }
}

function toCsvRow(values) {
  const escape = (v) => {
    const s = (v ?? '').toString();
    return `"${s.replace(/"/g, '""')}"`;
  };
  return values.map(escape).join(',');
}

// PUBLIC_INTERFACE
export default function AuditTrailModal({ isOpen, onClose, filterArtifactType }) {
  /** Audit trail modal for the current artifact session (includes export to CSV). */
  const { t, i18n } = useTranslation();
  const { state } = useArtifacts();
  const initialFocusRef = useRef(null);

  const closeLabel = t('common.closeDialog');

  const entries = useMemo(() => {
    const list = Array.isArray(state.audit) ? state.audit : [];
    if (!filterArtifactType) return list;
    return list.filter((e) => e.artifactType === filterArtifactType);
  }, [state.audit, filterArtifactType]);

  const exportCsv = () => {
    const header = ['timestamp', 'actor', 'action', 'artifactType', 'variationType', 'details'];
    const rows = entries.map((e) =>
      toCsvRow([
        formatTs(e.ts, i18n.language),
        e.actor || '',
        e.action || '',
        e.artifactType || '',
        e.variationType || '',
        e.details || ''
      ])
    );

    downloadTextFile({
      filename: `audit-${state.artifactId || 'artifact'}.csv`,
      text: [toCsvRow(header), ...rows].join('\n')
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('audit.title')}
      describedById="audit-desc"
      initialFocusRef={initialFocusRef}
      closeLabel={closeLabel}
    >
      <div id="audit-desc" className="srOnly">
        {t('audit.description')}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div className="muted">{t('audit.count', { count: entries.length })}</div>

          <button
            type="button"
            className="btn btnSecondary"
            onClick={exportCsv}
            ref={initialFocusRef}
            disabled={!entries.length}
            aria-disabled={!entries.length ? 'true' : 'false'}
            data-testid="audit-export"
          >
            {t('audit.exportCsv')}
          </button>
        </div>

        {!entries.length ? (
          <div className="muted">—</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {entries.slice(0, 80).map((e) => (
              <div key={e.id} className="card">
                <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <strong>
                    {e.action} • {e.artifactType || '—'}
                  </strong>
                  <span className="muted">{formatTs(e.ts, i18n.language)}</span>
                </div>

                <div className="muted" style={{ marginTop: 6 }}>
                  {t('audit.actor', { actor: e.actor || '—' })}
                  {e.variationType ? ` • ${t('audit.variation', { variation: e.variationType })}` : ''}
                </div>

                {e.details ? (
                  <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{(e.details || '').toString()}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
