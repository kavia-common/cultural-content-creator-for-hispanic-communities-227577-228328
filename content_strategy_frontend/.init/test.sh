#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
[ -f package.json ] || { echo "ERROR: package.json missing; run scaffold step" >&2; exit 4; }
# Run single smoke test non-interactively using react-scripts/Jest
# Use flags: --watchAll=false to avoid watch mode and --runInBand to prevent worker isolation issues in constrained containers
npm test -- --testPathPattern=src/__tests__/app.test.js --watchAll=false --runInBand || { echo "ERROR: tests failed" >&2; exit 12; }
exit 0
