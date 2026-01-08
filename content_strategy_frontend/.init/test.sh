#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
PORT=${PORT:-5173}
# basic HTTP check
if curl -sS --max-time 5 "http://127.0.0.1:$PORT/" -o /dev/null; then
  CT=$(curl -sS -D - --max-time 3 "http://127.0.0.1:$PORT/" -o /dev/null | awk -F': ' '/^[Cc]ontent-[Tt]ype:/ {print substr($0, index($0,$2)); exit}')
  echo "ok: content-type=${CT:-unknown}"
  exit 0
else
  echo "failed: http request to http://127.0.0.1:$PORT/ failed" >&2
  exit 6
fi
