import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../common/Modal";
import {
  getOpenAIKeySource,
  setOpenAIKeyForSession,
} from "../../services/openaiCaptions";

// PUBLIC_INTERFACE
export default function SettingsModal({ isOpen, onClose }) {
  /** Settings modal for temporary, in-memory API keys (OpenAI). */
  const { t } = useTranslation();
  const inputRef = useRef(null);

  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSaved(false);
    setApiKey("");
  }, [isOpen]);

  const source = useMemo(() => getOpenAIKeySource(), [isOpen, saved]);

  const sourceLabel = useMemo(() => {
    if (source === "env") return t("settings.openai.keySourceEnv");
    if (source === "memory") return t("settings.openai.keySourceMemory");
    return t("settings.openai.keySourceNone");
  }, [source, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("settings.title")}
      describedById="settings-desc"
      initialFocusRef={inputRef}
    >
      <div id="settings-desc" className="srOnly">
        {t("settings.description")}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <section className="card" aria-label={t("settings.openai.title")}>
          <div className="cardHeader">
            <h3 className="h2">{t("settings.openai.title")}</h3>
            <span className="badge" aria-label={t("settings.openai.keySourceLabel")}>
              <span className="badgeDot" aria-hidden="true" />
              {sourceLabel}
            </span>
          </div>

          <label
            htmlFor="openai-key"
            className="fieldHelp"
            style={{ fontWeight: 800 }}
          >
            {t("settings.openai.keyLabel")}
          </label>

          <input
            id="openai-key"
            ref={inputRef}
            className="input"
            value={apiKey}
            placeholder={t("settings.openai.keyPlaceholder")}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
            spellCheck="false"
            inputMode="text"
          />

          <div className="fieldHelp" style={{ marginTop: 8 }}>
            {t("settings.openai.keyHelp")}
          </div>

          <div className="srOnly" aria-live="polite" aria-atomic="true">
            {/* Screen reader feedback when saved. */}
            {saved ? t("settings.openai.saved") : ""}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btnPrimary"
              onClick={() => {
                setOpenAIKeyForSession(apiKey);
                setSaved(true);
              }}
              disabled={!apiKey.trim()}
            >
              {t("settings.openai.save")}
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => {
                setOpenAIKeyForSession("");
                setApiKey("");
                setSaved(true);
              }}
            >
              {t("settings.openai.clear")}
            </button>
          </div>
        </section>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button type="button" className="btn" onClick={onClose}>
            {t("settings.close")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
