#!/usr/bin/env bash
set -euo pipefail
# Idempotent CRA-compatible project scaffold for authoritative workspace
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
# Respect existing lockfiles: avoid creating package.json if lockfile exists but package.json missing
if [ ! -f package.json ]; then
  if [ -f yarn.lock ] || [ -f package-lock.json ]; then
    echo "ERROR: lockfile present but package.json missing; please reconcile lockfile and package.json" >&2
    exit 4
  fi
  cat > package.json <<'JSON'
{
  "name": "content_strategy_frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test --watchAll=false --runInBand"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "react-scripts": "^5.0.0",
    "@testing-library/react": "^13.0.0",
    "serve": "^14.0.0"
  }
}
JSON
fi
mkdir -p public src src/__tests__
# public/index.html
if [ ! -f public/index.html ]; then
  cat > public/index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Content Strategy Frontend</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
HTML
fi
# src/index.js
if [ ! -f src/index.js ]; then
  cat > src/index.js <<'JS'
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
const root = createRoot(document.getElementById('root'));
root.render(<App />);
JS
fi
# src/App.js
if [ ! -f src/App.js ]; then
  cat > src/App.js <<'JS'
import React from 'react';
export default function App(){
  return React.createElement('div', null, 'Hello from content_strategy_frontend');
}
JS
fi
# single smoke test
if [ ! -f src/__tests__/app.test.js ]; then
  cat > src/__tests__/app.test.js <<'JS'
import React from 'react';
import { render } from '@testing-library/react';
import App from '../App';

test('renders hello text', () => {
  const { getByText } = render(<App />);
  expect(getByText(/Hello from content_strategy_frontend/i)).toBeTruthy();
});
JS
fi
exit 0
