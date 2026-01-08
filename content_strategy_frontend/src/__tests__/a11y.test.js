import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

import App from '../App';

expect.extend(toHaveNoViolations);

test('App has no obvious a11y violations (axe smoke)', async () => {
  const { container } = render(<App />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
