// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Two meshing spur gears tie the fingers together. The sweep moves one
// uncoupled mate at a time, so without `coupleMates` the gear teeth clash at
// poses the gear train cannot reach. The coupling is the fix, and the
// collision diagnostic must say so instead of steering the author to
// `solvedModel({ ignore })`.
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { listApiTool } from '../../../src/agent/mcp/tools/listApi';

const EXAMPLE = resolvePath(__dirname, '../../../examples/robot-hand/geared-two-finger-gripper.kcad.ts');
const COUPLING_LINE = "gripper.coupleMates('right', { source: 'left', ratio: -1 });";

describe('geared two-finger gripper (coupled mates)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('passes the mechanism check when the gear pair is declared with coupleMates', async () => {
    const out = await evaluateScriptTool({ code: readFileSync(EXAMPLE, 'utf8') });
    const errors = out.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.map((d) => `${d.code}: ${d.message}`)).toEqual([]);
    expect(out.mechanism).toBe('real');
    expect(out.ok).toBe(true);
  }, 240_000);

  it('without the coupling, the sampled gear clash points at coupleMates', async () => {
    const source = readFileSync(EXAMPLE, 'utf8');
    expect(source).toContain(COUPLING_LINE);
    const out = await evaluateScriptTool({
      code: source.replace(COUPLING_LINE, '').replace('{ left: 10 }', '{}'),
    });
    const clashes = out.diagnostics.filter((d) => d.code === 'mechanism.interpenetration');
    expect(clashes.length).toBeGreaterThan(0);
    for (const clash of clashes) {
      expect(clash.message).toMatch(/coupleMates\('(right|left)', \{ source: '(left|right)', ratio/);
    }
    expect(out.mechanism).toBe('broken');
  }, 240_000);

  it('list_api documents the coupleMates signature and points ignore users at it', async () => {
    const r = await listApiTool({ query: 'coupleMates' });
    const assembly = r.globals!.find((g) => g.name === 'assembly')!;
    expect(assembly.description).toContain('.coupleMates(driven, { source, ratio, offset? })');
    expect(assembly.description).toMatch(/instead of `ignore`/);
  });
});
