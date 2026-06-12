// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { runScript } from './runScript';

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

  it('drops a top-level `import` that cannot resolve in the sandbox', async () => {
    const res = await runScript({
      code: "import { foo } from 'bar';\nexport default 5;",
      fileName: 'model.kcad.ts',
    });
    expect(res.returnValue).toBe(5);
  });
});
