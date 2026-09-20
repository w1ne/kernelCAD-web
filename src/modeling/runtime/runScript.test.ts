// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { runScript } from './runScript';
import { KernelError } from '../../shared/intent/kernelError';

/**
 * Regression for the hosted `/__kernelcad/mesh` path: agent-authored scripts
 * arrive as ES modules (`export default <model>`). The runtime transpiles then
 * wraps the body in an IIFE, so `export` was a SyntaxError ("Unexpected token
 * 'export'") and the model failed to render in Studio. `runScript` must
 * normalize module syntax into the `return` form the IIFE captures.
 *
 * These cases use plain values (not OCCT shapes) so they run without the
 * geometry kernel — they exercise transpile → normalize → isolate → capture.
 */
describe('runScript — module-style scripts', () => {
  it('captures `export default <expr>` as the return value', async () => {
    const res = await runScript({ code: 'export default 21 * 2;', fileName: 'model.kcad.ts' });
    expect(res.returnValue).toBe(42);
  });

  it('still supports the canonical top-level `return`', async () => {
    const res = await runScript({ code: 'const x = 7;\nreturn x + 1;', fileName: 'model.kcad.ts' });
    expect(res.returnValue).toBe(8);
  });

  it('handles `export const` + `export default` together', async () => {
    const res = await runScript({
      code: 'export const w = 10;\nexport default w * 3;',
      fileName: 'model.kcad.ts',
    });
    expect(res.returnValue).toBe(30);
  });

  it('refuses a top-level `import` with a structured feature.invalid-args error (gap #7)', async () => {
    // Stripping the import left `foo` undefined, so the old behavior was a
    // mid-evaluation `ReferenceError: foo is not defined`. Execution now
    // refuses the script up front instead of half-running it.
    let caught: unknown;
    try {
      await runScript({
        code: "import { foo } from 'bar';\nexport default 5;",
        fileName: 'model.kcad.ts',
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.invalid-args');
    expect((caught as KernelError).message).toMatch(/local imports are not supported in \.kcad\.ts/);
  });
});
