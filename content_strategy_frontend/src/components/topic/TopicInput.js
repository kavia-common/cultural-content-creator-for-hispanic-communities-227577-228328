import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTopicSuggestionsStub } from '../../services/suggestions';
import { useAppMessages } from '../../state/messages';

// PUBLIC_INTERFACE
export default function TopicInput({ topic, onTopicChange, onConfirmed }) {
  /** Topic input component with validation and suggestion stubs (OpenAI/Meta). */
  const { t } = useTranslation();
  const { pushMessage } = useAppMessages();

  const [touched, setTouched] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);

  const trimmed = (topic || '').trim();

  const validationError = useMemo(() => {
    if (!touched) return '';
    if (trimmed.length < 3) return t('topic.validationTooShort');

    // Lightweight "generic" heuristic (stub; can be replaced later).
    const generic = ['help', 'insurance', 'telemedicine', 'hola', 'hi'];
    if (generic.includes(trimmed.toLowerCase())) return t('topic.validationGeneric');

    return '';
  }, [touched, trimmed, t]);

  const canConfirm = trimmed.length >= 3 && !validationError;

  const handleConfirm = () => {
    setTouched(true);
    if (!canConfirm) {
      pushMessage({ kind: 'error', messageKey: 'topic.validationTooShort', live: 'assertive' });
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
        pushMessage({ kind: 'info', messageKey: 'messages.integrationUnavailable' });
      }
    } catch (e) {
      pushMessage({ kind: 'error', messageKey: 'messages.integrationUnavailable', live: 'assertive' });
    } finally {
      setSuggestionsBusy(false);
    }
  };

  return (
    <section className="card" aria-label={t('topic.title')}>
      <div className="cardHeader">
        <h2 className="h2">{t('topic.title')}</h2>
        <button type="button" className="btn btnPrimary" onClick={handleConfirm} disabled={!canConfirm}>
          {t('topic.confirm')}
        </button>
      </div>

      <label className="srOnly" htmlFor="topic-input">
        {t('topic.label')}
      </label>

      <div className="fieldRow">
        <div>
          <input
            id="topic-input"
            className="input"
            value={topic}
            placeholder={t('topic.placeholder')}
            onChange={(e) => onTopicChange?.(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={Boolean(validationError)}
            aria-describedby="topic-help topic-error"
          />
          <div id="topic-help" className="fieldHelp">
            {t('topic.help')}
          </div>
          {validationError ? (
            <div id="topic-error" className="fieldHelp" style={{ color: 'rgba(239, 68, 68, 0.95)' }}>
              {validationError}
            </div>
          ) : (
            <div id="topic-error" className="srOnly" />
          )}
        </div>

        <button
          type="button"
          className="btn btnSecondary"
          onClick={handleSuggestions}
          disabled={suggestionsBusy || trimmed.length < 3}
          aria-busy={suggestionsBusy ? 'true' : 'false'}
        >
          {t('topic.fetchSuggestions')}
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 8 }}>
          {t('topic.suggestionsTitle')}
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
