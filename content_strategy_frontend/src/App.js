import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from './layout/AppLayout';
import WorkflowSidebar from './components/workflow/WorkflowSidebar';
import TopicInput from './components/topic/TopicInput';
import PreviewPanel from './components/preview/PreviewPanel';
import SettingsModal from './components/settings/SettingsModal';
import { AppMessageProvider, useAppMessages } from './state/messages';
import useOnboardingState from './hooks/useOnboardingState';
import useHelpCenter from './hooks/useHelpCenter';
import OnboardingTour from './components/onboarding/OnboardingTour';
import HelpCenter from './components/help/HelpCenter';
import HelpTooltip from './components/help/HelpTooltip';
import WorkflowProgressPanel from './components/workflow/WorkflowProgressPanel';
import { WorkflowProvider, getWorkflowRoleUiStateFromSteps, useWorkflow } from './state/workflow';
import { ArtifactsProvider, useArtifacts } from './state/artifacts';
import { generateCaptions } from './services/openaiCaptions';
import { generateMicroreelScripts, generateSilentVideoOutlines } from './services/openaiContent';
import ArtifactsWorkspace from './components/artifacts/ArtifactsWorkspace';
import EngagementPanel from './components/engagement/EngagementPanel';
import AuditTrailModal from './components/audit/AuditTrailModal';

function MainApp() {
  const { t, i18n } = useTranslation();
  const { pushMessage } = useAppMessages();

  const onboarding = useOnboardingState();
  const help = useHelpCenter();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const [topic, setTopic] = useState('');
  const artifactId = useMemo(() => (topic || 'default').trim().toLowerCase() || 'default', [topic]);

  const handleLanguageToggle = () => {
    const next = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(next);
    pushMessage({
      kind: 'info',
      messageKey: 'messages.languageChanged',
      live: 'polite'
    });
  };

  return (
    <ArtifactsProvider key={`artifacts-${artifactId}`} artifactId={artifactId}>
      <WorkflowProvider key={`workflow-${artifactId}`} artifactId={artifactId}>
        <MainAppBody
          t={t}
          i18n={i18n}
          pushMessage={pushMessage}
          onboarding={onboarding}
          help={help}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          auditOpen={auditOpen}
          setAuditOpen={setAuditOpen}
          topic={topic}
          setTopic={setTopic}
          artifactId={artifactId}
          handleLanguageToggle={handleLanguageToggle}
        />
      </WorkflowProvider>
    </ArtifactsProvider>
  );
}

function MainAppBody({
  t,
  i18n,
  pushMessage,
  onboarding,
  help,
  settingsOpen,
  setSettingsOpen,
  auditOpen,
  setAuditOpen,
  topic,
  setTopic,
  artifactId,
  handleLanguageToggle
}) {
  const { state: workflowState } = useWorkflow();
  const { state: artifactsState, actions: artifactsActions } = useArtifacts();

  const workflowSidebarItems = useMemo(() => {
    return getWorkflowRoleUiStateFromSteps({
      steps: workflowState.steps,
      currentStepId: workflowState.currentStepId
    });
  }, [workflowState.steps, workflowState.currentStepId]);

  const [busy, setBusy] = useState({ captions: false, scripts: false, outlines: false, all: false });

  const handleConfirmed = (confirmedTopic, ctx) => {
    setTopic(confirmedTopic);
    artifactsActions.setContext({
      topic: confirmedTopic,
      niche: ctx?.niche || artifactsState.context?.niche,
      emotion: ctx?.emotion || artifactsState.context?.emotion,
      language: ctx?.language || (i18n.language === 'es' ? 'es' : 'en')
    });

    pushMessage({ kind: 'success', messageKey: 'messages.topicConfirmed', live: 'polite' });
  };

  const handleGenerate = async ({ kind, topic: topicValue, niche, emotion, language }) => {
    const lang = language || (i18n.language === 'es' ? 'es' : 'en');
    artifactsActions.setContext({ topic: topicValue, niche, emotion, language: lang });

    const setKindBusy = (k, value) =>
      setBusy((prev) => ({
        ...prev,
        [k]: value
      }));

    const missingKeyHint = () => {
      pushMessage({ kind: 'error', messageKey: 'openai.errors.missingKey', live: 'assertive' });
      pushMessage({ kind: 'info', messageKey: 'openai.errors.missingKeyHint', live: 'polite' });
    };

    if (kind === 'all') setKindBusy('all', true);
    else setKindBusy(kind, true);

    try {
      if (kind === 'captions' || kind === 'all') {
        const res = await generateCaptions({ topic: topicValue, niche, emotion, language: lang });
        if (res.ok) {
          artifactsActions.setCaptionsFromGeneration({ captions: res.data.captions, language: lang, emotion });
          pushMessage({ kind: 'success', messageKey: 'captions.messages.generated', live: 'polite' });
        } else if (res.errorKey === 'captions.errors.missingKey') {
          missingKeyHint();
        } else {
          pushMessage({ kind: 'error', messageKey: res.errorKey || 'captions.errors.generic', live: 'assertive' });
        }
      }

      if (kind === 'scripts' || kind === 'all') {
        const res = await generateMicroreelScripts({ topic: topicValue, niche, emotion, language: lang });
        if (res.ok) {
          artifactsActions.setScriptsFromGeneration({ scripts: res.data.scripts, language: lang, emotion });
          pushMessage({ kind: 'success', messageKey: 'scripts.messages.generated', live: 'polite' });
        } else if (res.errorKey === 'openai.errors.missingKey') {
          missingKeyHint();
        } else {
          pushMessage({ kind: 'error', messageKey: res.errorKey || 'openai.errors.generic', live: 'assertive' });
        }
      }

      if (kind === 'outlines' || kind === 'all') {
        const res = await generateSilentVideoOutlines({ topic: topicValue, niche, emotion, language: lang });
        if (res.ok) {
          artifactsActions.setOutlinesFromGeneration({ outlines: res.data.outlines, language: lang, emotion });
          pushMessage({ kind: 'success', messageKey: 'outlines.messages.generated', live: 'polite' });
        } else if (res.errorKey === 'openai.errors.missingKey') {
          missingKeyHint();
        } else {
          pushMessage({ kind: 'error', messageKey: res.errorKey || 'openai.errors.generic', live: 'assertive' });
        }
      }
    } finally {
      if (kind === 'all') setKindBusy('all', false);
      else setKindBusy(kind, false);
    }
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
            items={workflowSidebarItems}
            onSelectRole={(role) => {
              pushMessage({
                kind: 'info',
                messageKey: 'messages.roleSelected',
                params: { role: t(`workflow.roles.${role}.label`) },
                live: 'polite'
              });
            }}
          />

          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => setAuditOpen(true)} data-testid="audit-open">
              {t('audit.open')}
            </button>
          </div>
        </AppLayout.LeftPanel>

        <AppLayout.CenterPanel ariaLabel={t('panels.create')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => setAuditOpen(true)}
              aria-label={t('audit.open')}
              title={t('audit.open')}
              data-testid="audit-open-top"
            >
              ⧉
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => setSettingsOpen(true)}
              aria-label={t('settings.open')}
              title={t('settings.open')}
              data-testid="settings-open"
            >
              ⚙
            </button>

            <HelpTooltip label={t('help.inline.openLabel')}>{t('help.inline.topic')}</HelpTooltip>
          </div>

          <TopicInput
            topic={topic}
            onTopicChange={setTopic}
            onConfirmed={handleConfirmed}
            onContextChange={(ctxPatch) => artifactsActions.setContext(ctxPatch)}
            onGenerate={handleGenerate}
            busy={busy}
          />

          <WorkflowProgressPanel title={t('workflowProgress.title')} />

          <EngagementPanel title={t('engagement.title')} />

          <ArtifactsWorkspace title={t('artifacts.title')} />
        </AppLayout.CenterPanel>

        <AppLayout.RightPanel ariaLabel={t('panels.preview')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <HelpTooltip label={t('help.inline.openLabel')}>{t('help.inline.preview')}</HelpTooltip>
          </div>

          <PreviewPanel
            title={t('preview.title')}
            artifacts={artifactsState}
            workflowState={workflowState}
            content={{
              channel: 'facebook'
            }}
          />
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

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <AuditTrailModal isOpen={auditOpen} onClose={() => setAuditOpen(false)} />
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
