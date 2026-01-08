#!/usr/bin/env bash
set -euo pipefail
# Idempotent dependency installer for the project workspace
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
# validate runtime
command -v node >/dev/null 2>&1 || { echo "ERROR: node not found" >&2; exit 2; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm not found" >&2; exit 3; }
# detect yarn/lockfile usage
YARN_PRESENT=0
command -v yarn >/dev/null 2>&1 && YARN_PRESENT=1
USE_YARN=0
[ -f yarn.lock ] && USE_YARN=1
if [ "$USE_YARN" -eq 1 ] && [ "$YARN_PRESENT" -ne 1 ]; then
  echo "ERROR: yarn.lock present but yarn not installed" >&2; exit 5
fi
if [ "$USE_YARN" -eq 0 ]; then
  NPM_VER=$(npm --version 2>/dev/null || echo 0)
  NPM_MAJOR=${NPM_VER%%.*}
  if [ "$NPM_MAJOR" -lt 8 ]; then
    echo "ERROR: npm major=$NPM_MAJOR too old; require npm>=8 or provide yarn.lock and yarn" >&2; exit 6
  fi
fi
# idempotency stamp check: skip install when node_modules exists and is newer than manifests
STAMP="$WORKSPACE/.install_stamp"
NEEDS_INSTALL=0
if [ ! -d node_modules ]; then
  NEEDS_INSTALL=1
else
  [ -f package.json ] && ([ ! -f "$STAMP" ] || [ package.json -nt "$STAMP" ]) && NEEDS_INSTALL=1
  [ -f package-lock.json ] && ([ ! -f "$STAMP" ] || [ package-lock.json -nt "$STAMP" ]) && NEEDS_INSTALL=1
  [ -f yarn.lock ] && ([ ! -f "$STAMP" ] || [ yarn.lock -nt "$STAMP" ]) && NEEDS_INSTALL=1
fi
if [ "$NEEDS_INSTALL" -eq 1 ]; then
  if [ "$USE_YARN" -eq 1 ]; then
    # prefer frozen lockfile to ensure reproducible installs
    NODE_ENV=development yarn install --frozen-lockfile --silent
  else
    if [ -f package-lock.json ]; then
      NODE_ENV=development npm ci --no-audit --no-fund --also=dev --quiet
    else
      NODE_ENV=development npm i --no-audit --no-fund --also=dev --quiet
    fi
  fi
  date +%s > "$STAMP"
fi
# verify local binaries (accept global fallback)
if [ -x ./node_modules/.bin/react-scripts ]; then :; elif command -v react-scripts >/dev/null 2>&1; then :; else echo "ERROR: react-scripts not found locally or globally" >&2; exit 10; fi
if [ -x ./node_modules/.bin/serve ]; then :; elif command -v serve >/dev/null 2>&1; then :; else echo "ERROR: serve not found locally or globally" >&2; exit 11; fi
exit 0
