# Static Analysis Report (ESLint / optional TypeScript)

Container: `content_strategy_frontend`  
Date: 2026-01-08

## Commands executed

1. ESLint (configured script)
```bash
npm run lint --silent
```
Exit status: `1`  
Result summary (as reported by the tool run): **2 errors**, **54 warnings**

2. TypeScript typecheck (only if TS config exists)
```bash
(test -f tsconfig.json && npx tsc --noEmit) || echo "(no tsconfig.json; skipping tsc)"
```
Result: **skipped** (no `tsconfig.json` present)

3. ESLint (repository-wide check, stricter; includes files outside lint script)
```bash
npx eslint . --ext .js,.jsx --max-warnings 0
```
Exit status: `1`  
Result summary (as reported by the tool run): **3 errors**, **59 warnings**

> Note: `npm run lint` targets only `src/**/*.{js,jsx}` and `cypress/**/*.{js,jsx}`.  
> The repository-wide eslint command includes `cypress.config.js`, which is why it surfaced an additional config-related error.

## Key findings

### Errors
- `src/__tests__/openaiCaptions.test.js`: `no-useless-escape` (2 occurrences)
- `cypress.config.js`: `no-undef` (`module` is not defined) — only when linting the whole repo via `eslint .`

### Warnings
Predominantly `prettier/prettier` formatting warnings across many files.

Non-format warnings called out:
- `src/state/workflow.js`: unused import `useCallback`
- `src/__tests__/PreviewPanel.test.js`: unused variable `user`
- `src/components/settings/SettingsModal.js`: `react-hooks/exhaustive-deps` suggests unnecessary dependencies for a `useMemo`

## Recommended next steps
1. Run automated fixes:
   - `npm run lint:fix`
   - optionally `npm run format` (or `npm run format:check` in CI)
2. Address remaining semantic warnings (unused vars/imports, hook deps).
3. Decide whether to lint `cypress.config.js` as part of the main lint script; if yes, configure ESLint to treat config files as Node/CommonJS (so `module` is defined).
