import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppMessages } from '../../state/messages';

function kindToClass(kind) {
  if (kind === 'error') return 'callout calloutError';
  return 'callout';
}

// PUBLIC_INTERFACE
export default function FeedbackRegion() {
  /** Accessible feedback region for errors/success/info with localized content. */
  const { messages } = useAppMessages();
  const { t } = useTranslation();

  if (!messages.length) return null;

  // We keep one live region; newest message gets announced.
  const newest = messages[0];

  return (
    <section aria-label="Feedback">
      <div className="srOnly" aria-live={newest.live} aria-atomic="true">
        {t(newest.messageKey, newest.params)}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {messages.map((m) => (
          <div key={m.id} className={kindToClass(m.kind)} role="status">
            {t(m.messageKey, m.params)}
          </div>
        ))}
      </div>
    </section>
  );
}
