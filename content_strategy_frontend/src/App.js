import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from './layout/AppLayout';
import WorkflowSidebar from './components/workflow/WorkflowSidebar';
import TopicInput from './components/topic/TopicInput';
import PreviewPanel from './components/preview/PreviewPanel';
import CaptionsPanel from './components/captions/CaptionsPanel';
import SettingsModal from './components/settings/SettingsModal';
import { AppMessageProvider, useAppMessages } from './state/messages';
import useOnboardingState from './hooks/useOnboardingState';
import useHelpCenter from './hooks/useHelpCenter';
import OnboardingTour from './components/onboarding/OnboardingTour';
import HelpCenter from './components/help/HelpCenter';
import HelpTooltip from './components/help/HelpTooltip';
import { generateCaptions } from './services/openaiCaptions';
import WorkflowProgressPanel from './components/workflow/WorkflowProgressPanel';
import { WorkflowProvider, getWorkflowRoleUiStateFromSteps, useWorkflow } from './state/workflow';

function MainApp() {
  const { t, i18n } = useTranslation();
  const { pushMessage } = useAppMessages();

  const onboarding = useOnboardingState();
  const help = useHelpCenter();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [topic, setTopic] = useState('');
  const artifactId = useMemo(() => (topic || 'default').trim().toLowerCase() || 'default', [topic]);

  const [previewContent, setPreviewContent] = useState({
    title: '',
    body: '',
    channel: 'facebook'
  });

  const [captionsStatus, setCaptionsStatus] = useState('idle'); // idle | loading | success | error
  const [captionsErrorKey, setCaptionsErrorKey] = useState('');
  const [captions, setCaptions] = useState([]);
  const [approvedCaptionId, setApprovedCaptionId] = useState('');

  const handleLanguageToggle = () => {
    const next = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(next);
    pushMessage({
      kind: 'info',
      messageKey: 'messages.languageChanged',
      live: 'polite'
    });
  };

  const handleGenerateCaptions = async ({ topic: topicValue, niche, emotion, language }) => {
    setCaptionsStatus('loading');
    setCaptionsErrorKey('');
    setApprovedCaptionId('');

    const result = await generateCaptions({ topic: topicValue, niche, emotion, language });

    if (!result.ok) {
      setCaptionsStatus('error');
      setCaptionsErrorKey(result.errorKey || 'captions.errors.generic');

      pushMessage({
        kind: 'error',
        messageKey: result.errorKey || 'captions.errors.generic',
        live: 'assertive'
      });

      if (result.errorKey === 'captions.errors.missingKey') {
        pushMessage({
          kind: 'info',
          messageKey: 'captions.errors.missingKeyHint',
          live: 'polite'
        });
      }
      return;
    }

    setCaptions(result.data.captions);
    setCaptionsStatus('success');
    pushMessage({ kind: 'success', messageKey: 'captions.messages.generated', live: 'polite' });
  };

  return (
    <WorkflowProvider artifactId={artifactId}>
      <MainAppBody
        t={t}
        i18n={i18n}
        pushMessage={pushMessage}
        onboarding={onboarding}
        help={help}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        topic={topic}
        setTopic={setTopic}
        previewContent={previewContent}
        setPreviewContent={setPreviewContent}
        captionsStatus={captionsStatus}
        captionsErrorKey={captionsErrorKey}
        captions={captions}
        setCaptions={setCaptions}
        approvedCaptionId={approvedCaptionId}
        setApprovedCaptionId={setApprovedCaptionId}
        handleLanguageToggle={handleLanguageToggle}
        handleGenerateCaptions={handleGenerateCaptions}
      />
    </WorkflowProvider>
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
  topic,
  setTopic,
  previewContent,
  setPreviewContent,
  captionsStatus,
  captionsErrorKey,
  captions,
  setCaptions,
  approvedCaptionId,
  setApprovedCaptionId,
  handleLanguageToggle,
  handleGenerateCaptions
}) {
  const { state: workflowState } = useWorkflow();

  const workflowSidebarItems = useMemo(() => {
    return getWorkflowRoleUiStateFromSteps({
      steps: workflowState.steps,
      currentStepId: workflowState.currentStepId
    });
  }, [workflowState.steps, workflowState.currentStepId]);

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
        </AppLayout.LeftPanel>

        <AppLayout.CenterPanel ariaLabel={t('panels.create')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
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
            captionsBusy={captionsStatus === 'loading'}
            onGenerateCaptions={handleGenerateCaptions}
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

          <WorkflowProgressPanel title={t('workflowProgress.title')} />

          <CaptionsPanel
            title={t('captions.title')}
            status={captionsStatus}
            errorKey={captionsErrorKey}
            captions={captions}
            onEditCaption={(id, nextText) => {
              setCaptions((prev) => prev.map((c) => (c.id === id ? { ...c, text: nextText } : c)));
              pushMessage({ kind: 'success', messageKey: 'captions.messages.saved', live: 'polite' });
            }}
            onApproveCaption={(id) => {
              setApprovedCaptionId(id);
              const chosen = captions.find((c) => c.id === id);
              if (chosen) {
                setPreviewContent({
                  title: t('preview.placeholderTitle', { topic: topic || t('captions.previewFallbackTopic') }),
                  body: chosen.text,
                  channel: 'facebook'
                });
              }
              pushMessage({ kind: 'success', messageKey: 'captions.messages.approved', live: 'polite' });
            }}
          />

          {approvedCaptionId ? (
            <div className="callout" role="status" style={{ marginTop: 10 }}>
              {t('captions.approvedBanner')}
            </div>
          ) : null}
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

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
