import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CHANNELS, channelConfig } from "../../services/channelConfig";
import {
  formatBytes,
  validateForFacebook,
  validateForWhatsApp,
} from "../../services/channelValidation";

function formatTimeHHMM(date) {
  const d = date instanceof Date ? date : new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function issueToI18nKey(issue) {
  if (issue.code === "text.tooLong") return "preview.validation.textTooLong";
  if (issue.code === "media.unsupportedType")
    return "preview.validation.mediaUnsupportedType";
  if (issue.code === "media.fileTooLarge")
    return "preview.validation.mediaFileTooLarge";
  if (issue.code === "media.aspectRatioRecommended")
    return "preview.validation.mediaAspectRatioRecommended";
  if (issue.code === "video.tooLong") return "preview.validation.videoTooLong";
  return "preview.validation.generic";
}

function issueSuggestionKey(issue) {
  if (issue.code === "text.tooLong")
    return "preview.validation.suggest.shortenText";
  if (issue.code === "media.unsupportedType")
    return "preview.validation.suggest.useSupportedType";
  if (issue.code === "media.fileTooLarge")
    return "preview.validation.suggest.reduceFileSize";
  if (issue.code === "media.aspectRatioRecommended")
    return "preview.validation.suggest.adjustCrop";
  if (issue.code === "video.tooLong")
    return "preview.validation.suggest.trimVideo";
  return "preview.validation.suggest.generic";
}

// PUBLIC_INTERFACE
export default function PreviewPanel({ title, content }) {
  /** Right panel: channel preview fidelity + client-side validation (no backend). */
  const { t } = useTranslation();

  const [channel, setChannel] = useState(content?.channel || CHANNELS.facebook);

  // Placeholder media wiring: the app can pass content.media later (real upload integration).
  // If not provided, keep it null (text-only).
  const previewPayload = useMemo(() => {
    return {
      title: content?.title || "",
      body: content?.body || "",
      media: content?.media ?? null,
    };
  }, [content]);

  // Keep local channel state in sync when upstream changes.
  useEffect(() => {
    if (content?.channel && content.channel !== channel)
      setChannel(content.channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.channel]);

  const validation = useMemo(() => {
    if (channel === CHANNELS.whatsapp)
      return validateForWhatsApp(previewPayload);
    return validateForFacebook(previewPayload);
  }, [channel, previewPayload]);

  const liveRef = useRef(null);

  useEffect(() => {
    if (!liveRef.current) return;

    if (!validation.issues.length) {
      liveRef.current.textContent = t("preview.validation.passed");
      return;
    }

    // Announce a compact summary so SR users get a timely update.
    const errors = validation.issues.filter(
      (i) => i.severity === "error",
    ).length;
    const warnings = validation.issues.filter(
      (i) => i.severity === "warning",
    ).length;
    liveRef.current.textContent = t("preview.validation.summary", {
      errors,
      warnings,
    });
  }, [validation, t]);

  const cfg = channelConfig[channel];
  const maxChars = cfg?.text?.maxChars ?? 0;

  const now = useMemo(() => new Date(), []);
  const timeLabel = useMemo(() => formatTimeHHMM(now), [now]);

  return (
    <section className="card" aria-label={title}>
      <div className="cardHeader">
        <h2 className="h2">{title}</h2>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <div
            className="tabs"
            role="tablist"
            aria-label={t("preview.channelToggleLabel")}
          >
            <button
              type="button"
              className={`tabBtn ${channel === CHANNELS.whatsapp ? "tabBtnActive" : ""}`}
              role="tab"
              aria-selected={channel === CHANNELS.whatsapp ? "true" : "false"}
              onClick={() => setChannel(CHANNELS.whatsapp)}
              aria-label={t("preview.channels.whatsapp")}
              data-testid="channel-whatsapp"
            >
              {t("preview.channels.whatsapp")}
            </button>

            <button
              type="button"
              className={`tabBtn ${channel === CHANNELS.facebook ? "tabBtnActive" : ""}`}
              role="tab"
              aria-selected={channel === CHANNELS.facebook ? "true" : "false"}
              onClick={() => setChannel(CHANNELS.facebook)}
              aria-label={t("preview.channels.facebook")}
              data-testid="channel-facebook"
            >
              {t("preview.channels.facebook")}
            </button>
          </div>

          <span className="badge" aria-label={t("preview.channelLabel")}>
            <span className="badgeDot" aria-hidden="true" />
            {channel.toUpperCase()}
          </span>
        </div>
      </div>

      <div
        className="srOnly"
        aria-live="polite"
        aria-atomic="true"
        ref={liveRef}
      />

      <div style={{ display: "grid", gap: 10 }}>
        <div className="previewMetaRow">
          <div className="muted" style={{ margin: 0 }}>
            {t("preview.characterCount", {
              count: (previewPayload.body || "").length,
              max: maxChars,
            })}
          </div>

          {previewPayload.media ? (
            <div className="muted" style={{ margin: 0 }}>
              {t("preview.mediaLabel", {
                type: previewPayload.media.type,
                mimeType: previewPayload.media.mimeType || "—",
                size: previewPayload.media.fileSizeBytes
                  ? formatBytes(previewPayload.media.fileSizeBytes)
                  : "—",
              })}
            </div>
          ) : (
            <div className="muted" style={{ margin: 0 }}>
              {t("preview.mediaNone")}
            </div>
          )}
        </div>

        <ValidationRegion issues={validation.issues} />

        <div className="previewStage" data-testid="preview-stage">
          {channel === CHANNELS.whatsapp ? (
            <WhatsAppPreview
              message={previewPayload.body}
              timestampLabel={timeLabel}
              media={previewPayload.media}
            />
          ) : (
            <FacebookPreview
              title={previewPayload.title}
              body={previewPayload.body}
              media={previewPayload.media}
            />
          )}
        </div>

        <div className="muted">{t("preview.exportStub")}</div>
      </div>
    </section>
  );
}

function ValidationRegion({ issues }) {
  const { t } = useTranslation();

  const has = issues && issues.length;
  const errors = (issues || []).filter((i) => i.severity === "error");
  const warnings = (issues || []).filter((i) => i.severity === "warning");

  return (
    <section
      className={`validationRegion ${has ? "validationRegionActive" : ""}`}
      aria-label={t("preview.validation.title")}
    >
      <div role="status" aria-live="polite" aria-atomic="false">
        {!has ? (
          <div className="callout" style={{ margin: 0 }}>
            {t("preview.validation.passed")}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {errors.length ? (
              <div className="callout calloutError" style={{ margin: 0 }}>
                <strong>
                  {t("preview.validation.errorsTitle", {
                    count: errors.length,
                  })}
                </strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {errors.map((issue, idx) => (
                    <IssueLine key={`${issue.code}-${idx}`} issue={issue} />
                  ))}
                </ul>
              </div>
            ) : null}

            {warnings.length ? (
              <div className="callout" style={{ margin: 0 }}>
                <strong>
                  {t("preview.validation.warningsTitle", {
                    count: warnings.length,
                  })}
                </strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
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
  if (issue.code === "media.fileTooLarge") {
    params.max = formatBytes(issue.params?.maxBytes);
    params.actual = formatBytes(issue.params?.actualBytes);
  }

  // Provide "supported types" in a user-friendly list when missing.
  if (issue.code === "media.unsupportedType" && !params.supported) {
    params.supported = [
      ...new Set([
        ...cfgWhats.media.supportedMimeTypes,
        ...cfgFb.media.supportedMimeTypes,
      ]),
    ].join(", ");
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
    <div
      className="waShell"
      aria-label={t("preview.whatsapp.ariaLabel")}
      data-testid="wa-preview"
    >
      <div className="waTopBar" aria-hidden="true">
        <div className="waTopDot" />
        <div className="waTopTitle">{t("preview.whatsapp.chatName")}</div>
      </div>

      <div className="waChatArea">
        <div
          className="waBubble"
          aria-label={t("preview.whatsapp.messageLabel")}
        >
          {media ? (
            <MediaFrame channel={CHANNELS.whatsapp} media={media} />
          ) : null}

          <div className="waText" style={{ whiteSpace: "pre-wrap" }}>
            {message || "—"}
          </div>

          <div
            className="waMetaRow"
            aria-label={t("preview.whatsapp.timestampLabel")}
          >
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
    <div
      className="fbShell"
      aria-label={t("preview.facebook.ariaLabel")}
      data-testid="fb-preview"
    >
      <div className="fbCard">
        <div className="fbHeader">
          <div className="fbAvatar" aria-hidden="true" />
          <div className="fbHeaderText">
            <div className="fbPageName">{t("preview.facebook.pageName")}</div>
            <div className="fbSubLine">{t("preview.facebook.sponsored")}</div>
          </div>
        </div>

        <div className="fbBody">
          {title ? (
            <div className="fbTitle" style={{ marginBottom: 6 }}>
              {title}
            </div>
          ) : null}

          <div className="fbText" style={{ whiteSpace: "pre-wrap" }}>
            {body || "—"}
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
  const hasDims = Boolean(
    media?.dimensions?.width && media?.dimensions?.height,
  );

  if (hasDims) {
    return (
      <div className="mediaFrame">
        <div
          className="mediaFrameInner"
          aria-label={t("preview.media.frameLabel")}
        >
          <div className="mediaFrameIcon" aria-hidden="true">
            {media.type === "video" ? "▶" : "▦"}
          </div>
          <div className="mediaFrameMeta">
            <div className="mediaFrameType">
              {media.type === "video"
                ? t("preview.media.video")
                : t("preview.media.image")}
            </div>
            <div className="mediaFrameHint">
              {t("preview.media.dimensions", {
                w: media.dimensions.width,
                h: media.dimensions.height,
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise show recommended aspect ratio placeholders to guide users.
  return (
    <div className="mediaRatioGrid" aria-label={t("preview.media.ratiosLabel")}>
      {ratios.slice(0, 3).map((r) => (
        <div key={r.label} className="mediaRatioItem">
          <div
            className={`mediaRatioBox mediaRatioBox-${r.label.replace(":", "-")}`}
          >
            <div className="mediaRatioOverlay">
              <div className="mediaRatioTitle">
                {media?.type === "video"
                  ? t("preview.media.video")
                  : t("preview.media.image")}
              </div>
              <div className="mediaRatioLabel">
                {t("preview.media.ratio", { ratio: r.label })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
