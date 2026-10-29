// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/diagnostics/booleanIntegrity.test.ts
//
// Detached-material guard: a `subtract()` that severs the only connection to
// a piece leaves it floating inside the part. The STEP is watertight and every
// solid is valid, so only comparing the result's solid count with the body it
// cut catches it. CADGenBench 207 is the reported case: a band cut across a
// hanging boss shortened it and left the tip floating inside the shell.

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

type Diag = { code: string; severity: string; message: string };
const byCode = (diags: Diag[], code: string) => diags.filter(d => d.code === code);
const detached = (diags: Diag[]) => byCode(diags, 'feature.boolean.detached-material');

describe('detached-material guard', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('rejects a band cut across a bar: the upper piece is left floating', async () => {
    const r = await evaluateScriptTool({
      code: `
        const bar = box(10, 10, 40);
        // A band through the middle severs the top 22.5 mm from the rest.
        return bar.subtract(box(30, 30, 5).translate(0, 0, 17.5));
      `,
    });
    expect(r.ok).toBe(false);
    const d = detached(r.diagnostics);
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('error');
    expect(d[0].message).toMatch(/2 separate solids/);
    expect(d[0].message).toMatch(/1 detached piece/);
    // The repair needs the piece located: bounding box and gap are named.
    expect(d[0].message).toMatch(/bbox \[/);
    expect(d[0].message).toMatch(/gap \d/);
  });

  it('accepts a blind pocket that removes material without severing anything', async () => {
    const r = await evaluateScriptTool({
      code: `return box(20, 20, 20).subtract(cylinder(10, 3).translate(0, 0, 15));`,
    });
    expect(detached(r.diagnostics)).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('accepts a cut that splits a body when a later union fuses the pieces back', async () => {
    const r = await evaluateScriptTool({
      code: `
        const bar = box(40, 10, 10);
        // Splits the bar into two solids ...
        const split = bar.subtract(box(2, 20, 20).translate(19, 0, 0));
        // ... which the bridging plate then fuses into one body.
        return split.union(box(40, 10, 2).translate(0, 0, 9));
      `,
    });
    expect(detached(r.diagnostics)).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('accepts a detached-looking result used only as a cutting tool', async () => {
    const r = await evaluateScriptTool({
      code: `
        // Two separate cutters are legitimate: this tool never becomes material.
        const tool = box(30, 2, 2).subtract(box(1, 5, 5).translate(15, 0, 0));
        // The two grooves it cuts leave the body in one piece.
        return box(100, 20, 20).subtract(tool.translate(0, 9, 18));
      `,
    });
    expect(detached(r.diagnostics)).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
