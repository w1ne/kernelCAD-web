// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression: the Studio browser kernel worker must run TypeScript `.kcad.ts`
// sources (every gallery model is TS). The default browser transpiler is a JS
// pass-through that refuses TS syntax by name, so the worker passes
// `transpileTs`; these tests pin both halves of that contract at the seam.
import { describe, expect, it } from 'vitest';
import { runScriptInBrowser } from './browserRuntime';
import { transpileTsBrowser } from '../modeling/runtime/transpileBrowser';

const TS_SCRIPT = `
const w: number = 10;
const side = param('w', w, { min: 1, max: 20 });
return box(side, 20, 5);
`;

describe('browser runtime TS sources', () => {
  it('refuses TypeScript syntax with the default JS pass-through transpiler', async () => {
    await expect(runScriptInBrowser({ code: TS_SCRIPT, fileName: 'gallery.kcad.ts' }))
      .rejects.toThrow(/typescript|type annotation|transpil/i);
  });

  it('runs a TypeScript source when the worker passes the browser transpiler', async () => {
    const result = await runScriptInBrowser({
      code: TS_SCRIPT,
      fileName: 'gallery.kcad.ts',
      transpile: transpileTsBrowser,
    });
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.paramTable.serialize()).toMatchObject({ w: { value: 10 } });
  });
});
