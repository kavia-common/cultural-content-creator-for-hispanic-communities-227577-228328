export const WorkflowRole = Object.freeze({
  Strategist: "Strategist",
  Copywriter: "Copywriter",
  Designer: "Designer",
  Editor: "Editor",
  CRM: "CRM",
  Coordinator: "Coordinator",
});

export const WORKFLOW_ROLES = [
  WorkflowRole.Strategist,
  WorkflowRole.Copywriter,
  WorkflowRole.Designer,
  WorkflowRole.Editor,
  WorkflowRole.CRM,
  WorkflowRole.Coordinator,
];

// PUBLIC_INTERFACE
export function getNextWorkflowRole(current) {
  /** Return the next role in the workflow or null if at the end. */
  const idx = WORKFLOW_ROLES.indexOf(current);
  if (idx < 0) return WORKFLOW_ROLES[0];
  if (idx === WORKFLOW_ROLES.length - 1) return null;
  return WORKFLOW_ROLES[idx + 1];
}
