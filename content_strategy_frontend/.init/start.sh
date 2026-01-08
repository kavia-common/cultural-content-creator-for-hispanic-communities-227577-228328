#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
# start static server using local http-server binary; this script starts it in background session and prints PID and PGID
PORT=3000
HS_BIN="./node_modules/.bin/http-server"
if [ ! -x "$HS_BIN" ]; then echo "http-server not found in node_modules; ensure devDependencies installed" >&2 && exit 7; fi
LOG=/tmp/serve_build.log
setsid sh -c "$HS_BIN ./build -p ${PORT} > \"$LOG\" 2>&1" &
SVC_PID=$!
# allow short time for kernel to register
sleep 0.2
PGID=$(ps -o pgid= "$SVC_PID" | tr -d ' ')
echo "$SVC_PID" > /tmp/serve_build.pid
echo "$PGID" > /tmp/serve_build.pgid
echo "started pid=$SVC_PID pgid=$PGID log=$LOG"
