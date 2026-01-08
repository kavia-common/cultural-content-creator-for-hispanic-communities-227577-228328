#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
export CI=true BROWSER=none
# prefer local react-scripts binary
if [ -x ./node_modules/.bin/react-scripts ]; then
  ./node_modules/.bin/react-scripts build --silent || (echo "Build failed" >&2 && exit 5)
else
  npm run build --silent || (echo "Build failed" >&2 && exit 5)
fi
[ -d build ] || (echo "build/ not found" >&2 && exit 6)
