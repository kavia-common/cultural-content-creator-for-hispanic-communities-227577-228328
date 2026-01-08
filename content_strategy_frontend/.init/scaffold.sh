#!/usr/bin/env bash
set -euo pipefail
# deterministic minimal CRA-compatible scaffold (JS)
WORKSPACE="/home/kavia/workspace/code-generation/cultural-content-creator-for-hispanic-communities-227577-228328/content_strategy_frontend"
mkdir -p "$WORKSPACE" && cd "$WORKSPACE"
# 1) Persist minimal environment vars atomically for future sessions
TMP_ENV_FILE=$(mktemp)
cat > "$TMP_ENV_FILE" <<'ENVEOF'
# persisted by init: default NODE_ENV and REACT_APP_API_ENDPOINT
export NODE_ENV="development"
export REACT_APP_API_ENDPOINT=""
ENVEOF
# move into /etc/profile.d atomically (requires sudo)
sudo mv -f "$TMP_ENV_FILE" /etc/profile.d/react_env.sh && sudo chmod 644 /etc/profile.d/react_env.sh || (echo "FAILED to write /etc/profile.d/react_env.sh" >&2 && exit 2)
# 2) Validate node & npm presence and ensure Node >=16.14.0
command -v node >/dev/null 2>&1 || { echo "node not found on PATH" >&2; exit 3; }
command -v npm >/dev/null 2>&1 || { echo "npm not found on PATH" >&2; exit 4; }
# exact semver check using node
node -e "const v=process.versions.node.split('.').map(Number); const ok=(v[0]>16)||(v[0]===16&&(v[1]>14||v[1]===14&&v[2]>=0))||v[0]>16; if(!ok){console.error('Node version too old:',process.versions.node); process.exit(5);} process.exit(0);"
# 3) Single deterministic check: skip scaffold if package.json declares react/react-dom/react-scripts
if [ -f package.json ]; then
  if node -e "try{const p=require('./package.json'); if(p.dependencies&&p.dependencies.react&&p.dependencies['react-dom']&&p.dependencies['react-scripts']) process.exit(0);}catch(e){} process.exit(1)"; then
    echo "Detected existing CRA deps in package.json; skipping scaffold." >/dev/null
    exit 0
  fi
fi
# 4) Create minimal project structure and files
mkdir -p public src
cat > package.json <<'EOF'
{
  "name": "content_strategy_frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test --env=jsdom",
    "lint": "eslint . --ext .js,.jsx || true",
    "serve-build": "http-server ./build -p 3000"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "^5.0.1"
  },
  "devDependencies": {
    "react-test-renderer": "^18.2.0",
    "http-server": "^14.1.1"
  },
  "browserslist": [">0.2%","not dead","not op_mini all"]
}
EOF
cat > public/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Content Strategy Frontend</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
EOF
cat > src/index.js <<'EOF'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
const root = createRoot(document.getElementById('root'))
root.render(<App />)
EOF
cat > src/App.js <<'EOF'
import React from 'react'
export default function App(){
  return React.createElement('div', null, 'Content Strategy Frontend - dev environment')
}
EOF
# minimal eslint config if missing
if [ ! -f .eslintrc.json ]; then
  cat > .eslintrc.json <<'EOF'
{
  "env": {"browser": true, "es2021": true},
  "extends": "eslint:recommended",
  "parserOptions": {"ecmaVersion": 12, "sourceType": "module"},
  "rules": {}
}
EOF
fi
# ensure files are owned by current user (avoid root-owned files when run with sudo accidentally)
chown -R "$(id -u):$(id -g)" "$WORKSPACE" 2>/dev/null || true
# end of scaffold
