#!/usr/bin/env bash
set -euo pipefail
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
cd "$WORKSPACE"
# If package.json exists and project has typical entries, skip scaffolding
if [ -f package.json ]; then
  shopt -s nullglob
  files=(src/main.* src/index.* index.html)
  have=0
  for f in "${files[@]}"; do [ -e "$f" ] && have=1 && break; done
  if [ "$have" -eq 1 ]; then echo "existing project detected, skipping scaffold"; exit 0; fi
fi
# Workspace safety: do not overwrite if non-empty and no package.json
shopt -s nullglob dotglob
non_dot_items=()
for p in *; do
  case "$p" in
    .|..) continue ;;
    .git) continue ;;
    .*) continue ;;
    *) non_dot_items+=("$p") ;;
  esac
done
if [ ${#non_dot_items[@]} -gt 0 ] && [ ! -f package.json ]; then echo "workspace contains files but no package.json - aborting to avoid overwrite" >&2; exit 6; fi
# Ensure network available before remote scaffold
if ! curl -sSf --max-time 5 https://registry.npmjs.org/ >/dev/null 2>&1; then echo "Network unavailable; cannot scaffold remotely" >&2; exit 7; fi
# Prefer preinstalled create-vite; perform non-interactive scaffolding without installing deps
if command -v create-vite >/dev/null 2>&1; then
  create-vite . --template react --yes || { echo "create-vite failed" >&2; exit 8; }
else
  npx --yes create-vite@latest . --template react --no-install || { echo "npx create-vite failed" >&2; exit 9; }
fi
# Ensure basic scripts exist but DO NOT insert empty versions
node -e "let p=require('./package.json'); p.name=p.name||'content_strategy_frontend'; p.scripts=p.scripts||{}; p.scripts.dev=p.scripts.dev||'vite'; p.scripts.build=p.scripts.build||'vite build'; p.scripts.preview=p.scripts.preview||'vite preview --port 5173'; p.scripts.test=p.scripts.test||'vitest'; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2))"
# Ensure .env exists (do not overwrite existing)
[ -f .env ] || cat > .env <<'EOF'
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:8000/api
EOF
exit 0
