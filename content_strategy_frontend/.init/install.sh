#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
# require node/npm
command -v node >/dev/null 2>&1 || (echo "node not found" >&2 && exit 2)
command -v npm >/dev/null 2>&1 || (echo "npm not found" >&2 && exit 2)
# prevent root-owned node_modules: fail fast if running as root
if [ "$(id -u)" -eq 0 ]; then
  echo "Refusing to run npm install as root inside workspace; re-run as the workspace owner to avoid root-owned node_modules." >&2
  exit 3
fi
# compute lock identity (lockfile checksum + node semver)
LOCKFILE=""
if [ -f package-lock.json ]; then LOCKFILE=package-lock.json
elif [ -f yarn.lock ]; then LOCKFILE=yarn.lock
fi
LOCKSUM=""
if [ -n "$LOCKFILE" ]; then LOCKSUM=$(sha256sum "$LOCKFILE" | cut -d' ' -f1); fi
NODE_VER=$(node -v || true)
IDENT="${NODE_VER}:${LOCKSUM}"
CHKFILE=.installed-locksum
if [ -d node_modules ] && [ -f "$CHKFILE" ] && [ "$(cat $CHKFILE)" = "$IDENT" ]; then
  exit 0
fi
# remove stale node_modules when identity changed
if [ -d node_modules ] && ( [ ! -f "$CHKFILE" ] || [ "$(cat $CHKFILE)" != "$IDENT" ] ); then
  rm -rf node_modules
fi
# install: prefer npm ci when package-lock.json exists
if [ -f package-lock.json ]; then
  npm ci --silent --no-audit --no-fund
else
  npm i --silent --no-audit --no-fund
fi
# verify ./node_modules/.bin
[ -d ./node_modules/.bin ] || (echo "node_modules/.bin missing after install" >&2 && exit 4)
# persist identity
printf '%s' "$IDENT" > "$CHKFILE"
node -v && npm -v
