import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from './layout/AppLayout';
import WorkflowSidebar from './components/workflow/WorkflowSidebar';
import TopicInput from './components/topic/TopicInput';
import PreviewPanel from './components/preview/PreviewPanel';
import {
  WorkflowRole,
  WORKFLOW_ROLES,
  getNextWorkflowRole
} from './domain/workflow';
import { AppMessageProvider, useAppMessages } from './state/messages';
import useOnboardingState from './hooks/useOnboardingState';
import useHelpCenter from './hooks/useHelpCenter';
import OnboardingTour from './components/onboarding/OnboardingTour';
import HelpCenter from './components/help/HelpCenter';
import HelpTooltip from './components/help/HelpTooltip';

function MainApp() {
  const { t, i18n } = useTranslation();
  const { pushMessage } = useAppMessages();

  const onboarding = useOnboardingState();
  const help = useHelpCenter();

  const [topic, setTopic] = useState('');
  const [currentRole, setCurrentRole] = useState(WorkflowRole.Strategist);
  const [completedRoles, setCompletedRoles] = useState(() => new Set());
  const [previewContent, setPreviewContent] = useState({
    title: '',
    body: '',
    channel: 'facebook'
  });

  const workflowStates = useMemo(() => {
    return WORKFLOW_ROLES.map((role) => {
      if (completedRoles.has(role)) return { role, state: 'complete' };
      if (role === currentRole) return { role, state: 'current' };
      return { role, state: 'upcoming' };
    });
  }, [completedRoles, currentRole]);

  const handleLanguageToggle = () => {
    const next = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(next);
    pushMessage({
      kind: 'info',
      messageKey: 'messages.languageChanged',
      live: 'polite'
    });
  };

  const handleAdvanceWorkflow = () => {
    // Minimal stub for now: advance through virtual team roles.
    setCompletedRoles((prev) => {
      const next = new Set(prev);
      next.add(currentRole);
      return next;
    });

    const nextRole = getNextWorkflowRole(currentRole);
    if (!nextRole) {
      pushMessage({ kind: 'success', messageKey: 'messages.workflowComplete' });
      return;
    }
    setCurrentRole(nextRole);
    pushMessage({
      kind: 'info',
      messageKey: 'messages.workflowAdvanced',
      params: { role: t(`workflow.roles.${nextRole}.label`) },
      live: 'polite'
    });
  };

  return (
    <>
      <AppLayout
        appTitle={t('app.title')}
        appSubtitle={t('app.subtitle')}
        languageLabel={t('app.language')}
        languageValue={i18n.language === 'es' ? 'ES' : 'EN'}
        onToggleLanguage={handleLanguageToggle}
        helpLabel={t('helpCenter.open')}
        onOpenHelp={help.open}
        onOpenOnboarding={onboarding.open}
      >
        <AppLayout.LeftPanel ariaLabel={t('panels.workflow')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span className="srOnly">{t('help.inline.workflow')}</span>
            <HelpTooltip label={t('help.inline.openLabel')}>{t('help.inline.workflow')}</HelpTooltip>
          </div>

          <WorkflowSidebar
            title={t('workflow.title')}
            items={workflowStates}
            onSelectRole={(role) => {
              // Read-only for now; later could open stage review modal.
              pushMessage({
                kind: 'info',
                messageKey: 'messages.roleSelected',
                params: { role: t(`workflow.roles.${role}.label`) },
                live: 'polite'
              });
            }}
          />
        </AppLayout.LeftPanel>

        <AppLayout.CenterPanel ariaLabel={t('panels.create')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <HelpTooltip label={t('help.inline.openLabel')}>{t('help.inline.topic')}</HelpTooltip>
          </div>

          <TopicInput
            topic={topic}
            onTopicChange={setTopic}
            onConfirmed={(confirmedTopic) => {
              setTopic(confirmedTopic);
              setPreviewContent({
                title: t('preview.placeholderTitle', { topic: confirmedTopic }),
                body: t('preview.placeholderBody'),
                channel: 'facebook'
              });
              pushMessage({ kind: 'success', messageKey: 'messages.topicConfirmed' });
            }}
          />

          <section className="card" aria-label={t('workflow.progressTitle')}>
            <div className="cardHeader">
              <h2 className="h2">{t('workflow.progressTitle')}</h2>
              <button type="button" className="btn btnPrimary" onClick={handleAdvanceWorkflow}>
                {t('workflow.advance')}
              </button>
            </div>

            <p className="muted">
              {t('workflow.currentStep', {
                role: t(`workflow.roles.${currentRole}.label`)
              })}
            </p>
          </section>
        </AppLayout.CenterPanel>

        <AppLayout.RightPanel ariaLabel={t('panels.preview')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <HelpTooltip label={t('help.inline.openLabel')}>{t('help.inline.preview')}</HelpTooltip>
          </div>

          <PreviewPanel title={t('preview.title')} content={previewContent} />
        </AppLayout.RightPanel>
      </AppLayout>

      <OnboardingTour
        isOpen={onboarding.isOpen}
        onSkip={onboarding.close}
        onFinish={() => {
          onboarding.finish();
          pushMessage({ kind: 'success', messageKey: 'messages.onboardingComplete' });
        }}
      />

      <HelpCenter
        isOpen={help.isOpen}
        onClose={help.close}
        onOpenOnboarding={() => {
          help.close();
          onboarding.open();
        }}
      />
    </>
  );
}

// PUBLIC_INTERFACE
export default function App() {
  /** Root app component with global providers (messages, etc.). */
  return (
    <AppMessageProvider>
      <MainApp />
    </AppMessageProvider>
  );
}
