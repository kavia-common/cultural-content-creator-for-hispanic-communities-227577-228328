import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getTopicSuggestionsStub } from "../../services/suggestions";
import { useAppMessages } from "../../state/messages";

const NICHES = [
  "telemedicine",
  "lifeInsurance",
  "finalExpenses",
  "funeralAssistance",
];
const EMOTIONS = ["calm", "security", "luxury", "closeness"];

// PUBLIC_INTERFACE
export default function TopicInput({
  topic,
  onTopicChange,
  onConfirmed,
  onGenerateCaptions,
  captionsBusy,
}) {
  /** Topic input component with validation, suggestion stubs, and caption generation trigger. */
  const { t, i18n } = useTranslation();
  const { pushMessage } = useAppMessages();

  const [touched, setTouched] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);

  const [niche, setNiche] = useState("telemedicine");
  const [emotion, setEmotion] = useState("closeness");

  const trimmed = (topic || "").trim();

  const validationError = useMemo(() => {
    if (!touched) return "";
    if (trimmed.length < 3) return t("topic.validationTooShort");

    // Lightweight "generic" heuristic (stub; can be replaced later).
    const generic = ["help", "insurance", "telemedicine", "hola", "hi"];
    if (generic.includes(trimmed.toLowerCase()))
      return t("topic.validationGeneric");

    return "";
  }, [touched, trimmed, t]);

  const canConfirm = trimmed.length >= 3 && !validationError;
  const canGenerate = canConfirm && !captionsBusy;

  const handleConfirm = () => {
    setTouched(true);
    if (!canConfirm) {
      pushMessage({
        kind: "error",
        messageKey: "topic.validationTooShort",
        live: "assertive",
      });
      return;
    }
    onConfirmed?.(trimmed);
  };

  const handleSuggestions = async () => {
    setSuggestionsBusy(true);
    try {
      const items = await getTopicSuggestionsStub(trimmed);
      setSuggestions(items);
      if (!items.length) {
        pushMessage({
          kind: "info",
          messageKey: "messages.integrationUnavailable",
        });
      }
    } catch (e) {
      pushMessage({
        kind: "error",
        messageKey: "messages.integrationUnavailable",
        live: "assertive",
      });
    } finally {
      setSuggestionsBusy(false);
    }
  };

  const handleGenerateCaptions = () => {
    setTouched(true);
    if (!canConfirm) {
      pushMessage({
        kind: "error",
        messageKey: "topic.validationTooShort",
        live: "assertive",
      });
      return;
    }
    onGenerateCaptions?.({
      topic: trimmed,
      niche,
      emotion,
      language: i18n.language === "es" ? "es" : "en",
    });
  };

  return (
    <section className="card" aria-label={t("topic.title")}>
      <div className="cardHeader">
        <h2 className="h2">{t("topic.title")}</h2>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="btn btnPrimary"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {t("topic.confirm")}
          </button>

          <button
            type="button"
            className="btn btnSecondary"
            onClick={handleGenerateCaptions}
            disabled={!canGenerate}
            aria-busy={captionsBusy ? "true" : "false"}
          >
            {captionsBusy
              ? t("topic.generatingCaptions")
              : t("topic.generateCaptions")}
          </button>
        </div>
      </div>

      <label className="srOnly" htmlFor="topic-input">
        {t("topic.label")}
      </label>

      <div className="fieldRow">
        <div>
          <input
            id="topic-input"
            className="input"
            value={topic}
            placeholder={t("topic.placeholder")}
            onChange={(e) => onTopicChange?.(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={Boolean(validationError)}
            aria-describedby="topic-help topic-error"
          />
          <div id="topic-help" className="fieldHelp">
            {t("topic.help")}
          </div>
          {validationError ? (
            <div
              id="topic-error"
              className="fieldHelp"
              style={{ color: "rgba(239, 68, 68, 0.95)" }}
            >
              {validationError}
            </div>
          ) : (
            <div id="topic-error" className="srOnly" />
          )}
        </div>

        <button
          type="button"
          className="btn"
          onClick={handleSuggestions}
          disabled={suggestionsBusy || trimmed.length < 3}
          aria-busy={suggestionsBusy ? "true" : "false"}
        >
          {t("topic.fetchSuggestions")}
        </button>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <div className="twoColRow">
          <div>
            <label
              className="fieldHelp"
              htmlFor="topic-niche"
              style={{ fontWeight: 800 }}
            >
              {t("topic.nicheLabel")}
            </label>
            <select
              id="topic-niche"
              className="select"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              aria-label={t("topic.nicheLabel")}
            >
              {NICHES.map((key) => (
                <option key={key} value={key}>
                  {t(`topic.niches.${key}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="fieldHelp"
              htmlFor="topic-emotion"
              style={{ fontWeight: 800 }}
            >
              {t("topic.emotionLabel")}
            </label>
            <select
              id="topic-emotion"
              className="select"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              aria-label={t("topic.emotionLabel")}
            >
              {EMOTIONS.map((key) => (
                <option key={key} value={key}>
                  {t(`topic.emotions.${key}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 8 }}>
          {t("topic.suggestionsTitle")}
        </div>

        {suggestions.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: 8 }}
                  onClick={() => onTopicChange?.(s)}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            —
          </p>
        )}
      </div>
    </section>
  );
}
