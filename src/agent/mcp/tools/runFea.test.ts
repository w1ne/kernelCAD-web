// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { runFeaTool } from './runFea';

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
        'The script declares no feaStudy. Add shape.feaStudy({ material, fixed, loads }) to the part you want analysed.',
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
