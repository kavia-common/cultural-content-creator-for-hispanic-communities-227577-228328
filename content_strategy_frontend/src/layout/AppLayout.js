import React from "react";
import FeedbackRegion from "../components/feedback/FeedbackRegion";

// PUBLIC_INTERFACE
export default function AppLayout({
  appTitle,
  appSubtitle,
  languageLabel,
  languageValue,
  onToggleLanguage,
  helpLabel,
  onOpenHelp,
  onOpenOnboarding,
  children,
}) {
  /** Global app layout: header + 3-column panel grid with feedback region. */
  return (
    <div className="appShell">
      <header className="appHeader">
        <div className="headerLeft">
          <h1 className="h1">{appTitle}</h1>
          <p className="muted">{appSubtitle}</p>
        </div>

        <div className="headerActions">
          <button
            type="button"
            className="btn"
            onClick={onToggleLanguage}
            aria-label={languageLabel}
            data-testid="lang-toggle"
          >
            {languageValue}
          </button>

          <button
            type="button"
            className="btn"
            onClick={onOpenHelp}
            aria-label={helpLabel}
            title={helpLabel}
            data-testid="help-open"
          >
            ?
          </button>

          <button
            type="button"
            className="btn"
            onClick={onOpenOnboarding}
            data-testid="onboarding-open"
          >
            {/** intentionally short, label via i18n in App */}i
          </button>
        </div>
      </header>

      <FeedbackRegion />

      <main className="grid">{children}</main>
    </div>
  );
}

function Panel({ className, ariaLabel, children }) {
  return (
    <section className={`panel ${className || ""}`} aria-label={ariaLabel}>
      {children}
    </section>
  );
}

AppLayout.LeftPanel = function LeftPanel({ ariaLabel, children }) {
  return (
    <Panel className="panelLeft" ariaLabel={ariaLabel} children={children} />
  );
};

AppLayout.CenterPanel = function CenterPanel({ ariaLabel, children }) {
  return (
    <Panel className="panelCenter" ariaLabel={ariaLabel} children={children} />
  );
};

AppLayout.RightPanel = function RightPanel({ ariaLabel, children }) {
  return (
    <Panel className="panelRight" ariaLabel={ariaLabel} children={children} />
  );
};
