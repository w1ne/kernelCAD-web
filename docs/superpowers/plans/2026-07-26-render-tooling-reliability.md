# Render Tooling Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make missing Playwright Chromium failures actionable and prevent canonical Z-up view labels from being mistaken for product-semantic exterior views.

**Architecture:** Keep the current Playwright renderer and camera transforms. Add a narrow launch-error classifier at the shared browser bootstrap, then clarify the MCP view descriptions. Verify the existing Rollup optional-dependency representation rather than changing it without evidence.

**Tech Stack:** TypeScript, Playwright, Vitest, npm lockfile, KernelCAD headless renderer.

---

### Task 1: Missing Chromium Diagnostic

**Files:**
- Create: `tests/unit/render/playwrightLaunchDiagnostic.test.ts`
- Modify: `src/agent/render/headlessRender.ts`

- [ ] **Step 1: Write failing classifier tests**

Add tests proving:

```typescript
expect(formatPlaywrightLaunchError(
  new Error("browserType.launch: Executable doesn't exist at /cache/chrome\nPlease run: npx playwright install"),
)).toMatch(/npx playwright install chromium/);

const unrelated = new Error('browserType.launch: permission denied');
expect(formatPlaywrightLaunchError(unrelated)).toBe(unrelated);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npx vitest run tests/unit/render/playwrightLaunchDiagnostic.test.ts
```

Expected: failure because `formatPlaywrightLaunchError` is not exported.

- [ ] **Step 3: Implement the narrow classifier**

Export a helper from `headlessRender.ts` that:

- returns unrelated errors unchanged;
- recognizes only Playwright’s missing-executable message;
- returns an `Error` containing `npx playwright install chromium`;
- preserves the original failure as `cause`.

Wrap only the fresh `chromium.launch(...)` call with this helper. Do not relabel CDP, navigation, timeout, or permission errors.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```bash
npx vitest run tests/unit/render/playwrightLaunchDiagnostic.test.ts
```

Expected: all tests pass.

### Task 2: Canonical View Semantics

**Files:**
- Modify: `tests/unit/mcp/renderPreviewTool.test.ts`
- Modify: `src/agent/mcp/tools/renderPreview.ts`

- [ ] **Step 1: Add failing description assertions**

Assert that:

```typescript
expect(VIEW_DESCRIPTIONS.top).toMatch(/geometric \+Z/i);
expect(VIEW_DESCRIPTIONS.top).toMatch(/not necessarily.*exterior/i);
expect(VIEW_DESCRIPTIONS.iso).toMatch(/model orientation/i);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npx vitest run tests/unit/mcp/renderPreviewTool.test.ts
```

Expected: the new semantic-label assertions fail against current descriptions.

- [ ] **Step 3: Clarify descriptions without changing camera math**

Update `VIEW_DESCRIPTIONS.top` and `.iso` to state that canonical views are geometric Z-up views and do not infer which side of an imported part is its product exterior.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```bash
npx vitest run tests/unit/mcp/renderPreviewTool.test.ts
```

Expected: all tests pass.

### Task 3: Dependency and Merge Verification

**Files:**
- Verify: `package.json`
- Verify: `package-lock.json`

- [ ] **Step 1: Verify Rollup’s platform packages are already optional**

Run:

```bash
node -e "const l=require('./package-lock.json'); const r=l.packages['node_modules/rollup']; if(!r?.optionalDependencies?.['@rollup/rollup-darwin-arm64']) process.exit(1)"
```

Expected: exit 0. No package change is warranted because the lockfile already uses Rollup’s portable optional-dependency model; the observed failure followed an interrupted install.

- [ ] **Step 2: Run focused validation**

Run:

```bash
npx vitest run \
  tests/unit/render/playwrightLaunchDiagnostic.test.ts \
  tests/unit/mcp/renderPreviewTool.test.ts \
  tests/unit/cli/renderCommand.test.ts
npm run typecheck
npm run build:cli
npm run build:player
```

Expected: all commands pass.

- [ ] **Step 3: Review the branch diff**

Run:

```bash
git diff --check
git status --short
```

Expected: only the approved spec, plan, focused tests, and two focused source files are changed.

- [ ] **Step 4: Commit the implementation**

Run:

```bash
git add \
  src/agent/render/headlessRender.ts \
  src/agent/mcp/tools/renderPreview.ts \
  tests/unit/render/playwrightLaunchDiagnostic.test.ts \
  tests/unit/mcp/renderPreviewTool.test.ts \
  docs/superpowers/plans/2026-07-26-render-tooling-reliability.md
git commit -m "fix: improve render tooling diagnostics"
```

- [ ] **Step 5: Merge into develop**

From the repository’s `develop` branch, merge `fix/render-tooling-reliability` with a non-fast-forward merge, rerun the focused tests, and report the resulting merge commit.
