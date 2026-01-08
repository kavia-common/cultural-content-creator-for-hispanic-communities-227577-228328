#!/usr/bin/env bash
set -euo pipefail
WS="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
LOG=/tmp/step_validation_005.log
SERVE_LOG=/tmp/serve_build.log
exec > >(tee -a "$LOG") 2>&1
cd "$WS"
# Ensure package.json exists
if [ ! -f package.json ]; then echo "ERROR: package.json not found in workspace $WS" >&2; exit 1; fi
# Ensure build script exists
if ! node -e "let p=require('./package.json'); if(!p.scripts||!p.scripts.build) process.exit(1)" >/dev/null 2>&1; then echo "ERROR: package.json build script missing" >&2; exit 2; fi
# Run production build
npm run build || { echo "ERROR: npm run build failed" >&2; exit 3; }
# Read PORT from .env or default
PORT=$(awk -F= '/^PORT=/ {gsub(/\r/,"",$2); print $2; exit} END{ if(NR==0) print 3000 }' .env 2>/dev/null || echo 3000)
[ -z "$PORT" ] && PORT=3000
# Start serve preferring 127.0.0.1 binding
( npx --yes serve -s build -l 127.0.0.1:"$PORT" >"$SERVE_LOG" 2>&1 & ) || true
SG_PID=$!
sleep 0.5
# Fallback if initial start didn't create process
if ! ps -p "$SG_PID" >/dev/null 2>&1; then
  echo "serve initial start failed; trying fallback -l $PORT"
  ( npx --yes serve -s build -l "$PORT" >"$SERVE_LOG" 2>&1 & ) || { echo "ERROR: npx serve failed to start" >&2; tail -n 200 "$SERVE_LOG" 2>/dev/null || true; exit 4; }
  SG_PID=$!
fi
echo "serve_pid=$SG_PID"
sleep 0.5
PGID=$(ps -o pgid= "$SG_PID" | tr -d ' ' || true)
if [ -z "$PGID" ]; then PGID="$SG_PID"; fi
# Poll until HTTP healthy or timeout
TIMEOUT=120; WAIT=1; ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  sleep $WAIT; ELAPSED=$((ELAPSED+WAIT))
  if curl -sSf "http://127.0.0.1:$PORT" >/dev/null 2>&1; then break; fi
  if [ $WAIT -lt 8 ]; then WAIT=$((WAIT*2)); fi
done
if [ $ELAPSED -ge $TIMEOUT ]; then
  echo "ERROR: server did not start within ${TIMEOUT}s" >&2
  kill -- -"$PGID" >/dev/null 2>&1 || kill "$SG_PID" >/dev/null 2>&1 || true
  exit 5
fi
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT")
case "$STATUS" in 2*|3*) echo "validation_http_status=$STATUS";; *) echo "ERROR: unexpected_http_status=$STATUS" >&2; kill -- -"$PGID" >/dev/null 2>&1 || kill "$SG_PID" >/dev/null 2>&1 || true; exit 6;; esac
# Stop server cleanly by killing process group
kill -- -"$PGID" >/dev/null 2>&1 || kill "$SG_PID" >/dev/null 2>&1 || true
sleep 1
if ps -p "$SG_PID" >/dev/null 2>&1; then kill -9 "$SG_PID" 2>/dev/null || true; fi
# Provide evidence
echo "---- serve log (tail) ----"
tail -n 200 "$SERVE_LOG" 2>/dev/null || true
echo "---- build directory size ----"
du -sh build || true
