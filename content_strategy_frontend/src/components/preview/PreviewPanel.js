import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CHANNELS, channelConfig } from '../../services/channelConfig';
import { formatBytes, validateForFacebook, validateForWhatsApp } from '../../services/channelValidation';
import { copyTextToClipboard, downloadTextFile } from '../../services/exportUtils';
import { useAppMessages } from '../../state/messages';
import { ArtifactTypes } from '../../state/artifacts';
import { WorkflowStepStatus } from '../../state/workflow';

function formatTimeHHMM(date) {
  const d = date instanceof Date ? date : new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function issueToI18nKey(issue) {
  if (issue.code === 'text.tooLong') return 'preview.validation.textTooLong';
  if (issue.code === 'media.unsupportedType') return 'preview.validation.mediaUnsupportedType';
  if (issue.code === 'media.fileTooLarge') return 'preview.validation.mediaFileTooLarge';
  if (issue.code === 'media.aspectRatioRecommended') return 'preview.validation.mediaAspectRatioRecommended';
  if (issue.code === 'video.tooLong') return 'preview.validation.videoTooLong';
  return 'preview.validation.generic';
}

function issueSuggestionKey(issue) {
  if (issue.code === 'text.tooLong') return 'preview.validation.suggest.shortenText';
  if (issue.code === 'media.unsupportedType') return 'preview.validation.suggest.useSupportedType';
  if (issue.code === 'media.fileTooLarge') return 'preview.validation.suggest.reduceFileSize';
  if (issue.code === 'media.aspectRatioRecommended') return 'preview.validation.suggest.adjustCrop';
  if (issue.code === 'video.tooLong') return 'preview.validation.suggest.trimVideo';
  return 'preview.validation.suggest.generic';
}

function getCoordinatorApproved(workflowState) {
  const steps = workflowState?.steps || [];
  const coord = steps.find((s) => s.id === 'Coordinator');
  return coord?.status === WorkflowStepStatus.approved;
}

function pickItem(slice, variationType) {
  const items = Array.isArray(slice?.items) ? slice.items : [];
  const byType = new Map(items.map((i) => [i.variationType, i]));
  return byType.get(variationType) || items[0] || null;
}

function buildExportText({ topic, artifactType, variationType, body, channel, includeEngagement, engagement }) {
  const lines = [];
  lines.push(`Topic: ${topic || '—'}`);
  lines.push(`Type: ${artifactType}`);
  lines.push(`Variation: ${variationType}`);
  lines.push(`Channel: ${channel}`);
  lines.push('');
  lines.push(body || '—');

  if (includeEngagement) {
    const survey = (engagement?.survey || '').trim();
    const openQ = (engagement?.openQuestion || '').trim();
    const challenge = (engagement?.challenge || '').trim();

    const blocks = [];
    if (survey) blocks.push(`Survey: ${survey}`);
    if (openQ) blocks.push(`Open question: ${openQ}`);
    if (challenge) blocks.push(`Challenge: ${challenge}`);

    if (blocks.length) {
      lines.push('');
      lines.push('—');
      lines.push(...blocks);
    }
  }

  return lines.join('\n');
}

function openWhatsAppShare(text) {
  const url = `https://wa.me/?text=${encodeURIComponent((text || '').toString())}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openFacebookShare({ quote }) {
  const baseUrl = window.location?.href || 'https://example.com';
  // Facebook often ignores quote; still safe.
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(baseUrl)}&quote=${encodeURIComponent(
    (quote || '').toString()
  )}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// PUBLIC_INTERFACE
export default function PreviewPanel({ title, content, artifacts, workflowState }) {
  /** Right panel: channel preview + strict client-side export gating (no backend). */
  const { t } = useTranslation();
  const { pushMessage } = useAppMessages();

  // Backward compat: if artifacts not provided, use content prop behavior.
  const usingArtifacts = Boolean(artifacts && typeof artifacts === 'object');

  const [channel, setChannel] = useState(content?.channel || CHANNELS.facebook);

  const [artifactType, setArtifactType] = useState(ArtifactTypes.captions);
  const [variationType, setVariationType] = useState('short');
  const [includeEngagement, setIncludeEngagement] = useState(true);

  // Keep local channel state in sync when upstream changes (compat mode).
  useEffect(() => {
    if (!usingArtifacts && content?.channel && content.channel !== channel) setChannel(content.channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.channel, usingArtifacts]);

  const slice = usingArtifacts ? artifacts?.[artifactType] : null;
  const selectedItem = useMemo(() => (usingArtifacts ? pickItem(slice, variationType) : null), [usingArtifacts, slice, variationType]);

  const selectedApproved = useMemo(() => {
    if (!usingArtifacts) return true; // compat mode doesn't gate export
    if (!slice?.approvedId) return false;
    // require approval of the currently previewed variation
    return slice.approvedId === selectedItem?.id;
  }, [usingArtifacts, slice?.approvedId, selectedItem?.id]);

  const coordinatorApproved = useMemo(() => getCoordinatorApproved(workflowState), [workflowState]);

  const previewPayload = useMemo(() => {
    if (!usingArtifacts) {
      return {
        title: content?.title || '',
        body: content?.body || '',
        media: content?.media ?? null
      };
    }

    const topic = artifacts?.context?.topic || '';
    const body = (selectedItem?.text || '').toString();

    return {
      title: t('preview.placeholderTitle', { topic: topic || t('preview.fallbackTopic') }),
      body,
      media: null
    };
  }, [usingArtifacts, content, artifacts, selectedItem, t]);

  const exportText = useMemo(() => {
    if (!usingArtifacts) return previewPayload.body || '';
    return buildExportText({
      topic: artifacts?.context?.topic || '',
      artifactType,
      variationType,
      body: previewPayload.body || '',
      channel,
      includeEngagement,
      engagement: artifacts?.engagement
    });
  }, [usingArtifacts, artifacts, artifactType, variationType, previewPayload.body, channel, includeEngagement]);

  const validation = useMemo(() => {
    if (channel === CHANNELS.whatsapp) return validateForWhatsApp(previewPayload);
    return validateForFacebook(previewPayload);
  }, [channel, previewPayload]);

  const liveRef = useRef(null);

  useEffect(() => {
    if (!liveRef.current) return;

    if (!validation.issues.length) {
      liveRef.current.textContent = t('preview.validation.passed');
      return;
    }

    // Announce a compact summary so SR users get a timely update.
    const errors = validation.issues.filter((i) => i.severity === 'error').length;
    const warnings = validation.issues.filter((i) => i.severity === 'warning').length;
    liveRef.current.textContent = t('preview.validation.summary', { errors, warnings });
  }, [validation, t]);

  const cfg = channelConfig[channel];
  const maxChars = cfg?.text?.maxChars ?? 0;

  const now = useMemo(() => new Date(), []);
  const timeLabel = useMemo(() => formatTimeHHMM(now), [now]);

  const exportBlockedReason = useMemo(() => {
    // Strict export gating:
    // 1) must pass channel validation (no errors)
    // 2) must have the selected variation approved (when using artifacts)
    // 3) must have Coordinator approved (final gate)
    if (!validation.ok) return 'preview.export.blocked.validation';
    if (usingArtifacts && !selectedApproved) return 'preview.export.blocked.needsApproval';
    if (usingArtifacts && !coordinatorApproved) return 'preview.export.blocked.needsCoordinator';
    return '';
  }, [validation.ok, usingArtifacts, selectedApproved, coordinatorApproved]);

  const canExport = !exportBlockedReason;

  const doCopy = async () => {
    if (!canExport) {
      pushMessage({ kind: 'error', messageKey: exportBlockedReason, live: 'assertive' });
      return;
    }
    const res = await copyTextToClipboard(exportText);
    if (res.ok) pushMessage({ kind: 'success', messageKey: 'preview.export.copied', live: 'polite' });
    else pushMessage({ kind: 'error', messageKey: 'preview.export.copyFailed', live: 'assertive' });
  };

  const doDownload = () => {
    if (!canExport) {
      pushMessage({ kind: 'error', messageKey: exportBlockedReason, live: 'assertive' });
      return;
    }
    const safeTopic = (usingArtifacts ? artifacts?.context?.topic : content?.title) || 'export';
    const filenameBase = safeTopic.toString().trim().toLowerCase().slice(0, 50).replace(/\s+/g, '-');
    const filename = usingArtifacts
      ? `${filenameBase}-${artifactType}-${variationType}-${channel}.txt`
      : `${filenameBase}-${channel}.txt`;

    downloadTextFile({ filename, text: exportText });
    pushMessage({ kind: 'success', messageKey: 'preview.export.downloaded', live: 'polite' });
  };

  const doShareWhatsApp = () => {
    if (!canExport) {
      pushMessage({ kind: 'error', messageKey: exportBlockedReason, live: 'assertive' });
      return;
    }
    openWhatsAppShare(exportText);
    pushMessage({ kind: 'info', messageKey: 'preview.export.shareOpened', live: 'polite' });
  };

  const doShareFacebook = () => {
    if (!canExport) {
      pushMessage({ kind: 'error', messageKey: exportBlockedReason, live: 'assertive' });
      return;
    }
    openFacebookShare({ quote: exportText });
    pushMessage({ kind: 'info', messageKey: 'preview.export.shareOpened', live: 'polite' });
  };

  return (
    <section className="card" aria-label={title}>
      <div className="cardHeader">
        <h2 className="h2">{title}</h2>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="tabs" role="tablist" aria-label={t('preview.channelToggleLabel')}>
            <button
              type="button"
              className={`tabBtn ${channel === CHANNELS.whatsapp ? 'tabBtnActive' : ''}`}
              role="tab"
              aria-selected={channel === CHANNELS.whatsapp ? 'true' : 'false'}
              onClick={() => setChannel(CHANNELS.whatsapp)}
              aria-label={t('preview.channels.whatsapp')}
              data-testid="channel-whatsapp"
            >
              {t('preview.channels.whatsapp')}
            </button>

            <button
              type="button"
              className={`tabBtn ${channel === CHANNELS.facebook ? 'tabBtnActive' : ''}`}
              role="tab"
              aria-selected={channel === CHANNELS.facebook ? 'true' : 'false'}
              onClick={() => setChannel(CHANNELS.facebook)}
              aria-label={t('preview.channels.facebook')}
              data-testid="channel-facebook"
            >
              {t('preview.channels.facebook')}
            </button>
          </div>

          <span className="badge" aria-label={t('preview.channelLabel')}>
            <span className="badgeDot" aria-hidden="true" />
            {channel.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="srOnly" aria-live="polite" aria-atomic="true" ref={liveRef} />

      {usingArtifacts ? (
        <div className="card" aria-label={t('preview.contentSelectorTitle')} style={{ marginBottom: 10 }}>
          <div className="twoColRow">
            <div>
              <label className="fieldHelp" htmlFor="preview-type" style={{ fontWeight: 800 }}>
                {t('preview.contentType')}
              </label>
              <select
                id="preview-type"
                className="select"
                value={artifactType}
                onChange={(e) => setArtifactType(e.target.value)}
                aria-label={t('preview.contentType')}
                data-testid="preview-type"
              >
                <option value={ArtifactTypes.captions}>{t('preview.types.captions')}</option>
                <option value={ArtifactTypes.scripts}>{t('preview.types.scripts')}</option>
                <option value={ArtifactTypes.outlines}>{t('preview.types.outlines')}</option>
              </select>
            </div>

            <div>
              <label className="fieldHelp" htmlFor="preview-variation" style={{ fontWeight: 800 }}>
                {t('preview.variation')}
              </label>
              <select
                id="preview-variation"
                className="select"
                value={variationType}
                onChange={(e) => setVariationType(e.target.value)}
                aria-label={t('preview.variation')}
                data-testid="preview-variation"
              >
                <option value="long">{t('variations.long')}</option>
                <option value="short">{t('variations.short')}</option>
                <option value="question">{t('variations.question')}</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
            <input
              type="checkbox"
              checked={includeEngagement}
              onChange={(e) => setIncludeEngagement(e.target.checked)}
            />
            <span className="muted">{t('preview.includeEngagement')}</span>
          </label>

          <div className="muted" style={{ marginTop: 10 }}>
            {t('preview.approvalStatus', { approved: selectedApproved ? t('preview.approvedYes') : t('preview.approvedNo') })}
            {' • '}
            {t('preview.coordinatorStatus', { approved: coordinatorApproved ? t('preview.approvedYes') : t('preview.approvedNo') })}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 10 }}>
        <div className="previewMetaRow">
          <div className="muted" style={{ margin: 0 }}>
            {t('preview.characterCount', { count: (previewPayload.body || '').length, max: maxChars })}
          </div>

          {previewPayload.media ? (
            <div className="muted" style={{ margin: 0 }}>
              {t('preview.mediaLabel', {
                type: previewPayload.media.type,
                mimeType: previewPayload.media.mimeType || '—',
                size: previewPayload.media.fileSizeBytes ? formatBytes(previewPayload.media.fileSizeBytes) : '—'
              })}
            </div>
          ) : (
            <div className="muted" style={{ margin: 0 }}>
              {t('preview.mediaNone')}
            </div>
          )}
        </div>

        <ValidationRegion issues={validation.issues} />

        {exportBlockedReason ? (
          <div className="callout calloutError" role="alert" data-testid="export-blocked">
            {t(exportBlockedReason)}
          </div>
        ) : null}

        <div className="previewStage" data-testid="preview-stage">
          {channel === CHANNELS.whatsapp ? (
            <WhatsAppPreview message={previewPayload.body} timestampLabel={timeLabel} media={previewPayload.media} />
          ) : (
            <FacebookPreview title={previewPayload.title} body={previewPayload.body} media={previewPayload.media} />
          )}
        </div>

        <section className="card" aria-label={t('preview.export.title')}>
          <div className="muted" style={{ fontWeight: 800, marginBottom: 8 }}>
            {t('preview.export.title')}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btnSecondary"
              onClick={doCopy}
              disabled={!canExport}
              aria-disabled={!canExport ? 'true' : 'false'}
              data-testid="export-copy"
            >
              {t('preview.export.copy')}
            </button>

            <button
              type="button"
              className="btn btnSecondary"
              onClick={doDownload}
              disabled={!canExport}
              aria-disabled={!canExport ? 'true' : 'false'}
              data-testid="export-download"
            >
              {t('preview.export.download')}
            </button>

            <button
              type="button"
              className="btn"
              onClick={doShareWhatsApp}
              disabled={!canExport}
              aria-disabled={!canExport ? 'true' : 'false'}
              data-testid="export-share-whatsapp"
            >
              {t('preview.export.shareWhatsApp')}
            </button>

            <button
              type="button"
              className="btn"
              onClick={doShareFacebook}
              disabled={!canExport}
              aria-disabled={!canExport ? 'true' : 'false'}
              data-testid="export-share-facebook"
            >
              {t('preview.export.shareFacebook')}
            </button>
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            {t('preview.export.hint')}
          </div>
        </section>
      </div>
    </section>
  );
}

function ValidationRegion({ issues }) {
  const { t } = useTranslation();

  const has = issues && issues.length;
  const errors = (issues || []).filter((i) => i.severity === 'error');
  const warnings = (issues || []).filter((i) => i.severity === 'warning');

  return (
    <section className={`validationRegion ${has ? 'validationRegionActive' : ''}`} aria-label={t('preview.validation.title')}>
      <div role="status" aria-live="polite" aria-atomic="false">
        {!has ? (
          <div className="callout" style={{ margin: 0 }}>
            {t('preview.validation.passed')}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {errors.length ? (
              <div className="callout calloutError" style={{ margin: 0 }}>
                <strong>{t('preview.validation.errorsTitle', { count: errors.length })}</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {errors.map((issue, idx) => (
                    <IssueLine key={`${issue.code}-${idx}`} issue={issue} />
                  ))}
                </ul>
              </div>
            ) : null}

            {warnings.length ? (
              <div className="callout" style={{ margin: 0 }}>
                <strong>{t('preview.validation.warningsTitle', { count: warnings.length })}</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {warnings.map((issue, idx) => (
                    <IssueLine key={`${issue.code}-${idx}`} issue={issue} />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function IssueLine({ issue }) {
  const { t } = useTranslation();

  const cfgWhats = channelConfig.whatsapp;
  const cfgFb = channelConfig.facebook;

  const params = { ...(issue.params || {}) };

  // Enrich file size params into readable strings for UI.
  if (issue.code === 'media.fileTooLarge') {
    params.max = formatBytes(issue.params?.maxBytes);
    params.actual = formatBytes(issue.params?.actualBytes);
  }

  // Provide "supported types" in a user-friendly list when missing.
  if (issue.code === 'media.unsupportedType' && !params.supported) {
    params.supported = [...new Set([...cfgWhats.media.supportedMimeTypes, ...cfgFb.media.supportedMimeTypes])].join(', ');
  }

  return (
    <li>
      <div>
        <span>{t(issueToI18nKey(issue), params)}</span>
        <div className="muted" style={{ marginTop: 4 }}>
          {t(issueSuggestionKey(issue))}
        </div>
      </div>
    </li>
  );
}

function WhatsAppPreview({ message, timestampLabel, media }) {
  const { t } = useTranslation();

  return (
    <div className="waShell" aria-label={t('preview.whatsapp.ariaLabel')} data-testid="wa-preview">
      <div className="waTopBar" aria-hidden="true">
        <div className="waTopDot" />
        <div className="waTopTitle">{t('preview.whatsapp.chatName')}</div>
      </div>

      <div className="waChatArea">
        <div className="waBubble" aria-label={t('preview.whatsapp.messageLabel')}>
          {media ? <MediaFrame channel={CHANNELS.whatsapp} media={media} /> : null}

          <div className="waText" style={{ whiteSpace: 'pre-wrap' }}>
            {message || '—'}
          </div>

          <div className="waMetaRow" aria-label={t('preview.whatsapp.timestampLabel')}>
            <span className="waTime">{timestampLabel}</span>
            <span className="waTicks" aria-hidden="true">
              ✓✓
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FacebookPreview({ title, body, media }) {
  const { t } = useTranslation();

  return (
    <div className="fbShell" aria-label={t('preview.facebook.ariaLabel')} data-testid="fb-preview">
      <div className="fbCard">
        <div className="fbHeader">
          <div className="fbAvatar" aria-hidden="true" />
          <div className="fbHeaderText">
            <div className="fbPageName">{t('preview.facebook.pageName')}</div>
            <div className="fbSubLine">{t('preview.facebook.sponsored')}</div>
          </div>
        </div>

        <div className="fbBody">
          {title ? (
            <div className="fbTitle" style={{ marginBottom: 6 }}>
              {title}
            </div>
          ) : null}

          <div className="fbText" style={{ whiteSpace: 'pre-wrap' }}>
            {body || '—'}
          </div>
        </div>

        {media ? (
          <div className="fbMediaWrap">
            <MediaFrame channel={CHANNELS.facebook} media={media} />
          </div>
        ) : null}

        <div className="fbFooter" aria-hidden="true">
          <div className="fbFooterLine" />
          <div className="fbFooterActions">
            <span>Like</span>
            <span>Comment</span>
            <span>Share</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaFrame({ channel, media }) {
  const { t } = useTranslation();
  const cfg = channelConfig[channel];
  const ratios = cfg?.media?.recommendedAspectRatios || [];

  // If we have real dimensions, prefer a single "actual" frame.
  const hasDims = Boolean(media?.dimensions?.width && media?.dimensions?.height);

  if (hasDims) {
    return (
      <div className="mediaFrame">
        <div className="mediaFrameInner" aria-label={t('preview.media.frameLabel')}>
          <div className="mediaFrameIcon" aria-hidden="true">
            {media.type === 'video' ? '▶' : '▦'}
          </div>
          <div className="mediaFrameMeta">
            <div className="mediaFrameType">{media.type === 'video' ? t('preview.media.video') : t('preview.media.image')}</div>
            <div className="mediaFrameHint">{t('preview.media.dimensions', { w: media.dimensions.width, h: media.dimensions.height })}</div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise show recommended aspect ratio placeholders to guide users.
  return (
    <div className="mediaRatioGrid" aria-label={t('preview.media.ratiosLabel')}>
      {ratios.slice(0, 3).map((r) => (
        <div key={r.label} className="mediaRatioItem">
          <div className={`mediaRatioBox mediaRatioBox-${r.label.replace(':', '-')}`}>
            <div className="mediaRatioOverlay">
              <div className="mediaRatioTitle">{media?.type === 'video' ? t('preview.media.video') : t('preview.media.image')}</div>
              <div className="mediaRatioLabel">{t('preview.media.ratio', { ratio: r.label })}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
