#!/usr/bin/env bash
set -euo pipefail
# Test-runner / smoke test creation script (idempotent)
WS="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
LOG=/tmp/step_testing_004.log
PKG_INFO=/tmp/step_pkg_manager.info
SMOKE_INFO=/tmp/created_smoke_test.info
exec > >(tee -a "$LOG") 2>&1
cd "$WS"
USE_YARN=0
if [ -f "$PKG_INFO" ]; then source "$PKG_INFO" || true; fi
# If package manager not persisted, try detect from yarn.lock/package-lock.json
if [ -z "${USE_YARN:-}" ]; then
  if [ -f yarn.lock ]; then USE_YARN=1; else USE_YARN=0; fi
fi
IS_TS=0
[ -f tsconfig.json ] && IS_TS=1
TEST_DIR=src/__tests__
mkdir -p "$TEST_DIR"
if [ "$IS_TS" -eq 1 ]; then TARGET="$TEST_DIR/App.smoke.test.tsx"; else TARGET="$TEST_DIR/App.smoke.test.js"; fi
# Guarded import check
IMPORT_OK=0
node -e "try{require('module').createRequire(process.cwd())('./src/App'); process.exit(0);}catch(e){process.exit(1);}" >/dev/null 2>&1 && IMPORT_OK=1 || IMPORT_OK=0
if [ "$IMPORT_OK" -ne 1 ]; then echo "WARNING: cannot import ./src/App - skipping smoke test creation/run" | tee "$SMOKE_INFO"; exit 0; fi
# Create smoke test using raw here-doc to avoid escaping issues
if [ ! -f "$TARGET" ]; then
  if [ "$IS_TS" -eq 1 ]; then
    cat > "$TARGET" <<'TSX'
import React from 'react'
import { render } from '@testing-library/react'
import App from '../App'

test('renders App without crashing (smoke)', () => {
  render(<App />)
})
TSX
  else
    cat > "$TARGET" <<'JS'
import React from 'react'
import { render } from '@testing-library/react'
import App from '../App'

test('renders App without crashing (smoke)', () => {
  render(<App />)
})
JS
  fi
  echo "SMOKE_TEST_CREATED=$TARGET" > "$SMOKE_INFO"
else
  echo "SMOKE_TEST_EXISTS=$TARGET" > "$SMOKE_INFO"
fi
# Install testing libs if missing using detected package manager
if [ "$USE_YARN" -eq 1 ]; then
  node -e "try{require('module').createRequire(process.cwd())('@testing-library/react');}catch(e){process.exit(1);}" >/dev/null 2>&1 || yarn add -D @testing-library/react @testing-library/jest-dom --silent
  # Run only the smoke test file
  yarn test --silent --watchAll=false "$TARGET" || { echo "ERROR: smoke test failed" >&2; exit 3; }
else
  node -e "try{require('module').createRequire(process.cwd())('@testing-library/react');}catch(e){process.exit(1);}" >/dev/null 2>&1 || npm i --no-audit --no-fund --save-dev @testing-library/react @testing-library/jest-dom --silent
  # Prefer project test script if present; pass file path to test runner
  if node -e "let p=require('./package.json');console.log(!!(p.scripts&&p.scripts.test))" | grep -q true; then
    # npm test -- <args> passes args to underlying runner
    npm test --silent -- "$TARGET" --watchAll=false || { echo "ERROR: smoke test failed" >&2; exit 3; }
  else
    # Fallback to npx jest
    if command -v npx >/dev/null 2>&1; then
      npx --yes jest "$TARGET" --runInBand --silent || { echo "ERROR: smoke test failed" >&2; exit 3; }
    else
      echo "ERROR: no test runner available" >&2; exit 4
    fi
  fi
fi
echo "SMOKE_TEST_RUN_OK=$TARGET" >> "$SMOKE_INFO"
