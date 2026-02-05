# Refactoring Audit (2nd pass)

This is a quick “what’s still messy / risky” list after getting the repo back to a green baseline.

## High-impact next steps

1. **Stabilize identity for selection**
   - Current `faceId` is essentially an array index (`geometry.faces[faceId]`) and can shift across recompute.
   - Consider: stable IDs from OCCT topology (preferred), or at least a deterministic hash of face geometry/plane + adjacency as a stopgap.

2. **Make worker logging intentional**
   - Avoid unconditional `console.log`/`console.warn` in `src/lib/worker.ts` (now gated, but the pattern should be standardized).
   - Consider a tiny logger facade with `DEBUG` toggles for main thread + worker (env flag + runtime override).

3. **Reduce “mega-context” render churn**
   - `WorkbenchContext` composes multiple providers and currently constructs a large `value` object each render.
   - Consider memoizing the `value` object and/or exposing focused hooks in more places to reduce unnecessary rerenders.

4. **Harden feature-generator typing**
   - `FeatureContext` is now stricter (includes `codeContext`), but tests/mocks frequently drift.
   - Add a shared `createMockFeatureContext()` helper for tests to keep mocks consistent and avoid repeated “missing field” failures.

## Medium-impact cleanup

- **Separate “dev scratch” from shipped `src/`**
  - Files like `src/ast-v2-browser-test.ts` are useful but should live in a clearly excluded `src/dev/` (or outside `src/`) to prevent accidental shipping/typecheck failures.

- **Consolidate test suite gates**
  - There are now multiple env gates (`KERNELCAD_E2E`, `KERNELCAD_UI_E2E`, `KERNELCAD_FUZZ`).
  - Consider documenting a single matrix table and standardizing “default off” heavy suites.

- **Minimize string-executed code**
  - Many suites use `new Function(...)` with user-code strings.
  - Consider wrapping this in a single helper that enforces a stable “prelude” (e.g., `const { Sketcher } = replicad;`) and ensures error normalization.

## Low-impact polish

- **Reduce console noise in tests**
  - Some tests intentionally spam console for debugging; consider silencing by default and only enabling via an env flag.

- **Chunk size warning**
  - Vite warns about large chunks; consider code-splitting (especially Replicad/OCCT) if load time matters.

