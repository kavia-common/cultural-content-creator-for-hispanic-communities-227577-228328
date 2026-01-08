#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
[ -f package.json ] || { echo "ERROR: package.json missing; run scaffold/install steps (scaffold-001/install-001)" >&2; exit 4; }
# Ensure node and npm are available
command -v node >/dev/null 2>&1 || { echo "ERROR: node not found on PATH" >&2; exit 10; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm not found on PATH" >&2; exit 11; }
# Run production build
NODE_ENV=production npm run build || { echo "ERROR: build failed" >&2; exit 20; }
[ -d build ] || { echo "ERROR: build directory missing after build" >&2; exit 21; }
# Success
exit 0
