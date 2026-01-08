#!/usr/bin/env bash
set -euo pipefail
WS="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
LOG=/tmp/step_scaffold_002.log
exec > >(tee -a "$LOG") 2>&1
cd "$WS"
# Skip if package.json exists
if [ -f "$WS/package.json" ]; then echo "package.json exists; skipping scaffold"; exit 0; fi
# Check directory emptiness excluding .git
COUNT=$(ls -A "$WS" 2>/dev/null | grep -v '^.git$' | wc -l || echo 0)
if [ "$COUNT" -gt 0 ]; then echo "ERROR: workspace not empty (excluding .git); refusing to scaffold" >&2; exit 2; fi
# Ensure npx available
if ! command -v npx >/dev/null 2>&1; then echo "ERROR: npx not found" >&2; exit 3; fi
# Use create-react-app non-interactively (prefer preinstalled tooling)
if ! npx --yes create-react-app@latest . --use-npm --template cra-template --silent; then echo "ERROR: create-react-app scaffolding failed" >&2; exit 4; fi
# Create .env and assets if missing
if [ ! -f "$WS/.env" ]; then cat > "$WS/.env" <<'EOF'
NODE_ENV=development
PORT=3000
EOF
fi
mkdir -p "$WS/public/assets" && touch "$WS/public/assets/.keep"
# Merge npm scripts: add missing scripts only
node -e "const fs=require('fs');const p=require('./package.json');p.scripts=p.scripts||{};if(!p.scripts.start)p.scripts.start='react-scripts start';if(!p.scripts.build)p.scripts.build='react-scripts build';if(!p.scripts.test)p.scripts.test='react-scripts test --watchAll=false';fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
# Final validation: ensure package.json now exists
if [ ! -f "$WS/package.json" ]; then echo "ERROR: expected package.json after scaffold" >&2; exit 5; fi
echo "Scaffold completed successfully"
