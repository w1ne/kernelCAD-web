// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Characterisation for `reconstructFromSoup`'s option handling and its
// no-measurable-pass failure path. The success paths need OCCT and live in
// tests/integration/mcp/meshToFeatures.test.ts; this pins the OCCT-free
// branches (exact error strings, errorCode fallback, pass schedule length)
// before the function is split into phases.

import { describe, expect, it } from 'vitest';
import { reconstructFromSoup, type ReconstructEvaluator } from '../../../src/agent/reconstruct/reconstruct';
import { boxSoup } from './testMeshes';

const alwaysFails: ReconstructEvaluator = async () => ({
  ok: false,
  error: 'boom',
  errorCode: 'test.no-kernel',
});

describe('reconstructFromSoup characterisation', () => {
  it('reports the no-usable-volume error for an empty soup', async () => {
    const r = await reconstructFromSoup(
      { positions: new Float64Array(0), format: 'stl', unitDeclared: false },
      alwaysFails,
    );

    expect(r).toEqual({
      ok: false,
      error: 'mesh_to_features: the mesh has no usable volume — no band of material could be sectioned.',
      errorCode: 'cli.invalid-args',
      mesh: expect.anything(),
      diagnostics: [],
    });
  });

  it('reports the last pass error when no pass produces a measurable script', async () => {
    const r = await reconstructFromSoup(boxSoup(40, 30, 10), alwaysFails, { maxPasses: 1 });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/^mesh_to_features: no pass produced a script that evaluates \(last error: .*\)\.$/);
    expect(r.errorCode).toBe('test.no-kernel');
    expect(r.passes).toHaveLength(1);
    expect(r.passes?.[0]).toMatchObject({ pass: 0, ok: false, error: 'boom', errorCode: 'test.no-kernel' });
  });

  it('runs four passes by default and clips maxPasses into 1..4', async () => {
    const four = await reconstructFromSoup(boxSoup(40, 30, 10), alwaysFails);
    expect(four.ok).toBe(false);
    if (four.ok) return;
    expect(four.passes?.map((p) => p.pass)).toEqual([0, 1, 2, 3]);

    const clipped = await reconstructFromSoup(boxSoup(40, 30, 10), alwaysFails, { maxPasses: 9 });
    expect(clipped.ok).toBe(false);
    if (clipped.ok) return;
    expect(clipped.passes).toHaveLength(4);

    const floored = await reconstructFromSoup(boxSoup(40, 30, 10), alwaysFails, { maxPasses: 0 });
    expect(floored.ok).toBe(false);
    if (floored.ok) return;
    expect(floored.passes).toHaveLength(1);
  });

  it('falls back to cli.script-exception when the last pass carries no errorCode', async () => {
    const noCode: ReconstructEvaluator = async () => ({ ok: false, error: 'silent' });
    const r = await reconstructFromSoup(boxSoup(40, 30, 10), noCode, { maxPasses: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errorCode).toBe('cli.script-exception');
    expect(r.error).toContain('(last error: silent)');
  });
});
