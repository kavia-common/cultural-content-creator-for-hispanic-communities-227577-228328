import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { CaptionVariationType } from '../../services/openaiCaptions';
import { useArtifacts, ArtifactTypes } from '../../state/artifacts';
import { useAppMessages } from '../../state/messages';

function variationLabelKey(type) {
  if (type === CaptionVariationType.long) return 'variations.long';
  if (type === CaptionVariationType.short) return 'variations.short';
  if (type === CaptionVariationType.question) return 'variations.question';
  return 'variations.short';
}

function formatTs(ts, locale) {
  try {
    return new Date(ts).toLocaleString(locale || undefined, { hour12: false });
  } catch {
    return String(ts || '');
  }
}

function itemsByVariation(items) {
  const list = Array.isArray(items) ? items : [];
  const byType = new Map(list.map((i) => [i.variationType, i]));
  return [CaptionVariationType.long, CaptionVariationType.short, CaptionVariationType.question]
    .map((t) => byType.get(t))
    .filter(Boolean);
}

function appliesToArtifactType(tweak, artifactType) {
  const applies = (tweak?.appliesTo || '').toString().toLowerCase();
  if (!applies) return true;
  if (artifactType === ArtifactTypes.captions) return applies.includes('caption');
  if (artifactType === ArtifactTypes.scripts) return applies.includes('script');
  if (artifactType === ArtifactTypes.outlines) return applies.includes('outline');
  return true;
}

// PUBLIC_INTERFACE
export default function ArtifactsWorkspace({ title }) {
  /** Workspace for multi-artifact editing: captions + scripts + outlines w/ versions, audit, and apply-suggestions helpers. */
  const { t, i18n } = useTranslation();
  const { pushMessage } = useAppMessages();
  const { state } = useArtifacts();

  const [tab, setTab] = useState(ArtifactTypes.captions);

  const tabTitle = title || t('artifacts.title');
  const closeLabel = t('common.closeDialog');

  const slice = state[tab] || { items: [], approvedId: '' };
  const orderedItems = useMemo(() => itemsByVariation(slice.items), [slice.items]);

  useEffect(() => {
    // When switching tabs and no items exist, keep it quiet (no auto generation).
  }, [tab]);

  return (
    <section className="card" aria-label={tabTitle} data-testid="artifacts-workspace">
      <div className="cardHeader">
        <h2 className="h2">{tabTitle}</h2>

        <div className="tabs" role="tablist" aria-label={t('artifacts.tabsLabel')}>
          {[
            { key: ArtifactTypes.captions, labelKey: 'artifacts.tabs.captions' },
            { key: ArtifactTypes.scripts, labelKey: 'artifacts.tabs.scripts' },
            { key: ArtifactTypes.outlines, labelKey: 'artifacts.tabs.outlines' }
          ].map((x) => {
            const selected = tab === x.key;
            return (
              <button
                key={x.key}
                type="button"
                className={`tabBtn ${selected ? 'tabBtnActive' : ''}`}
                role="tab"
                aria-selected={selected ? 'true' : 'false'}
                onClick={() => setTab(x.key)}
                data-testid={`artifact-tab-${x.key}`}
              >
                {t(x.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="muted" style={{ marginTop: 0 }}>
        {t('artifacts.approvalHint', {
          approved:
            slice.approvedId && (slice.items || []).some((i) => i.id === slice.approvedId)
              ? t('artifacts.approvalYes')
              : t('artifacts.approvalNo')
        })}
      </div>

      {!orderedItems.length ? (
        <div className="muted" style={{ marginTop: 10 }}>
          {t('artifacts.empty')}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {orderedItems.map((item) => (
            <ArtifactItemCard
              key={item.id}
              artifactType={tab}
              item={item}
              isApproved={slice.approvedId === item.id}
              engagement={state.engagement}
              predictive={state.predictive}
              language={i18n.language}
              onNotify={(kind, key, params) =>
                pushMessage({ kind, messageKey: key, params: params || {}, live: kind === 'error' ? 'assertive' : 'polite' })
              }
              closeLabel={closeLabel}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ArtifactItemCard({
  artifactType,
  item,
  isApproved,
  engagement,
  predictive,
  language,
  onNotify,
  closeLabel
}) {
  const { t } = useTranslation();
  const { actions } = useArtifacts();

  const [draft, setDraft] = useState(item.text);
  const [dirty, setDirty] = useState(false);

  const [versionsOpen, setVersionsOpen] = useState(false);
  const initialFocusRef = useRef(null);

  useEffect(() => {
    setDraft(item.text);
    setDirty(false);
  }, [item.id, item.text]);

  const variationLabel = t(variationLabelKey(item.variationType));

  const tweakList = useMemo(() => {
    const tweaks = Array.isArray(predictive?.tweaks) ? predictive.tweaks : [];
    return tweaks.filter((tw) => appliesToArtifactType(tw, artifactType));
  }, [predictive?.tweaks, artifactType]);

  const canSave = dirty;
  const canApprove = Boolean((draft || '').trim());

  const appendLine = (text) => {
    const d = (draft || '').trimEnd();
    const addition = (text || '').trim();
    if (!addition) return;
    const next = d ? `${d}\n\n${addition}` : addition;
    setDraft(next);
    setDirty(true);
  };

  return (
    <div className="card" aria-label={t('artifacts.itemAria', { type: artifactType, variation: variationLabel })}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <strong>{variationLabel}</strong>

        <span className={`badge ${isApproved ? 'badgeComplete' : ''}`} aria-label={t('artifacts.itemStatusLabel')}>
          <span className="badgeDot" aria-hidden="true" />
          {isApproved ? t('artifacts.approved') : t('artifacts.notApproved')}
        </span>
      </div>

      <label className="srOnly" htmlFor={`${artifactType}-${item.id}`}>
        {t('artifacts.editLabel', { variation: variationLabel })}
      </label>

      <textarea
        id={`${artifactType}-${item.id}`}
        className="textarea"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        style={{ marginTop: 10 }}
      />

      {tweakList.length ? (
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ fontWeight: 800, marginBottom: 8 }}>
            {t('artifacts.predictiveTitle')}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {tweakList.slice(0, 6).map((tw) => (
              <div key={tw.id} className="callout" style={{ margin: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <strong>{tw.title}</strong>
                    {tw.objection ? <div className="muted">{t('artifacts.objection', { text: tw.objection })}</div> : null}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{tw.suggestion}</div>
                  </div>

                  <button
                    type="button"
                    className="btn btnSecondary"
                    onClick={() => appendLine(tw.suggestion)}
                    aria-label={t('artifacts.applySuggestionAria', { title: tw.title })}
                  >
                    {t('artifacts.apply')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 10 }}>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 8 }}>
          {t('artifacts.engagementTitle')}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={() => appendLine(engagement?.survey)}
            disabled={!engagement?.survey}
            aria-disabled={!engagement?.survey ? 'true' : 'false'}
          >
            {t('artifacts.insertSurvey')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => appendLine(engagement?.openQuestion)}
            disabled={!engagement?.openQuestion}
            aria-disabled={!engagement?.openQuestion ? 'true' : 'false'}
          >
            {t('artifacts.insertOpenQuestion')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => appendLine(engagement?.challenge)}
            disabled={!engagement?.challenge}
            aria-disabled={!engagement?.challenge ? 'true' : 'false'}
          >
            {t('artifacts.insertChallenge')}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={() => setVersionsOpen(true)} ref={initialFocusRef}>
            {t('artifacts.versions')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btnSecondary"
            onClick={() => {
              actions.editItem({
                artifactType,
                id: item.id,
                nextText: draft,
                actor: 'user',
                note: 'edited'
              });
              setDirty(false);
              onNotify?.('success', 'artifacts.messages.saved');
            }}
            disabled={!canSave}
          >
            {t('artifacts.save')}
          </button>

          <button
            type="button"
            className="btn btnPrimary"
            onClick={() => {
              if (!canApprove) {
                onNotify?.('error', 'artifacts.messages.cannotApproveEmpty');
                return;
              }
              // Ensure latest draft is saved into a version before approval.
              if (dirty) {
                actions.editItem({
                  artifactType,
                  id: item.id,
                  nextText: draft,
                  actor: 'user',
                  note: 'edited_before_approval'
                });
                setDirty(false);
              }
              actions.approveItem({ artifactType, id: item.id, actor: 'user' });
              onNotify?.('success', 'artifacts.messages.approved');
            }}
          >
            {t('artifacts.approve')}
          </button>
        </div>
      </div>

      <Modal
        isOpen={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title={t('artifacts.versionsTitle', { variation: variationLabel })}
        describedById="versions-desc"
        initialFocusRef={initialFocusRef}
        closeLabel={closeLabel}
      >
        <div id="versions-desc" className="srOnly">
          {t('artifacts.versionsDesc')}
        </div>

        {!item.versions?.length ? (
          <div className="muted">{t('artifacts.versionsEmpty')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {item.versions.slice(0, 20).map((v) => (
              <div key={v.id} className="card">
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <strong>{t('artifacts.versionMeta', { actor: v.actor || '—', note: v.note || '—' })}</strong>
                    <div className="muted">{formatTs(v.ts, language)}</div>
                  </div>

                  <button
                    type="button"
                    className="btn btnSecondary"
                    onClick={() => {
                      actions.restoreVersion({
                        artifactType,
                        id: item.id,
                        versionId: v.id,
                        actor: 'user'
                      });
                      setVersionsOpen(false);
                      onNotify?.('success', 'artifacts.messages.restored');
                    }}
                    aria-label={t('artifacts.restoreAria', { variation: variationLabel })}
                  >
                    {t('artifacts.restore')}
                  </button>
                </div>

                <pre className="muted" style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>
                  {(v.text || '').toString()}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
