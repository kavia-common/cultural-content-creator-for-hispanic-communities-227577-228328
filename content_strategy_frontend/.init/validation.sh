#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
PORT_DEFAULT=5000
VALIDATION_PORT="${VALIDATION_PORT:-$PORT_DEFAULT}"
[ -d build ] || { echo "ERROR: build directory missing; run build step" >&2; exit 21; }
if [ -x ./node_modules/.bin/serve ]; then SERVE_BIN="./node_modules/.bin/serve"; elif command -v serve >/dev/null 2>&1; then SERVE_BIN="$(command -v serve)"; else echo "ERROR: serve not found locally or globally" >&2; exit 22; fi
LOG=/tmp/serve.log
if ss -ltn | awk '{print $4}' | grep -q ":${VALIDATION_PORT}$"; then echo "ERROR: port ${VALIDATION_PORT} already in use" >&2; exit 23; fi
if "$SERVE_BIN" --help 2>&1 | grep -q "-l, --listen"; then
  "$SERVE_BIN" -s build -l "$VALIDATION_PORT" > "$LOG" 2>&1 &
else
  "$SERVE_BIN" -s build --listen "$VALIDATION_PORT" > "$LOG" 2>&1 &
fi
PID=$!
trap 'kill "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true' EXIT INT TERM
for i in $(seq 1 30); do sleep 1; if curl -sSfL "http://127.0.0.1:${VALIDATION_PORT}/" >/dev/null 2>&1; then break; fi; if [ "$i" -eq 30 ]; then echo "ERROR: server did not respond after 30s" >&2; sed -n '1,200p' "$LOG" >&2 || true; exit 24; fi; done
HTML=$(curl -sSfL "http://127.0.0.1:${VALIDATION_PORT}/")
echo "$HTML" | grep -q "Hello from content_strategy_frontend" || { echo "ERROR: expected text not found" >&2; sed -n '1,200p' "$LOG" >&2 || true; exit 25; }
kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
trap - EXIT INT TERM
echo "validation: build served and responded successfully"
exit 0
