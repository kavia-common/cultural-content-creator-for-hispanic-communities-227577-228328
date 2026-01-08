import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../common/Modal";

const SECTIONS = [
  "gettingStarted",
  "topicInput",
  "workflow",
  "previewExport",
  "accessibility",
];

// PUBLIC_INTERFACE
export default function HelpCenter({ isOpen, onClose, onOpenOnboarding }) {
  /** Help Center modal with localized sections and accessible navigation. */
  const { t } = useTranslation();
  const [active, setActive] = useState("gettingStarted");

  const title = t("helpCenter.title");

  const sectionTitle = useMemo(
    () => t(`helpCenter.sections.${active}.title`),
    [t, active],
  );
  const sectionBody = useMemo(
    () => t(`helpCenter.sections.${active}.body`),
    [t, active],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: "grid", gap: 12 }}>
        <div
          className="tabs"
          role="tablist"
          aria-label={t("helpCenter.tabsLabel")}
        >
          {SECTIONS.map((key) => {
            const selected = key === active;
            return (
              <button
                key={key}
                type="button"
                className={`tabBtn ${selected ? "tabBtnActive" : ""}`}
                role="tab"
                aria-selected={selected ? "true" : "false"}
                onClick={() => setActive(key)}
              >
                {t(`helpCenter.sections.${key}.short`)}
              </button>
            );
          })}
        </div>

        <section className="card" aria-label={sectionTitle}>
          <h3 className="h2" style={{ marginBottom: 8 }}>
            {sectionTitle}
          </h3>
          <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
            {sectionBody}
          </p>
        </section>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btnSecondary"
            onClick={onOpenOnboarding}
          >
            {t("helpCenter.openOnboarding")}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            {t("helpCenter.close")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
