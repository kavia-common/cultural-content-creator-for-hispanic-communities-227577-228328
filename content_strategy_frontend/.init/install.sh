#!/usr/bin/env bash
set -euo pipefail
WS="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
LOG=/tmp/step_dependencies_003.log
PKG_INFO=/tmp/step_pkg_manager.info
exec > >(tee -a "$LOG") 2>&1
cd "$WS"
if [ ! -f package.json ]; then echo "ERROR: package.json missing; scaffold may have failed" >&2; exit 2; fi
USE_YARN=0
if [ -f yarn.lock ]; then USE_YARN=1; echo "yarn_lock_detected=1" >> "$LOG"; fi
# Record package manager for downstream steps
echo "USE_YARN=$USE_YARN" > "$PKG_INFO"
# Lockfile-aware install
if [ -f package-lock.json ]; then
  echo "Running npm ci"
  npm ci --no-audit --no-fund
else
  if [ "$USE_YARN" -eq 1 ]; then
    echo "Running yarn install --frozen-lockfile"
    yarn install --frozen-lockfile
  else
    if [ ! -d node_modules ]; then
      echo "Running npm install"
      npm install --no-audit --no-fund
    else
      echo "node_modules exists; skipping npm install"
    fi
  fi
fi
# Install missing packages only when not using lockfile installs
if [ ! -f package-lock.json ] && [ "$USE_YARN" -ne 1 ]; then
  MISSING=("react" "react-dom" "dotenv" "cross-env")
  for p in "${MISSING[@]}"; do
    node -e "try{require('module').createRequire(process.cwd())('$p');}catch(e){process.exit(1);}" >/dev/null 2>&1 || npm i --no-audit --no-fund "$p"
  done
  DEV_MISSING=("jest" "eslint" "@testing-library/react" "@testing-library/jest-dom" "react-scripts")
  for p in "${DEV_MISSING[@]}"; do
    node -e "try{require('module').createRequire(process.cwd())('$p');}catch(e){process.exit(1);}" >/dev/null 2>&1 || npm i --no-audit --no-fund --save-dev "$p"
  done
fi
# If TypeScript project, ensure types present
if [ -f tsconfig.json ]; then
  if [ "$USE_YARN" -eq 1 ]; then
    yarn add -D typescript @types/react || true
  else
    npm i --no-audit --no-fund --save-dev typescript @types/react || true
  fi
fi
# Minimal ESLint config (idempotent)
if [ ! -f "$WS/.eslintrc.json" ]; then
  cat > "$WS/.eslintrc.json" <<'EOF'
{
  "env": {"browser": true, "es2021": true},
  "extends": ["eslint:recommended", "plugin:react/recommended"],
  "parserOptions": {"ecmaVersion": 12, "sourceType": "module"},
  "settings": {"react": {"version": "detect"}}
}
EOF
fi
# Log versions of key tools
command -v create-react-app >/dev/null 2>&1 && echo "create-react-app_global=$(create-react-app --version 2>/dev/null || true)"
command -v yarn >/dev/null 2>&1 && echo "yarn_version=$(yarn --version 2>/dev/null || true)"
npm -v >/dev/null 2>&1 && echo "npm_version=$(npm -v)"
node -v >/dev/null 2>&1 && echo "node_version=$(node -v)"
