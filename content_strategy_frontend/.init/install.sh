#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
# fail early if no package.json (scaffold step should have created one)
[ -f package.json ] || { echo "package.json missing - run scaffold first" >&2; exit 2; }
# quick network check
if ! curl -sSf --max-time 5 https://registry.npmjs.org/ >/dev/null 2>&1; then echo "Network unavailable for npm installs - aborting" >&2; exit 3; fi
# record checksum
TMP_SUM=$(mktemp)
sha256sum package.json | awk '{print $1}' > "$TMP_SUM"
PKG_SUM_BEFORE=$(cat "$TMP_SUM")
# ensure react/react-dom pinned minimally if absent
TMP_CHANGED=$(mktemp)
node -e "let p=require('./package.json'); p.dependencies=p.dependencies||{}; let changed=false; if(!p.dependencies.react && !p.devDependencies?.react){ p.dependencies.react='^18.2.0'; p.dependencies['react-dom']='^18.2.0'; changed=true } else if(p.dependencies.react && (p.dependencies.react==='')){ delete p.dependencies.react; changed=true } if(changed) require('fs').writeFileSync('package.json', JSON.stringify(p,null,2)); console.log(changed)" > "$TMP_CHANGED" 2>/dev/null || true
PKG_CHANGED=$(grep -q "true" "$TMP_CHANGED" >/dev/null 2>&1 && echo true || echo false)
# ensure devDependencies (pinned minimal versions)
TMP_NEED_DEV=$(mktemp)
node -e "let p=require('./package.json'); p.devDependencies=p.devDependencies||{}; const pins={vitest:'^1.0.0','@testing-library/react':'^14.0.0',jsdom:'^22.0.0',serve:'^14.0.0'}; let need=false; Object.entries(pins).forEach(([k,v])=>{ if(!p.dependencies?.[k] && !p.devDependencies?.[k]){ p.devDependencies[k]=v; need=true }}); if(need) require('fs').writeFileSync('package.json', JSON.stringify(p,null,2)); console.log(need)" > "$TMP_NEED_DEV" 2>/dev/null || true
NEED_DEVDEPS=$(grep -q "true" "$TMP_NEED_DEV" >/dev/null 2>&1 && echo true || echo false)
# choose install strategy
if [ -f package-lock.json ] && [ "$PKG_CHANGED" = false ] && [ "$NEED_DEVDEPS" = false ]; then
  npm ci --no-audit --no-fund --silent || { echo "npm ci failed" >&2; rm -f "$TMP_SUM" "$TMP_CHANGED" "$TMP_NEED_DEV"; exit 4; }
else
  npm install --no-audit --no-fund --silent || { echo "npm install failed" >&2; rm -f "$TMP_SUM" "$TMP_CHANGED" "$TMP_NEED_DEV"; exit 5; }
fi
# verify node_modules
if [ ! -d node_modules ]; then echo "node_modules missing after install" >&2; rm -f "$TMP_SUM" "$TMP_CHANGED" "$TMP_NEED_DEV"; exit 6; fi
# TypeScript support: if tsconfig or .ts/.tsx present, ensure types installed
shopt -s nullglob
ts_files=(src/*.ts src/*.tsx)
if [ -f tsconfig.json ] || [ ${#ts_files[@]} -gt 0 ]; then
  TMP_NEED_TS=$(mktemp)
  node -e "let p=require('./package.json'); p.devDependencies=p.devDependencies||{}; let need=false; if(!p.devDependencies.typescript && !p.dependencies?.typescript){ p.devDependencies.typescript='^5.3.0'; p.devDependencies['@types/react']='^18.0.0'; p.devDependencies['@types/react-dom']='^18.0.0'; need=true } if(need) require('fs').writeFileSync('package.json', JSON.stringify(p,null,2)); console.log(need)" > "$TMP_NEED_TS" 2>/dev/null || true
  if grep -q "true" "$TMP_NEED_TS" 2>/dev/null; then
    npm install --no-audit --no-fund --silent || { echo "npm install (ts) failed" >&2; rm -f "$TMP_SUM" "$TMP_CHANGED" "$TMP_NEED_DEV" "$TMP_NEED_TS"; exit 7; }
  fi
  rm -f "$TMP_NEED_TS"
fi
# Create vitest config + minimal smoke test if missing (respect package type)
PKG_TYPE=$(node -e "let p=require('./package.json'); console.log(p.type||'commonjs')")
if [ "$PKG_TYPE" = "module" ]; then
  [ -f vitest.config.mjs ] || cat > vitest.config.mjs <<'EOF'
import { defineConfig } from 'vitest/config'
export default defineConfig({test:{environment:'jsdom'}})
EOF
  mkdir -p test
  [ -f test/smoke.test.mjs ] || cat > test/smoke.test.mjs <<'EOF'
import { describe, it, expect } from 'vitest'
describe('smoke', () => it('passes', () => expect(true).toBe(true)))
EOF
else
  [ -f vitest.config.cjs ] || cat > vitest.config.cjs <<'EOF'
module.exports = { test: { environment: 'jsdom' } }
EOF
  mkdir -p test
  [ -f test/smoke.test.js ] || cat > test/smoke.test.js <<'EOF'
const { describe, it, expect } = require('vitest')
describe('smoke', () => it('passes', () => expect(true).toBe(true)))
EOF
fi
# cleanup temp files
rm -f "$TMP_SUM" "$TMP_CHANGED" "$TMP_NEED_DEV"
exit 0
