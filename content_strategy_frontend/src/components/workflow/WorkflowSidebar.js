import React from "react";
import { useTranslation } from "react-i18next";

// PUBLIC_INTERFACE
export default function WorkflowSidebar({ title, items, onSelectRole }) {
  /** Accessible workflow visualization component with current/complete/upcoming states. */
  const { t } = useTranslation();

  return (
    <nav aria-label={title} className="card">
      <div className="cardHeader">
        <h2 className="h2">{title}</h2>
        <span className="badge" aria-label={t("panels.workflow")}>
          <span className="badgeDot" aria-hidden="true" />
          {items.length}
        </span>
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: 10,
        }}
      >
        {items.map((item) => {
          const label = t(`workflow.roles.${item.role}.label`);
          const description = t(`workflow.roles.${item.role}.description`);
          const stateLabel = t(`workflow.states.${item.state}`);

          const badgeClass =
            item.state === "current"
              ? "badge badgeCurrent"
              : item.state === "complete"
                ? "badge badgeComplete"
                : "badge badgeUpcoming";

          const tooltipId = `role-tip-${item.role}`;

          return (
            <li key={item.role}>
              <button
                type="button"
                className="btn"
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "grid",
                  gap: 6,
                  padding: 12,
                  borderRadius: 12,
                }}
                onClick={() => onSelectRole?.(item.role)}
                aria-current={item.state === "current" ? "step" : undefined}
                aria-describedby={tooltipId}
                title={description}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <strong>{label}</strong>
                  <span className={badgeClass}>
                    <span className="badgeDot" aria-hidden="true" />
                    {stateLabel}
                  </span>
                </div>
                <span id={tooltipId} className="muted" style={{ fontSize: "0.9rem" }}>
                  {description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
