# Test Quality Audit - 2026-05-07

Scope: whole-repo inventory before the `v0.4.0` release gate.

Commands used:

- `find tests src -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' | wc -l`
- `rg --files | rg '(^tests/|\\.test\\.(ts|tsx)$|\\.spec\\.ts$)'`
- `rg -n "\\.skip|describe\\.skip|it\\.skip|test\\.skip|\\.only|describe\\.only|it\\.only|test\\.only" tests src eval scripts site --glob '*.{test,spec}.{ts,tsx}'`
- `rg -l "expect\\([^\\n]+\\)\\.toContain\\(|expect\\([^\\n]+\\)\\.not\\.toContain\\(" tests src eval scripts site --glob '*.{test,spec}.{ts,tsx}'`
- `rg -l "vi\\.mock|mockResolvedValue|mockReturnValue|mockReturnThis|jest\\.mock" tests src eval scripts site --glob '*.{test,spec}.{ts,tsx}'`

## Summary

The suite has broad coverage and several strong behavior gates: OCCT lowerer tests, CLI bundle startup, MCP spawn tests after `build:cli`, release-demo metadata validation, constraint solver tests, and real script-runtime evaluations.

The main quality problem is not test volume. It is uneven test intent. Some tests prove user-visible or kernel-visible behavior; others mostly assert implementation text, CSS classes, mocked wiring, or historical reproduction scaffolding. Those weaker tests can still be useful as narrow contract tests, but they should not be mistaken for release confidence.

## Release-Blocking Before v0.4

1. **Invalid v0.4 demo artifacts must not ship.**
   The cropped `docs/demos/v0.4/rocket-keychain` capture was removed. Regenerate it only after camera framing is visually verified.

2. **Run MCP spawn tests only after `npm run build:cli`.**
   `tests/integration/mcp/spawn.test.ts` skips when the built CLI is absent. This is acceptable for inner-loop runs because `tests/integration/cli-bundle/startup.test.ts` fails when the bundle is missing, but release verification must explicitly run `npm run build:cli` before MCP spawn tests.

3. **Do not count skipped reproduction suites as coverage.**
   Permanent skipped suites should be fixed or deleted before claiming related behavior is covered:
   - `src/lib/reproduce_empty_sketch.test.ts`
   - `src/lib/reproduction_sketch_visibility.test.ts`
   - `src/components/ErrorBoundary.test.tsx`

## High-Risk Test Patterns

### Skipped Or Env-Gated Suites

Some suites only run under environment flags or local prerequisites:

- `src/integration/ui_workflows.test.tsx` uses `KERNELCAD_UI_E2E`.
- `src/integration/e2e_workflows.test.ts` uses an E2E gate and has an inner skipped constraint test.
- fuzzing suites use opt-in flags.
- eval suites skip when the CLI is unavailable.

Policy: these are supplemental, not release proof, unless the release command explicitly enables the needed gate or builds the prerequisite artifact.

### String-Contains Codegen Tests

Files such as `src/commands/ast-integration.test.ts`, `src/lib/workflow.integration.test.ts`, and several MCP edit tests rely heavily on `toContain(...)` against generated source.

Those tests are useful for stable code-shape contracts, but they can pass while generated code is syntactically invalid or mutates the wrong AST node. Stronger pattern:

- assert the intended code fragment,
- parse the generated code,
- when practical, run the generated script or inspect the AST target node.

Concrete example: `src/commands/ast-integration.test.ts` has regression comments about not corrupting comments/string literals; those cases should assert the untouched comment/string and parse the result.

### Mock-Heavy UI Tests

`src/integration/ui_workflows.test.tsx`, `src/integration/hover_sync.test.tsx`, and several component tests mock geometry, editor, or viewer layers. These prove wiring and React state, not CAD behavior.

Keep them, but label them mentally as component-contract tests. Behavior claims need at least one real runtime, CLI, or Playwright path.

### CSS/Class Assertions

Playwright/component tests like `tests/visibility_selection.spec.ts`, `tests/tooltips_shortcuts.spec.ts`, and some layout tests assert class names, colors, or tooltip text. These are brittle when they check implementation styling rather than observable state.

Preferred pattern:

- assert ARIA state, visible labels, selected item ids, or domain state,
- keep class assertions only when the visual state itself is the contract.

### Golden Transcript Tests

`eval/golden.test.ts` compares generated scripts, transcripts, token counts, and scores. This is useful drift detection, not semantic correctness. It should not be used as the sole proof that an agent workflow still produces good CAD.

## Strong Patterns To Preserve

- OCCT backend/lowerer tests that evaluate real geometry and diagnostics.
- CLI startup tests that fail when release artifacts are missing.
- MCP server spawn tests that exercise JSON-RPC through the built CLI.
- Constraint tests that assert geometry relationships after solving, not just returned status.
- Demo metadata and lint tests that enforce required release artifacts.

## Follow-Up Cleanup Slices

1. Replace or delete permanent skipped reproduction suites.
2. Add parse/runScript checks to high-value codegen tests that currently rely on `toContain`.
3. Move env-gated UI/E2E suites into explicit npm scripts so release verification can call them intentionally.
4. Add a Playwright demo-frame pixel/framing check before recapturing `v0.4` media.
5. Separate mocked UI wiring tests from real behavior tests in naming and docs.
