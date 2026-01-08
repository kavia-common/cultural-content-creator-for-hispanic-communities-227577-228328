#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
mkdir -p src/__tests__
if [ ! -f src/__tests__/App.test.js ]; then
  cat > src/__tests__/App.test.js <<'EOF'
import React from 'react'
import { create } from 'react-test-renderer'
import App from '../App'
test('App renders without crashing', () => {
  const tree = create(<App />).toJSON()
  expect(tree).toBeTruthy()
})
EOF
fi
# ensure react-test-renderer is available (handles hoisted layouts)
if ! node -e "try{require.resolve('react-test-renderer'); process.exit(0);}catch(e){process.exit(1)}"; then
  echo "react-test-renderer not installed; ensure deps step installed devDependencies" >&2
  exit 2
fi
export CI=true
LOG=/tmp/test_output.log
# prefer local react-scripts binary when present
if [ -x ./node_modules/.bin/react-scripts ]; then
  ./node_modules/.bin/react-scripts test --watchAll=false --env=jsdom > "$LOG" 2>&1 || (tail -n 200 "$LOG" >&2 && exit 4)
else
  npm test -- --watchAll=false > "$LOG" 2>&1 || (tail -n 200 "$LOG" >&2 && exit 4)
fi
