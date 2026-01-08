#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
PORT=${PORT:-5173}
LOG=$(mktemp)
PID=""
PGID=""
# prefer local binaries
if [ -x ./node_modules/.bin/vite ]; then
  setsid ./node_modules/.bin/vite preview --port "$PORT" >"$LOG" 2>&1 &
  PID=$!
elif [ -x ./node_modules/.bin/serve ]; then
  # ensure dist exists before using serve
  if [ ! -d dist ]; then echo "dist/ missing for serve" >&2; rm -f "$LOG"; exit 4; fi
  setsid ./node_modules/.bin/serve -s dist -l "$PORT" >"$LOG" 2>&1 &
  PID=$!
else
  HAS_PREVIEW=$(node -e "let p=require('./package.json'); console.log(Boolean(p.scripts&&p.scripts.preview))")
  if [ "$HAS_PREVIEW" = "true" ]; then
    setsid sh -c "npm run preview --silent -- --port $PORT" >"$LOG" 2>&1 &
    PID=$!
  else
    echo "No preview/serve binary available" >&2; rm -f "$LOG"; exit 5
  fi
fi
# safe PGID retrieval
if [ -n "${PID:-}" ]; then PGID=$(ps -o pgid= -p "$PID" 2>/dev/null | tr -d ' ' || echo ""); fi
# expose values for caller
printf "%s\n" "$LOG" > "${TMPDIR:-/tmp}/.last_preview_log_path" 2>/dev/null || true
printf "%s\n" "${PID:-}" > "${TMPDIR:-/tmp}/.last_preview_pid" 2>/dev/null || true
printf "%s\n" "${PGID:-}" > "${TMPDIR:-/tmp}/.last_preview_pgid" 2>/dev/null || true
echo "$LOG"
exit 0
