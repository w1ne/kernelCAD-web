# Testing Strategy

kernelCAD uses a layered approach to testing: fast unit tests, UI/state integration tests, optional heavy kernel suites, and Playwright E2E.

## 1) Unit / Logic (Vitest)
- **Location**: `src/**/*.test.ts`
- **Environment**: `node` by default (some tests opt into `happy-dom` / `jsdom` via file-level directives)
- **Run**:
  - `npm test` (runs `vitest run`)
  - `npm run test:watch` (interactive)

## 2) UI / Component Integration (Vitest + happy-dom/jsdom)
- **Location**: `src/**/*.test.tsx`
- **Notes**: These validate wiring (toolbar → dialogs → code insertion → state), typically mocking the heavy 3D/kernel layer.
- **Run**:
  - `npm test`

## 3) Optional “heavy” suites (gated)
Some suites are intentionally gated because they can be slower and/or require WebAssembly/OpenCascade behavior that’s not reliable in all CI/JSDOM environments.

- **Replicad/OpenCascade E2E (Vitest)**: `src/integration/e2e_workflows.test.ts`
  - **Run**: `KERNELCAD_E2E=1 npm test`
- **UI workflow smoke (Vitest + jsdom)**: `src/integration/ui_workflows.test.tsx`
  - **Run**: `KERNELCAD_UI_E2E=1 npm test`

## 4) Browser E2E (Playwright)
- **Location**: `tests/*.spec.ts`
- **Run**:
  - `npx playwright test`
  - Report: `npx playwright show-report`

## Quick command summary
- **Lint**: `npm run lint`
- **Vitest (once)**: `npm test`
- **Vitest (watch)**: `npm run test:watch`
- **Playwright**: `npx playwright test`
- **Heavy suites**: `KERNELCAD_E2E=1 npm test` / `KERNELCAD_UI_E2E=1 npm test`

