import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { WORKFLOW_ROLES } from '../../domain/workflow';
import { useWorkflow, WorkflowStepStatus } from '../../state/workflow';
import { useArtifacts, ArtifactTypes } from '../../state/artifacts';
import { useAppMessages } from '../../state/messages';

function statusKey(status) {
  return `workflowProgress.status.${status}`;
}

function statusBadgeClass(status, isCurrent) {
  if (status === WorkflowStepStatus.approved) return 'badge badgeComplete';
  if (status === WorkflowStepStatus.paused) return 'badge badgePaused';
  if (status === WorkflowStepStatus.changes_requested) return 'badge badgeChanges';
  if (isCurrent) return 'badge badgeCurrent';
  return 'badge badgeUpcoming';
}

function canAdvance(step) {
  return step?.status === WorkflowStepStatus.approved;
}

function isPaused(step) {
  return step?.status === WorkflowStepStatus.paused;
}

// PUBLIC_INTERFACE
export default function WorkflowProgressPanel({ title }) {
  /** Workflow progress panel with per-step statuses, estimates, and pause/resume + review actions. */
  const { t } = useTranslation();
  const { pushMessage } = useAppMessages();
  const { state, actions } = useWorkflow();
  const { state: artifactsState } = useArtifacts();

  const currentStep = useMemo(
    () => state.steps.find((s) => s.id === state.currentStepId),
    [state.steps, state.currentStepId]
  );

  const [pauseOpen, setPauseOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);

  const [pauseReason, setPauseReason] = useState('');
  const [changesComment, setChangesComment] = useState('');

  const pauseInputRef = useRef(null);
  const changesInputRef = useRef(null);

  // aria-live region for status updates (polite).
  const liveRef = useRef(null);
  const lastEventIdRef = useRef('');

  useEffect(() => {
    const newest = state.events?.[0];
    if (!newest || newest.id === lastEventIdRef.current) return;

    lastEventIdRef.current = newest.id;

    // Create a compact, localized announcement.
    const stepLabel = newest.stepId ? t(`workflow.roles.${newest.stepId}.label`) : '';
    let msg = '';

    if (newest.type === 'paused') msg = t('workflowProgress.announcements.paused', { step: stepLabel });
    else if (newest.type === 'resumed') msg = t('workflowProgress.announcements.resumed', { step: stepLabel });
    else if (newest.type === 'changes_requested')
      msg = t('workflowProgress.announcements.changesRequested', { step: stepLabel });
    else if (newest.type === 'approved') msg = t('workflowProgress.announcements.approved', { step: stepLabel });
    else if (newest.type === 'step_completed')
      msg = t('workflowProgress.announcements.stepCompleted', {
        step: t(`workflow.roles.${newest.payload?.from}.label`),
        next: t(`workflow.roles.${newest.payload?.to}.label`)
      });
    else if (newest.type === 'workflow_completed') msg = t('workflowProgress.announcements.workflowCompleted');
    else msg = t('workflowProgress.announcements.statusUpdated', { step: stepLabel });

    if (liveRef.current) liveRef.current.textContent = msg;

    // Also leverage existing FeedbackRegion pattern via AppMessageProvider.
    pushMessage({
      kind: 'info',
      messageKey: 'workflowProgress.messages.event',
      params: { message: msg },
      live: 'polite'
    });
  }, [state.events, t, pushMessage]);

  const stepListLabel = t('workflowProgress.stepListLabel');

  const approvalGate = useMemo(() => {
    const role = state.currentStepId;

    // Map steps to required approvals / inputs.
    if (role === 'Strategist') {
      const ok = Boolean((artifactsState.context?.topic || '').trim().length >= 3);
      return { ok, reasonKey: ok ? '' : 'workflowGates.needTopic' };
    }

    if (role === 'Copywriter') {
      const ok = Boolean(artifactsState.captions?.approvedId);
      return { ok, reasonKey: ok ? '' : 'workflowGates.needCaptionApproval' };
    }

    if (role === 'Designer') {
      const ok = Boolean(artifactsState.outlines?.approvedId);
      return { ok, reasonKey: ok ? '' : 'workflowGates.needOutlineApproval' };
    }

    if (role === 'Editor') {
      const ok = Boolean(artifactsState.scripts?.approvedId);
      return { ok, reasonKey: ok ? '' : 'workflowGates.needScriptApproval' };
    }

    if (role === 'CRM') {
      const ok = Boolean(
        (artifactsState.engagement?.survey || '').trim() ||
          (artifactsState.engagement?.openQuestion || '').trim() ||
          (artifactsState.engagement?.challenge || '').trim()
      );
      return { ok, reasonKey: ok ? '' : 'workflowGates.needEngagement' };
    }

    if (role === 'Coordinator') {
      const ok =
        Boolean(artifactsState.captions?.approvedId) &&
        Boolean(artifactsState.scripts?.approvedId) &&
        Boolean(artifactsState.outlines?.approvedId);
      return { ok, reasonKey: ok ? '' : 'workflowGates.needAllApprovals' };
    }

    return { ok: true, reasonKey: '' };
  }, [state.currentStepId, artifactsState]);

  return (
    <section className="card" aria-label={title || t('workflowProgress.title')} data-testid="workflow-progress-panel">
      <div className="srOnly" aria-live="polite" aria-atomic="true" ref={liveRef} />

      <div className="cardHeader">
        <h2 className="h2">{title || t('workflowProgress.title')}</h2>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btnPrimary"
            onClick={() => actions.advanceToNext()}
            disabled={!canAdvance(currentStep) || isPaused(currentStep)}
            aria-disabled={!canAdvance(currentStep) || isPaused(currentStep) ? 'true' : 'false'}
            title={
              isPaused(currentStep)
                ? t('workflowProgress.tooltips.cannotAdvancePaused')
                : !canAdvance(currentStep)
                  ? t('workflowProgress.tooltips.cannotAdvanceNotApproved')
                  : t('workflowProgress.advance')
            }
            data-testid="workflow-advance"
          >
            {t('workflowProgress.advance')}
          </button>
        </div>
      </div>

      <p className="muted" style={{ marginTop: 6 }}>
        {t('workflowProgress.currentStep', {
          role: t(`workflow.roles.${state.currentStepId}.label`)
        })}
      </p>

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        <nav aria-label={stepListLabel}>
          <ol className="workflowStepList">
            {WORKFLOW_ROLES.map((role) => {
              const step = state.steps.find((s) => s.id === role);
              const isCurrent = role === state.currentStepId;
              const label = t(`workflow.roles.${role}.label`);
              const statusText = t(statusKey(step?.status || WorkflowStepStatus.idle));
              const estimate = Number.isFinite(step?.estimateMinutes) ? step.estimateMinutes : 0;

              return (
                <li key={role} className={`workflowStepItem ${isCurrent ? 'workflowStepItemCurrent' : ''}`}>
                  <button
                    type="button"
                    className="workflowStepBtn"
                    onClick={() => actions.setCurrentStep(role)}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={t('workflowProgress.stepAriaLabel', {
                      step: label,
                      status: statusText,
                      estimate
                    })}
                    data-testid={`workflow-step-${role}`}
                  >
                    <div className="workflowStepRow">
                      <strong>{label}</strong>

                      <span className={statusBadgeClass(step?.status, isCurrent)}>
                        <span className="badgeDot" aria-hidden="true" />
                        {statusText}
                      </span>
                    </div>

                    <div className="workflowStepMeta">
                      <span className="muted">
                        {t('workflowProgress.estimate', {
                          minutes: estimate
                        })}
                      </span>

                      {step?.status === WorkflowStepStatus.paused && step?.pauseReason ? (
                        <span className="muted">{t('workflowProgress.pauseReason', { reason: step.pauseReason })}</span>
                      ) : null}

                      {step?.status === WorkflowStepStatus.changes_requested && step?.changesComment ? (
                        <span className="muted">
                          {t('workflowProgress.changesComment', { comment: step.changesComment })}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="card" aria-label={t('workflowProgress.actionsTitle')}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div className="muted">
              {t('workflowProgress.activeStatus', {
                status: t(statusKey(currentStep?.status || WorkflowStepStatus.idle))
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isPaused(currentStep) ? (
                <button
                  type="button"
                  className="btn btnSecondary"
                  onClick={() => actions.resumeWorkflow()}
                  data-testid="workflow-resume"
                >
                  {t('workflowProgress.resume')}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setPauseReason('');
                    setPauseOpen(true);
                  }}
                  data-testid="workflow-pause"
                >
                  {t('workflowProgress.pause')}
                </button>
              )}

              <button
                type="button"
                className="btn"
                onClick={() => {
                  setChangesComment('');
                  setChangesOpen(true);
                }}
                disabled={isPaused(currentStep)}
                aria-disabled={isPaused(currentStep) ? 'true' : 'false'}
                title={isPaused(currentStep) ? t('workflowProgress.tooltips.cannotRequestChangesPaused') : undefined}
                data-testid="workflow-request-changes"
              >
                {t('workflowProgress.requestChanges')}
              </button>

              <button
                type="button"
                className="btn btnSecondary"
                onClick={() => {
                  if (!approvalGate.ok) {
                    pushMessage({ kind: 'error', messageKey: approvalGate.reasonKey, live: 'assertive' });
                    return;
                  }
                  actions.approveStep(state.currentStepId);
                }}
                disabled={isPaused(currentStep) || !approvalGate.ok}
                aria-disabled={isPaused(currentStep) || !approvalGate.ok ? 'true' : 'false'}
                title={
                  isPaused(currentStep)
                    ? t('workflowProgress.tooltips.cannotApprovePaused')
                    : !approvalGate.ok
                      ? t(approvalGate.reasonKey)
                      : undefined
                }
                data-testid="workflow-approve"
              >
                {t('workflowProgress.approve')}
              </button>
            </div>
          </div>
        </section>
      </div>

      <Modal
        isOpen={pauseOpen}
        onClose={() => setPauseOpen(false)}
        title={t('workflowProgress.pauseModal.title')}
        describedById="pause-desc"
        initialFocusRef={pauseInputRef}
        closeLabel={t('common.closeDialog')}
      >
        <div id="pause-desc" className="srOnly">
          {t('workflowProgress.pauseModal.description')}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <label htmlFor="pause-reason" className="fieldHelp" style={{ fontWeight: 800 }}>
            {t('workflowProgress.pauseModal.reasonLabel')}
          </label>
          <textarea
            id="pause-reason"
            ref={pauseInputRef}
            className="textarea"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => setPauseOpen(false)}>
              {t('workflowProgress.cancel')}
            </button>
            <button
              type="button"
              className="btn btnPrimary"
              onClick={() => {
                actions.pauseWorkflow(pauseReason);
                setPauseOpen(false);
              }}
            >
              {t('workflowProgress.pause')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={changesOpen}
        onClose={() => setChangesOpen(false)}
        title={t('workflowProgress.changesModal.title')}
        describedById="changes-desc"
        initialFocusRef={changesInputRef}
        closeLabel={t('common.closeDialog')}
      >
        <div id="changes-desc" className="srOnly">
          {t('workflowProgress.changesModal.description')}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <label htmlFor="changes-comment" className="fieldHelp" style={{ fontWeight: 800 }}>
            {t('workflowProgress.changesModal.commentLabel')}
          </label>
          <textarea
            id="changes-comment"
            ref={changesInputRef}
            className="textarea"
            value={changesComment}
            onChange={(e) => setChangesComment(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => setChangesOpen(false)}>
              {t('workflowProgress.cancel')}
            </button>
            <button
              type="button"
              className="btn btnPrimary"
              onClick={() => {
                actions.requestChanges(state.currentStepId, changesComment);
                setChangesOpen(false);
              }}
            >
              {t('workflowProgress.requestChanges')}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
