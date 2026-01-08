#!/usr/bin/env bash
set -euo pipefail
# validation: build, preview, probe, and clean shutdown
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
[ -f package.json ] || { echo "package.json missing" >&2; exit 2; }
export NODE_ENV=production
# build
npm run build --silent || { echo "build failed" >&2; exit 3; }
# verify dist exists
if [ ! -d dist ]; then echo "build did not produce dist/" >&2; exit 4; fi
PORT=5173
LOG=$(mktemp -t preview-log.XXXXXX)
PID=""
PGID=""
# choose preview binary (prefer project-local)
if [ -x ./node_modules/.bin/vite ]; then
  setsid ./node_modules/.bin/vite preview --port "$PORT" >"$LOG" 2>&1 &
  PID=$!
elif [ -x ./node_modules/.bin/serve ]; then
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
# nil-safe PGID retrieval
if [ -n "${PID:-}" ]; then
  PGID=$(ps -o pgid= -p "$PID" 2>/dev/null | tr -d ' ' || echo "")
fi
# Wait for readiness (60s max)
READY=0
for i in $(seq 1 60); do
  sleep 1
  if curl -sS --max-time 2 "http://127.0.0.1:$PORT/" -o /dev/null 2>/dev/null; then READY=1; break; fi
done
if [ "$READY" -ne 1 ]; then
  echo "preview server did not start within timeout; see $LOG" >&2
  tail -n 200 "$LOG" >&2 || true
  # cleanup using nil-safe checks
  if [ -n "${PGID:-}" ]; then kill -TERM -"$PGID" 2>/dev/null || true; elif [ -n "${PID:-}" ]; then kill -TERM "$PID" 2>/dev/null || true; fi
  sleep 2
  if [ -n "${PGID:-}" ] && ps -o pid= --no-headers -g "$PGID" | grep -q . 2>/dev/null; then kill -KILL -"$PGID" 2>/dev/null || true; elif [ -n "${PID:-}" ] && kill -0 "$PID" 2>/dev/null; then kill -9 "$PID" 2>/dev/null || true; fi
  rm -f "$LOG"
  exit 6
fi
# probe and fetch Content-Type header
CT=$(curl -sS -D - --max-time 2 "http://127.0.0.1:$PORT/" -o /dev/null | awk -F': ' '/^[Cc]ontent-[Tt]ype:/ {print substr($0, index($0,$2)); exit}')
echo "Server responding. Content-Type: ${CT:-unknown} (logs: $LOG)"
# Clean shutdown
if [ -n "${PGID:-}" ]; then kill -TERM -"$PGID" 2>/dev/null || true; elif [ -n "${PID:-}" ]; then kill -TERM "$PID" 2>/dev/null || true; fi
sleep 2
if [ -n "${PGID:-}" ] && ps -o pid= --no-headers -g "$PGID" | grep -q . 2>/dev/null; then kill -KILL -"$PGID" 2>/dev/null || true; elif [ -n "${PID:-}" ] && kill -0 "$PID" 2>/dev/null; then kill -9 "$PID" 2>/dev/null || true; fi
# keep log for diagnostics
exit 0
