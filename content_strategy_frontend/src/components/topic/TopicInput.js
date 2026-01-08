import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTopicSuggestions } from '../../services/suggestions';
import { useAppMessages } from '../../state/messages';

const NICHES = ['telemedicine', 'lifeInsurance', 'finalExpenses', 'funeralAssistance'];
const EMOTIONS = ['calm', 'security', 'luxury', 'closeness'];

// PUBLIC_INTERFACE
export default function TopicInput({
  topic,
  onTopicChange,
  onConfirmed,
  onContextChange,
  onGenerate, // ({ kind: 'captions'|'scripts'|'outlines'|'all', topic, niche, emotion, language })
  busy = {} // { captions?:bool, scripts?:bool, outlines?:bool, all?:bool }
}) {
  /** Topic input component with validation, OpenAI-backed suggestions, and multi-artifact generation triggers. */
  const { t, i18n } = useTranslation();
  const { pushMessage } = useAppMessages();

  const [touched, setTouched] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);

  const [niche, setNiche] = useState('telemedicine');
  const [emotion, setEmotion] = useState('closeness');

  const trimmed = (topic || '').trim();

  useEffect(() => {
    onContextChange?.({ niche, emotion });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche, emotion]);

  const validationError = useMemo(() => {
    if (!touched) return '';
    if (trimmed.length < 3) return t('topic.validationTooShort');

    // Lightweight generic heuristic.
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
    onConfirmed?.(trimmed, { niche, emotion, language: i18n.language === 'es' ? 'es' : 'en' });
  };

  const handleSuggestions = async () => {
    setSuggestionsBusy(true);
    try {
      const items = await getTopicSuggestions(trimmed, i18n.language === 'es' ? 'es' : 'en');
      setSuggestions(items);
      if (!items.length) {
        pushMessage({ kind: 'info', messageKey: 'topic.noSuggestions' });
      }
    } catch (e) {
      pushMessage({ kind: 'error', messageKey: 'topic.suggestionsError', live: 'assertive' });
    } finally {
      setSuggestionsBusy(false);
    }
  };

  const handleGenerate = (kind) => {
    setTouched(true);
    if (!canConfirm) {
      pushMessage({ kind: 'error', messageKey: 'topic.validationTooShort', live: 'assertive' });
      return;
    }
    onGenerate?.({
      kind,
      topic: trimmed,
      niche,
      emotion,
      language: i18n.language === 'es' ? 'es' : 'en'
    });
  };

  return (
    <section className="card" aria-label={t('topic.title')}>
      <div className="cardHeader">
        <h2 className="h2">{t('topic.title')}</h2>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btnPrimary" onClick={handleConfirm} disabled={!canConfirm}>
            {t('topic.confirm')}
          </button>

          <button
            type="button"
            className="btn btnSecondary"
            onClick={() => handleGenerate('all')}
            disabled={!canConfirm || busy.all}
            aria-busy={busy.all ? 'true' : 'false'}
            data-testid="generate-all"
          >
            {busy.all ? t('topic.generatingAll') : t('topic.generateAll')}
          </button>
        </div>
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
          className="btn"
          onClick={handleSuggestions}
          disabled={suggestionsBusy || trimmed.length < 3}
          aria-busy={suggestionsBusy ? 'true' : 'false'}
        >
          {t('topic.fetchSuggestions')}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        <div className="twoColRow">
          <div>
            <label className="fieldHelp" htmlFor="topic-niche" style={{ fontWeight: 800 }}>
              {t('topic.nicheLabel')}
            </label>
            <select
              id="topic-niche"
              className="select"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              aria-label={t('topic.nicheLabel')}
            >
              {NICHES.map((key) => (
                <option key={key} value={key}>
                  {t(`topic.niches.${key}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="fieldHelp" htmlFor="topic-emotion" style={{ fontWeight: 800 }}>
              {t('topic.emotionLabel')}
            </label>
            <select
              id="topic-emotion"
              className="select"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              aria-label={t('topic.emotionLabel')}
            >
              {EMOTIONS.map((key) => (
                <option key={key} value={key}>
                  {t(`topic.emotions.${key}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label={t('topic.generateSectionLabel')}>
          <button
            type="button"
            className="btn btnSecondary"
            onClick={() => handleGenerate('captions')}
            disabled={!canConfirm || busy.captions}
            aria-busy={busy.captions ? 'true' : 'false'}
            data-testid="generate-captions"
          >
            {busy.captions ? t('topic.generatingCaptions') : t('topic.generateCaptions')}
          </button>

          <button
            type="button"
            className="btn btnSecondary"
            onClick={() => handleGenerate('scripts')}
            disabled={!canConfirm || busy.scripts}
            aria-busy={busy.scripts ? 'true' : 'false'}
            data-testid="generate-scripts"
          >
            {busy.scripts ? t('topic.generatingScripts') : t('topic.generateScripts')}
          </button>

          <button
            type="button"
            className="btn btnSecondary"
            onClick={() => handleGenerate('outlines')}
            disabled={!canConfirm || busy.outlines}
            aria-busy={busy.outlines ? 'true' : 'false'}
            data-testid="generate-outlines"
          >
            {busy.outlines ? t('topic.generatingOutlines') : t('topic.generateOutlines')}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="muted" style={{ fontWeight: 800, marginBottom: 8 }}>
          {t('topic.suggestionsTitle')}
        </div>

        {suggestions.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {suggestions.map((s) => (
              <li key={s}>
                <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => onTopicChange?.(s)}>
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
