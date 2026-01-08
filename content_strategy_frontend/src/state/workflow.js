import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { WORKFLOW_ROLES } from "../domain/workflow";

const STORAGE_PREFIX = "ccch.workflow.v1";

// Step status model required by the task.
export const WorkflowStepStatus = Object.freeze({
  idle: "idle",
  in_progress: "in_progress",
  awaiting_review: "awaiting_review",
  approved: "approved",
  changes_requested: "changes_requested",
  paused: "paused",
});

const WorkflowEventType = Object.freeze({
  status_changed: "status_changed",
  step_completed: "step_completed",
  workflow_completed: "workflow_completed",
  paused: "paused",
  resumed: "resumed",
  changes_requested: "changes_requested",
  approved: "approved",
  estimate_set: "estimate_set",
});

// Static heuristic estimates (minutes) per role.
const DEFAULT_ESTIMATES_MIN = Object.freeze({
  Strategist: 12,
  Copywriter: 18,
  Designer: 20,
  Editor: 10,
  CRM: 10,
  Coordinator: 8,
});

function nowTs() {
  return Date.now();
}

function storageKeyForArtifact(artifactId) {
  return `${STORAGE_PREFIX}.${artifactId || "default"}`;
}

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Workflow state shape:
 * {
 *   artifactId: string,
 *   currentStepId: string,
 *   steps: Array<{ id, status, estimateMinutes, startedAt?, completedAt?, lastUpdatedAt?, pauseReason?, changesComment? }>,
 *   events: Array<{ id, type, stepId?, ts, payload? }>,
 * }
 */

function createInitialSteps() {
  return WORKFLOW_ROLES.map((id, idx) => ({
    id,
    status:
      idx === 0 ? WorkflowStepStatus.in_progress : WorkflowStepStatus.idle,
    estimateMinutes: DEFAULT_ESTIMATES_MIN[id] ?? 10,
    startedAt: idx === 0 ? nowTs() : null,
    completedAt: null,
    lastUpdatedAt: nowTs(),
    pauseReason: "",
    changesComment: "",
  }));
}

function createInitialState(artifactId) {
  return {
    artifactId: artifactId || "default",
    currentStepId: WORKFLOW_ROLES[0],
    steps: createInitialSteps(),
    events: [],
  };
}

function normalizeLoadedState(raw, artifactId) {
  const base = createInitialState(artifactId);
  if (!raw || typeof raw !== "object") return base;

  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  const stepById = new Map(steps.map((s) => [s.id, s]));

  const normalizedSteps = WORKFLOW_ROLES.map((id, idx) => {
    const prev = stepById.get(id) || {};
    return {
      id,
      status: Object.values(WorkflowStepStatus).includes(prev.status)
        ? prev.status
        : idx === 0
          ? WorkflowStepStatus.in_progress
          : WorkflowStepStatus.idle,
      estimateMinutes: Number.isFinite(prev.estimateMinutes)
        ? prev.estimateMinutes
        : (DEFAULT_ESTIMATES_MIN[id] ?? 10),
      startedAt: Number.isFinite(prev.startedAt)
        ? prev.startedAt
        : idx === 0
          ? nowTs()
          : null,
      completedAt: Number.isFinite(prev.completedAt) ? prev.completedAt : null,
      lastUpdatedAt: Number.isFinite(prev.lastUpdatedAt)
        ? prev.lastUpdatedAt
        : nowTs(),
      pauseReason: typeof prev.pauseReason === "string" ? prev.pauseReason : "",
      changesComment:
        typeof prev.changesComment === "string" ? prev.changesComment : "",
    };
  });

  // Determine current step: first non-approved non-completed, else last.
  const currentStepId =
    typeof raw.currentStepId === "string" &&
    WORKFLOW_ROLES.includes(raw.currentStepId)
      ? raw.currentStepId
      : normalizedSteps.find((s) => s.status !== WorkflowStepStatus.approved)
          ?.id || WORKFLOW_ROLES[0];

  const events = Array.isArray(raw.events)
    ? raw.events.slice(0, 50).map((e) => ({
        id: e?.id || `${nowTs()}-${Math.random().toString(16).slice(2)}`,
        type: e?.type || WorkflowEventType.status_changed,
        stepId: e?.stepId || null,
        ts: Number.isFinite(e?.ts) ? e.ts : nowTs(),
        payload: e?.payload ?? {},
      }))
    : [];

  return {
    artifactId: artifactId || base.artifactId,
    currentStepId,
    steps: normalizedSteps,
    events,
  };
}

function canAdvanceFromStep(step) {
  // "pause disables advance" requirement: paused cannot advance.
  if (!step) return false;
  if (step.status === WorkflowStepStatus.paused) return false;
  // must be approved before advancing.
  return step.status === WorkflowStepStatus.approved;
}

function isWorkflowPaused(state) {
  const current = state.steps.find((s) => s.id === state.currentStepId);
  return current?.status === WorkflowStepStatus.paused;
}

function addEvent(events, event) {
  const e = {
    id: event.id || `${nowTs()}-${Math.random().toString(16).slice(2)}`,
    type: event.type,
    stepId: event.stepId ?? null,
    ts: event.ts || nowTs(),
    payload: event.payload ?? {},
  };
  // newest first
  return [e, ...events].slice(0, 50);
}

function setStep(state, stepId, patch) {
  return {
    ...state,
    steps: state.steps.map((s) =>
      s.id === stepId ? { ...s, ...patch, lastUpdatedAt: nowTs() } : s,
    ),
  };
}

function advanceIfPossible(state) {
  const idx = WORKFLOW_ROLES.indexOf(state.currentStepId);
  const current = state.steps.find((s) => s.id === state.currentStepId);
  if (!canAdvanceFromStep(current)) {
    return state;
  }

  const nextRole =
    idx >= 0 && idx < WORKFLOW_ROLES.length - 1
      ? WORKFLOW_ROLES[idx + 1]
      : null;

  if (!nextRole) {
    // completed workflow
    return {
      ...state,
      events: addEvent(state.events, {
        type: WorkflowEventType.workflow_completed,
        stepId: state.currentStepId,
      }),
    };
  }

  let next = setStep(state, nextRole, {
    status: WorkflowStepStatus.in_progress,
    startedAt: state.steps.find((s) => s.id === nextRole)?.startedAt ?? nowTs(),
  });
  next = { ...next, currentStepId: nextRole };
  next = {
    ...next,
    events: addEvent(next.events, {
      type: WorkflowEventType.step_completed,
      stepId: state.currentStepId,
      payload: { from: state.currentStepId, to: nextRole },
    }),
  };
  return next;
}

const WorkflowContext = createContext(null);

function workflowReducer(state, action) {
  switch (action.type) {
    case "LOAD": {
      return normalizeLoadedState(action.payload, action.artifactId);
    }

    case "ADD_NOTIFICATION": {
      return { ...state, events: addEvent(state.events, action.event) };
    }

    case "SET_ESTIMATE": {
      const { stepId, minutes } = action;
      const mins = Math.max(0, Math.round(Number(minutes) || 0));
      const next = setStep(state, stepId, { estimateMinutes: mins });
      return {
        ...next,
        events: addEvent(next.events, {
          type: WorkflowEventType.estimate_set,
          stepId,
          payload: { minutes: mins },
        }),
      };
    }

    case "PAUSE_WORKFLOW": {
      const { reason } = action;
      if (!state.currentStepId) return state;

      const current = state.steps.find((s) => s.id === state.currentStepId);
      if (!current) return state;
      if (current.status === WorkflowStepStatus.paused) return state;

      const next = setStep(state, state.currentStepId, {
        status: WorkflowStepStatus.paused,
        pauseReason: (reason || "").trim(),
      });

      return {
        ...next,
        events: addEvent(next.events, {
          type: WorkflowEventType.paused,
          stepId: state.currentStepId,
          payload: { reason: (reason || "").trim() },
        }),
      };
    }

    case "RESUME_WORKFLOW": {
      const current = state.steps.find((s) => s.id === state.currentStepId);
      if (!current || current.status !== WorkflowStepStatus.paused)
        return state;

      const resumedStatus =
        current.completedAt || current.status === WorkflowStepStatus.approved
          ? WorkflowStepStatus.awaiting_review
          : WorkflowStepStatus.in_progress;

      const next = setStep(state, state.currentStepId, {
        status: resumedStatus,
        pauseReason: "",
      });

      return {
        ...next,
        events: addEvent(next.events, {
          type: WorkflowEventType.resumed,
          stepId: state.currentStepId,
        }),
      };
    }

    case "REQUEST_CHANGES": {
      const { stepId, comment } = action;
      const targetId = stepId || state.currentStepId;

      const target = state.steps.find((s) => s.id === targetId);
      if (!target) return state;

      const next = setStep(state, targetId, {
        status: WorkflowStepStatus.changes_requested,
        changesComment: (comment || "").trim(),
      });

      return {
        ...next,
        events: addEvent(next.events, {
          type: WorkflowEventType.changes_requested,
          stepId: targetId,
          payload: { comment: (comment || "").trim() },
        }),
      };
    }

    case "APPROVE_STEP": {
      const { stepId } = action;
      const targetId = stepId || state.currentStepId;

      const target = state.steps.find((s) => s.id === targetId);
      if (!target) return state;
      if (target.status === WorkflowStepStatus.paused) return state; // cannot approve while paused

      const next = setStep(state, targetId, {
        status: WorkflowStepStatus.approved,
        completedAt: target.completedAt || nowTs(),
        changesComment: "",
      });

      return {
        ...next,
        events: addEvent(next.events, {
          type: WorkflowEventType.approved,
          stepId: targetId,
        }),
      };
    }

    case "ADVANCE_NEXT": {
      // Enforce: cannot advance while paused and must be approved.
      if (isWorkflowPaused(state)) return state;
      return advanceIfPossible(state);
    }

    case "SET_CURRENT_STEP": {
      const { stepId } = action;
      if (!WORKFLOW_ROLES.includes(stepId)) return state;
      return { ...state, currentStepId: stepId };
    }

    default:
      return state;
  }
}

// PUBLIC_INTERFACE
export function WorkflowProvider({ children, artifactId }) {
  /** Provides workflow progress state/actions for a single "artifact" (topic/content item), persisted to storage. */
  const [state, dispatch] = useReducer(workflowReducer, null, () => {
    const id = artifactId || "default";
    try {
      const raw = safeParse(
        window.sessionStorage.getItem(storageKeyForArtifact(id)),
        null,
      );
      if (raw) return normalizeLoadedState(raw, id);
    } catch {
      // ignore
    }
    try {
      const raw = safeParse(
        window.localStorage.getItem(storageKeyForArtifact(id)),
        null,
      );
      if (raw) return normalizeLoadedState(raw, id);
    } catch {
      // ignore
    }
    return createInitialState(id);
  });

  // Persist minimal state so refresh keeps workflow for the artifact.
  useEffect(() => {
    const id = artifactId || state.artifactId || "default";
    const key = storageKeyForArtifact(id);

    const payload = {
      currentStepId: state.currentStepId,
      steps: state.steps.map((s) => ({
        id: s.id,
        status: s.status,
        estimateMinutes: s.estimateMinutes,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        lastUpdatedAt: s.lastUpdatedAt,
        pauseReason: s.pauseReason,
        changesComment: s.changesComment,
      })),
      // Keep small recent events for announcements continuity.
      events: state.events.slice(0, 15),
    };

    try {
      window.sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [state, artifactId]);

  const actions = useMemo(() => {
    return {
      // PUBLIC_INTERFACE
      advanceToNext: () => {
        /** Advance to next step if current step is approved and not paused. */
        dispatch({ type: "ADVANCE_NEXT" });
      },
      // PUBLIC_INTERFACE
      pauseWorkflow: (reason) => {
        /** Pause the current workflow step with an optional reason. */
        dispatch({ type: "PAUSE_WORKFLOW", reason });
      },
      // PUBLIC_INTERFACE
      resumeWorkflow: () => {
        /** Resume workflow from paused state (returns to in_progress/awaiting_review). */
        dispatch({ type: "RESUME_WORKFLOW" });
      },
      // PUBLIC_INTERFACE
      requestChanges: (stepId, comment) => {
        /** Request changes for a given step, storing a comment for context. */
        dispatch({ type: "REQUEST_CHANGES", stepId, comment });
      },
      // PUBLIC_INTERFACE
      approveStep: (stepId) => {
        /** Approve a step (typically current) which enables advancing. */
        dispatch({ type: "APPROVE_STEP", stepId });
      },
      // PUBLIC_INTERFACE
      setEstimate: (stepId, minutes) => {
        /** Set (override) an estimate in minutes for a step. */
        dispatch({ type: "SET_ESTIMATE", stepId, minutes });
      },
      // PUBLIC_INTERFACE
      addNotification: (event) => {
        /** Add a workflow notification event (used to drive toasts/announcements). */
        dispatch({ type: "ADD_NOTIFICATION", event });
      },
      // PUBLIC_INTERFACE
      setCurrentStep: (stepId) => {
        /** Set the currently focused/selected step (does not change status). */
        dispatch({ type: "SET_CURRENT_STEP", stepId });
      },
    };
  }, []);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

// PUBLIC_INTERFACE
export function useWorkflow() {
  /** Hook to access workflow state and actions. */
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider");
  return ctx;
}

// PUBLIC_INTERFACE
export function getWorkflowRoleUiStateFromSteps({ steps, currentStepId }) {
  /** Map workflow step statuses into the existing WorkflowSidebar "current/complete/upcoming" format. */
  const byId = new Map((steps || []).map((s) => [s.id, s]));
  return WORKFLOW_ROLES.map((role) => {
    const step = byId.get(role);
    const isCurrent = role === currentStepId;

    // Completed: approved
    if (step?.status === WorkflowStepStatus.approved)
      return { role, state: "complete" };

    if (isCurrent) return { role, state: "current" };

    return { role, state: "upcoming" };
  });
}
