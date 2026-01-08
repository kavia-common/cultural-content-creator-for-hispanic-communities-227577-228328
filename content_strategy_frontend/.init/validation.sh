#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
export CI=true BROWSER=none
# BUILD: prefer local binary
if [ -x ./node_modules/.bin/react-scripts ]; then
  ./node_modules/.bin/react-scripts build --silent || (echo "Build failed" >&2 && exit 5)
else
  npm run build --silent || (echo "Build failed" >&2 && exit 5)
fi
[ -d build ] || (echo "build/ not found" >&2 && exit 6)
# SERVE: require local http-server binary from node_modules (devDependencies must provide it)
PORT=3000
HS_BIN="./node_modules/.bin/http-server"
if [ ! -x "$HS_BIN" ]; then echo "http-server not found in node_modules; ensure devDependencies installed" >&2 && exit 7; fi
LOG=/tmp/serve_build.log
# start in new session so we can kill PGID; capture PID and PGID
setsid sh -c "$HS_BIN ./build -p ${PORT} > \"$LOG\" 2>&1" &
SVC_PID=$!
# small sleep to let process start
sleep 0.2
PGID=$(ps -o pgid= "$SVC_PID" | tr -d ' ')
# ensure we always cleanup the process group
trap 'kill -TERM -"$PGID" 2>/dev/null || kill -TERM "$SVC_PID" 2>/dev/null' EXIT INT TERM
# wait for server to accept connections (20s)
for i in $(seq 1 20); do
  sleep 1
  if curl -sS --max-time 1 "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    break
  fi
  if [ $i -eq 20 ]; then
    echo "Serve did not start; logs:" >&2 && tail -n 200 "$LOG" >&2 && exit 8
  fi
done
# probe and print single evidence line
STATUS_LINE=$(curl -sS --max-time 2 -I "http://127.0.0.1:${PORT}/" | head -n 1 || true)
if [ -z "$STATUS_LINE" ]; then
  echo "probe: no response header" >&2 && exit 9
fi
echo "probe: $STATUS_LINE"
# give trap a moment to run on exit
sleep 1
