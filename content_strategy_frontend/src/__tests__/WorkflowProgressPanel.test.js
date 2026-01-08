import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import '../i18n/i18n';
import { AppMessageProvider } from '../state/messages';
import { WorkflowProvider } from '../state/workflow';
import WorkflowProgressPanel from '../components/workflow/WorkflowProgressPanel';

function renderPanel() {
  return render(
    <AppMessageProvider>
      <WorkflowProvider artifactId="test-artifact">
        <WorkflowProgressPanel title="Workflow progress" />
      </WorkflowProvider>
    </AppMessageProvider>
  );
}

test('Highlights current step via aria-current=step', () => {
  renderPanel();
  const firstRole = 'Strategist';
  const btn = screen.getByTestId(`workflow-step-${firstRole}`);
  expect(btn).toHaveAttribute('aria-current', 'step');
});

test('Pause disables advance button', async () => {
  const user = userEvent.setup();
  renderPanel();

  await user.click(screen.getByTestId('workflow-pause'));

  // Modal opens; confirm pause.
  const dialog = await screen.findByRole('dialog', { name: /pause workflow/i });
  const textarea = within(dialog).getByRole('textbox');
  await user.type(textarea, 'Waiting on review');

  await user.click(within(dialog).getByRole('button', { name: /pause/i }));

  expect(screen.getByTestId('workflow-advance')).toBeDisabled();
});

test('Change request modal captures comment and updates status badge', async () => {
  const user = userEvent.setup();
  renderPanel();

  await user.click(screen.getByTestId('workflow-request-changes'));

  const dialog = await screen.findByRole('dialog', { name: /request changes/i });
  const textarea = within(dialog).getByRole('textbox');
  await user.type(textarea, 'Please adjust CTA');

  await user.click(within(dialog).getByRole('button', { name: /request changes/i }));

  // Current step row should show "Changes requested" badge text somewhere.
  const firstRole = 'Strategist';
  const stepBtn = screen.getByTestId(`workflow-step-${firstRole}`);
  expect(within(stepBtn).getByText(/changes requested/i)).toBeInTheDocument();
});

test('Has a polite aria-live region for status updates', () => {
  renderPanel();
  // srOnly live region exists inside panel
  const panel = screen.getByTestId('workflow-progress-panel');
  const live = within(panel).getByText('', { selector: '[aria-live="polite"]' });
  expect(live).toBeInTheDocument();
});
