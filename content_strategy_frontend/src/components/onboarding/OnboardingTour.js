import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';

const STEP_KEYS = ['workflow', 'topic', 'preview', 'language', 'feedback'];

// PUBLIC_INTERFACE
export default function OnboardingTour({ isOpen, onSkip, onFinish }) {
  /** Guided onboarding tour with localized steps and WCAG-friendly focus + announcements. */
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const liveRef = useRef(null);
  const nextBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) setIdx(0);
  }, [isOpen]);

  const total = STEP_KEYS.length;
  const stepKey = STEP_KEYS[idx];

  const stepTitle = useMemo(() => t(`onboarding.steps.${stepKey}.title`), [t, stepKey]);
  const stepBody = useMemo(() => t(`onboarding.steps.${stepKey}.body`), [t, stepKey]);

  useEffect(() => {
    if (!isOpen) return;
    // Screen reader announcement on step change
    if (liveRef.current) {
      liveRef.current.textContent = t('onboarding.aria.stepAnnounce', {
        current: idx + 1,
        total,
        title: stepTitle
      });
    }
  }, [isOpen, idx, total, stepTitle, t]);

  const canBack = idx > 0;
  const isLast = idx === total - 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      title={t('onboarding.title')}
      describedById="onboarding-desc"
      initialFocusRef={nextBtnRef}
      closeLabel={t('common.closeDialog')}
    >
      <div className="srOnly" aria-live="polite" aria-atomic="true" ref={liveRef} />

      <div style={{ display: 'grid', gap: 12 }} id="onboarding-desc">
        <div className="muted">
          {t('onboarding.stepCounter', { current: idx + 1, total })}
        </div>

        <section className="card" aria-label={stepTitle}>
          <h3 className="h2" style={{ marginBottom: 8 }}>
            {stepTitle}
          </h3>
          <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
            {stepBody}
          </p>
        </section>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={onSkip}>
              {t('onboarding.skip')}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => setIdx((v) => Math.max(0, v - 1))}
              disabled={!canBack}
            >
              {t('onboarding.back')}
            </button>

            {!isLast ? (
              <button
                type="button"
                className="btn btnPrimary"
                ref={nextBtnRef}
                onClick={() => setIdx((v) => Math.min(total - 1, v + 1))}
              >
                {t('onboarding.next')}
              </button>
            ) : (
              <button type="button" className="btn btnPrimary" ref={nextBtnRef} onClick={onFinish}>
                {t('onboarding.finish')}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
