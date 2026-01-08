import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useArtifacts } from '../../state/artifacts';
import { useAppMessages } from '../../state/messages';
import { generateEngagementElements, generatePredictiveSuggestions } from '../../services/openaiContent';

// PUBLIC_INTERFACE
export default function EngagementPanel({ title }) {
  /** Panel for audience engagement elements + predictive segments/tweaks (client-side, OpenAI optional). */
  const { t, i18n } = useTranslation();
  const { pushMessage } = useAppMessages();
  const { state, actions } = useArtifacts();

  const [busy, setBusy] = useState(false);

  const contextOk = Boolean((state.context?.topic || '').trim().length >= 3);

  const sampleText = useMemo(() => {
    const captionShort = state.captions?.items?.find((i) => i.variationType === 'short')?.text || '';
    const scriptShort = state.scripts?.items?.find((i) => i.variationType === 'short')?.text || '';
    return captionShort || scriptShort || state.context?.topic || '';
  }, [state]);

  const runGenerate = async () => {
    if (!contextOk) {
      pushMessage({ kind: 'error', messageKey: 'engagement.errors.needTopic', live: 'assertive' });
      return;
    }

    setBusy(true);
    try {
      const language = i18n.language === 'es' ? 'es' : 'en';

      const [eng, pred] = await Promise.all([
        generateEngagementElements({
          topic: state.context.topic,
          niche: state.context.niche,
          emotion: state.context.emotion,
          language
        }),
        generatePredictiveSuggestions({
          topic: state.context.topic,
          niche: state.context.niche,
          emotion: state.context.emotion,
          language,
          contentSample: sampleText
        })
      ]);

      if (eng.ok) actions.setEngagement(eng.data);
      if (pred.ok) actions.setPredictive(pred.data);

      if (!eng.ok || !pred.ok) {
        pushMessage({ kind: 'error', messageKey: 'engagement.errors.partial', live: 'assertive' });
      } else {
        pushMessage({ kind: 'success', messageKey: 'engagement.messages.generated', live: 'polite' });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-label={title || t('engagement.title')} data-testid="engagement-panel">
      <div className="cardHeader">
        <h2 className="h2">{title || t('engagement.title')}</h2>

        <button
          type="button"
          className="btn btnSecondary"
          onClick={runGenerate}
          disabled={!contextOk || busy}
          aria-disabled={!contextOk || busy ? 'true' : 'false'}
          aria-busy={busy ? 'true' : 'false'}
          data-testid="engagement-generate"
        >
          {busy ? t('engagement.generating') : t('engagement.generate')}
        </button>
      </div>

      <div className="muted" style={{ marginTop: 0 }}>
        {t('engagement.helper')}
      </div>

      <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
        <div className="twoColRow">
          <div>
            <label className="fieldHelp" htmlFor="eng-survey" style={{ fontWeight: 800 }}>
              {t('engagement.survey')}
            </label>
            <input
              id="eng-survey"
              className="input"
              value={state.engagement?.survey || ''}
              onChange={(e) => actions.setEngagement({ survey: e.target.value })}
              placeholder={t('engagement.surveyPh')}
            />
          </div>

          <div>
            <label className="fieldHelp" htmlFor="eng-open" style={{ fontWeight: 800 }}>
              {t('engagement.openQuestion')}
            </label>
            <input
              id="eng-open"
              className="input"
              value={state.engagement?.openQuestion || ''}
              onChange={(e) => actions.setEngagement({ openQuestion: e.target.value })}
              placeholder={t('engagement.openQuestionPh')}
            />
          </div>
        </div>

        <div>
          <label className="fieldHelp" htmlFor="eng-challenge" style={{ fontWeight: 800 }}>
            {t('engagement.challenge')}
          </label>
          <input
            id="eng-challenge"
            className="input"
            value={state.engagement?.challenge || ''}
            onChange={(e) => actions.setEngagement({ challenge: e.target.value })}
            placeholder={t('engagement.challengePh')}
          />
        </div>

        <div className="card" aria-label={t('engagement.predictiveTitle')}>
          <div className="muted" style={{ fontWeight: 800, marginBottom: 8 }}>
            {t('engagement.predictiveTitle')}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>
                {t('engagement.segments')}
              </div>
              {(state.predictive?.segments || []).length ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {state.predictive.segments.slice(0, 8).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : (
                <div className="muted">—</div>
              )}
            </div>

            <div>
              <div className="muted" style={{ fontWeight: 800, marginBottom: 6 }}>
                {t('engagement.tweaks')}
              </div>
              {(state.predictive?.tweaks || []).length ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {state.predictive.tweaks.slice(0, 6).map((tw) => (
                    <li key={tw.id}>
                      <strong>{tw.title}:</strong> {tw.suggestion}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="muted">—</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
