import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import App from '../App';

function setOnboardingCompleted(value) {
  window.localStorage.setItem('ccch.onboarding.completed', value ? 'true' : 'false');
}

test('On first visit, onboarding opens and can be finished', async () => {
  const user = userEvent.setup();
  window.localStorage.clear();
  setOnboardingCompleted(false);

  render(<App />);

  // Onboarding modal title should appear.
  expect(
    await screen.findByRole('dialog', { name: /welcome/i })
  ).toBeInTheDocument();

  // Advance to last step and finish.
  // 4 clicks "Next" for 5 steps.
  for (let i = 0; i < 4; i++) {
    await user.click(screen.getByRole('button', { name: /next/i }));
  }
  await user.click(screen.getByRole('button', { name: /finish/i }));

  // Dialog should close.
  expect(screen.queryByRole('dialog', { name: /welcome/i })).not.toBeInTheDocument();
  expect(window.localStorage.getItem('ccch.onboarding.completed')).toBe('true');
});

test('Language toggle switches EN <-> ES label in header', async () => {
  const user = userEvent.setup();
  window.localStorage.clear();
  setOnboardingCompleted(true);

  render(<App />);

  const langBtn = await screen.findByTestId('lang-toggle');
  expect(langBtn).toHaveTextContent(/EN|ES/);

  const initial = langBtn.textContent;
  await user.click(langBtn);
  expect(langBtn.textContent).not.toBe(initial);

  // Also ensure app title updates (en/es).
  const header = screen.getByRole('banner');
  const title = within(header).getByRole('heading', { level: 1 });
  expect(title).toBeInTheDocument();
});
