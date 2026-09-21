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

/**
 * Detect the first top-level module import the normalizer would STRIP.
 *
 * `normalizeUserScript` deletes `import` lines so a module-style script can
 * run as a function body. That is fine for `export`, but an `import` that
 * binds a name the script then uses dies later with a bare
 * `ReferenceError: <name> is not defined` — the binding was deleted, not
 * resolved. Execution entry points (`runScriptCore`) call this first and
 * throw a structured `feature.invalid-args` KernelError instead, so the
 * failure is actionable. The normalizer itself stays lenient: callers that
 * never execute the script (line maps, static analysis) still get the
 * stripped form.
 *
 * Covers the line-anchored ESM forms the normalizer drops (named, default,
 * namespace, side-effect, `import type`) and the CommonJS forms
 * (`const x = require('...')`, bare `require('...')`). Dynamic
 * `import(...)` used mid-expression is not line-anchored and is ignored —
 * same contract as the normalizer.
 *
 * Returns the offending statement text (trimmed), or `undefined` when the
 * source has no top-level import.
 */
export function findTopLevelImport(code: string): string | undefined {
  if (typeof code !== 'string' || code.trim() === '') return undefined;
  for (const line of code.split('\n')) {
    if (TOP_LEVEL_IMPORT_LINE_RES.some(re => re.test(line))) return line.trim();
  }
  return undefined;
}

/** Line-anchored top-level import / require forms (see `findTopLevelImport`). */
const TOP_LEVEL_IMPORT_LINE_RES: readonly RegExp[] = [
  /^[ \t]*import\b/,
  /^[ \t]*(?:const|let|var)\s+[^\n]*\brequire\s*\(/,
  /^[ \t]*require\s*\(/,
];

/**
 * Line map from the NORMALIZED script back to the original file.
 *
 * Two of the five transforms above delete whole lines (top-level `import`,
 * `export { … }`), which shifts every following line. Any surface that reports
 * a position from the running script — repair regions, AST edit patches,
 * trace records — must speak original-file coordinates, so it needs to undo
 * that shift.
 *
 * Returns an array whose i-th entry is the 1-based ORIGINAL line number that
 * produced 1-based normalized line `i + 1`. Returns `undefined` when the
 * line-anchored reconstruction disagrees with the real normalized output
 * (multi-line `import` / `export {}` statements, which the normalizer
 * documents as unsupported) — callers then fall back to identity rather than
 * reporting a wrong line.
 */
export function normalizeUserScriptLineMap(code: string): number[] | undefined {
  if (typeof code !== 'string' || code.trim() === '') return undefined;

  const originalLines = code.split('\n');
  const kept: number[] = [];
  for (let i = 0; i < originalLines.length; i++) {
    const line = originalLines[i];
    if (DROPPED_LINE_RES.some(re => re.test(line))) continue;
    kept.push(i + 1);
  }

  // Trailing-newline bookkeeping: the drop regexes consume the newline that
  // follows the dropped line, so a dropped LAST line (no trailing newline)
  // leaves an empty line behind instead of removing one.
  const normalizedLineCount = normalizeUserScript(code).split('\n').length;
  if (kept.length !== normalizedLineCount) return undefined;
  return kept;
}

/** Line-anchored forms the normalizer deletes outright (see transforms 1-2). */
const DROPPED_LINE_RES: readonly RegExp[] = [
  /^[ \t]*import\b/,
  /^[ \t]*export\s*\{[^}]*\}/,
];
