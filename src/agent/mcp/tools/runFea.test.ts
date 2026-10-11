// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { runFeaTool } from './runFea';
import { RUN_FEA_EXAMPLE } from './runFeaArgs';

describe('run_fea MCP tool (characterisation)', () => {
  it('returns the script-load failure verbatim when neither file nor code is given', async () => {
    expect(await runFeaTool({})).toEqual({
      ok: false,
      error: 'Must provide either { file } or { code }.',
    });
  });

  it('reports feature.invalid-args when the script declares no feaStudy', async () => {
    expect(await runFeaTool({ code: 'const b = box(10, 10, 10);\nreturn b;' })).toEqual({
      ok: false,
      error:
        'The script declares no feaStudy. Either add shape.feaStudy({ material, fixed, loads }) to the part you want analysed, ' +
        `or pass the study on the call: ${RUN_FEA_EXAMPLE}.`,
      errorCode: 'feature.invalid-args',
    });
  });

  it('names the declared studies when the requested study does not exist', async () => {
    const code = [
      'const b = box(10, 20, 30);',
      "b.feaStudy({ name: 'bend', material: 'pla', fixed: { atZ: 0 }, loads: [{ faces: { atZ: 30 }, force: [0, 0, -5] }] });",
      'return b;',
    ].join('\n');
    expect(await runFeaTool({ code, study: 'nope' })).toEqual({
      ok: false,
      error: "No feaStudy named 'nope'. Declared studies: bend.",
      errorCode: 'feature.invalid-args',
    });
  });
});

describe('run_fea partial inline fields', () => {
  const declared = [
    'const b = box(60, 12, 6);',
    "b.feaStudy({ name: 'bend', material: 'pla', fixed: { atX: 0 }, loads: [{ faces: { atX: 60 }, force: [0, 0, -50] }], meshSize: 2 });",
    'return b;',
  ].join('\n');

  it("merges a lone material onto the script's declared study instead of failing validation", async () => {
    const r = await runFeaTool({ code: declared, material: 'steel', solver: 'in-process', heatmaps: false } as never);
    expect(r.error).toBeUndefined();
    expect(r.summary?.study).toBe('bend');
    expect(r.summary?.material.name).toMatch(/steel/);
    // fixed / loads / meshSize still come from the script.
    expect(r.summary?.appliedForceN).toEqual([0, 0, -50]);
  }, 120_000);

  it('the declared study runs unchanged without inline fields', async () => {
    const r = await runFeaTool({ code: declared, solver: 'in-process', heatmaps: false } as never);
    expect(r.summary?.material.name).toBe('pla');
  }, 120_000);

  it('partial fields with no declared study say what is missing', async () => {
    const r = await runFeaTool({ code: 'return box(10, 10, 10);', material: 'steel' } as never);
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.invalid-args');
    expect(r.error).toMatch(/^run_fea inline study: .*fixed/);
  }, 60_000);
});
