import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import '../i18n/i18n';
import PreviewPanel from '../components/preview/PreviewPanel';

test('Toggling channels updates preview layout', async () => {
  const user = userEvent.setup();

  render(
    <PreviewPanel
      title="Preview"
      content={{ title: 'My title', body: 'My body', channel: 'facebook' }}
    />
  );

  // Default is Facebook (from content.channel)
  expect(screen.getByTestId('fb-preview')).toBeInTheDocument();
  expect(screen.queryByTestId('wa-preview')).not.toBeInTheDocument();

  await user.click(screen.getByTestId('channel-whatsapp'));

  expect(screen.getByTestId('wa-preview')).toBeInTheDocument();
  expect(screen.queryByTestId('fb-preview')).not.toBeInTheDocument();
});

test('Validation warnings appear for long text and are announced via role=status', async () => {
  const long = 'a'.repeat(4097);
  render(<PreviewPanel title="Preview" content={{ body: long, channel: 'whatsapp' }} />);

  // Uses calloutError for errors
  expect(screen.getByText(/Text is too long/i)).toBeInTheDocument();

  // Ensure a status region exists (announcements)
  expect(screen.getByRole('status')).toBeInTheDocument();
});

test('Validation messages are localized (ES)', async () => {
  const user = userEvent.setup();
  // Switch language via i18n directly (tests import i18n).
  const i18n = require('../i18n/i18n').default;
  await i18n.changeLanguage('es');

  const long = 'a'.repeat(2201);
  render(<PreviewPanel title="Vista previa" content={{ body: long, channel: 'facebook' }} />);

  expect(screen.getByText(/El texto es demasiado largo/i)).toBeInTheDocument();

  // Restore to EN for other tests
  await i18n.changeLanguage('en');
});
