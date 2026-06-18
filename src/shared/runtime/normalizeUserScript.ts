// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Studio executes a `.kcad` script as the body of `new Function(...)`, where the
 * model is whatever the script `return`s (see `kernel/backends/occt/worker.ts`
 * and `modeling/HeadlessKernel.ts`). Agent-authored scripts, however, are
 * idiomatic TypeScript/ES modules: they end with `export default <model>`, use
 * `export const`/`export function`, and sometimes carry top-level `import`s.
 * Any of those is a `SyntaxError` inside a function body — surfaced to the user
 * as "Unexpected token 'export'" with 0 bodies rendered.
 *
 * `normalizeUserScript` rewrites those module-isms into equivalent function-body
 * statements so the same script runs whether it was written module-style or
 * return-style:
 *   - `export default <expr>`      → `return <expr>`   (the model value)
 *   - `export default function|class` → strip `export default ` (keep the decl)
 *   - `export const|let|var|function|class|async function` → strip `export `
 *   - `export { ... }` (re-exports) → dropped
 *   - top-level `import ...`        → dropped (bare specifiers can't resolve in
 *                                      `new Function`; the API is injected as
 *                                      globals, not imported)
 *
 * The transforms are line-anchored, so the word `export`/`import` appearing
 * mid-line (e.g. inside a string literal) is left untouched. Multi-line `import`
 * / `export { }` statements are not handled — agents do not emit them in kcad
 * scripts, and the canonical authoring form is a flat `return`.
 */
export function normalizeUserScript(code: string): string {
  if (typeof code !== 'string' || code.trim() === '') return code;

  let out = code;

  // 1. Drop top-level ES import statements (named, default, namespace,
  //    side-effect). Dynamic `import(...)` used as an expression is not
  //    line-anchored to `import` and is therefore preserved.
  out = out.replace(/^[ \t]*import\b[^\n]*\n?/gm, '');

  // 2. Drop `export { ... }` re-export statements (with optional `from '...'`).
  out = out.replace(/^[ \t]*export\s*\{[^}]*\}[^\n]*\n?/gm, '');

  // 3. `export default function|class` → keep the declaration, drop the prefix.
  //    (A function/class is not itself a model value, so we must NOT turn this
  //    into `return function ...`.)
  out = out.replace(
    /^([ \t]*)export\s+default\s+(?=(?:async\s+)?function\b|class\b)/gm,
    '$1',
  );

  // 4. `export default <expr>` → `return <expr>` (the model the script produces).
  out = out.replace(/^([ \t]*)export\s+default\s+/gm, '$1return ');

  // 5. `export <decl>` → strip the `export ` keyword, keep the declaration.
  out = out.replace(
    /^([ \t]*)export\s+(?=const\b|let\b|var\b|function\b|class\b|async\b)/gm,
    '$1',
  );

  return out;
}
