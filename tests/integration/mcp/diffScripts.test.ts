// tests/integration/mcp/diffScripts.test.ts
//
// MCP `diff_scripts` — structured geometric delta between a baseline and a
// revised script: per-part added/removed/renamed/changed, interference
// totals, mate-graph changes, and param changes.
import { describe, it, expect, beforeAll } from 'vitest';
import { diffScriptsTool, ROOT_PART_NAME } from '../../../src/agent/mcp/tools/diffScripts';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const BASE_RIG = `
  const w = param('lidW', 10, { min: 2, max: 50 });
  const arm = assembly('rig');
  arm.part('base', box(10, 10, 10));
  arm.part('lid', box(w, 10, 2).translate(0, 0, 12));
  return arm.model();
`;

describe('diffScriptsTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('reports no delta between identical scripts', async () => {
    const r = await diffScriptsTool({ baseCode: BASE_RIG, code: BASE_RIG });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.base).toEqual({ featureCount: r.revised.featureCount, partCount: 2, isAssembly: true });
    expect(r.parts.added).toHaveLength(0);
    expect(r.parts.removed).toHaveLength(0);
    expect(r.parts.renamed).toHaveLength(0);
    expect(r.parts.changed).toHaveLength(0);
    expect(r.parts.unchanged.sort()).toEqual(['base', 'lid']);
    expect(r.interference.deltaMm3).toBe(0);
    expect(r.mates.added).toHaveLength(0);
    expect(r.params.changed).toHaveLength(0);
  });

  it('detects an added part with its volume and bbox', async () => {
    const revised = BASE_RIG.replace(
      'return arm.model();',
      `arm.part('knob', box(4, 4, 4).translate(0, 0, 20));\n  return arm.model();`,
    );
    const r = await diffScriptsTool({ baseCode: BASE_RIG, code: revised });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parts.added).toHaveLength(1);
    expect(r.parts.added[0].name).toBe('knob');
    expect(r.parts.added[0].volumeMm3).toBeCloseTo(64, 3);
    expect(r.parts.removed).toHaveLength(0);
  });

  it('reports an identical body under a new name as renamed, not add+remove', async () => {
    const revised = BASE_RIG.replaceAll(`'lid'`, `'cover'`);
    const r = await diffScriptsTool({ baseCode: BASE_RIG, code: revised });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parts.renamed).toEqual([{ from: 'lid', to: 'cover', volumeMm3: expect.closeTo(200, 3) }]);
    expect(r.parts.added).toHaveLength(0);
    expect(r.parts.removed).toHaveLength(0);
  });

  it('reports a resized part as changed with volume + bbox deltas, and the param delta', async () => {
    const revised = BASE_RIG.replace(`param('lidW', 10,`, `param('lidW', 20,`);
    const r = await diffScriptsTool({ baseCode: BASE_RIG, code: revised });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parts.changed).toHaveLength(1);
    const lid = r.parts.changed[0];
    expect(lid.name).toBe('lid');
    expect(lid.volumeMm3.base).toBeCloseTo(200, 3);
    expect(lid.volumeMm3.revised).toBeCloseTo(400, 3);
    expect(lid.volumeMm3.delta).toBeCloseTo(200, 3);
    expect(lid.bbox.revised.max[0] - lid.bbox.revised.min[0]).toBeCloseTo(20, 3);
    expect(r.parts.unchanged).toEqual(['base']);
    expect(r.params.changed).toHaveLength(1);
    expect(r.params.changed[0].name).toBe('lidW');
    expect(r.params.changed[0].base.value).toBe(10);
    expect(r.params.changed[0].revised.value).toBe(20);
  });

  it('detects mate-graph changes', async () => {
    const withMate = `
      const arm = assembly('rig');
      const base = arm.part('base', box(10, 10, 10));
      const lid = arm.part('lid', box(10, 10, 2).translate(0, 0, 12));
      base.connector('top', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 5] }, axis: [0, 0, 1] });
      lid.connector('bottom', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, -1] }, axis: [0, 0, 1] });
      arm.mate('hinge', 'base.top', 'lid.bottom', 'revolute');
      return arm.model();
    `;
    const without = withMate.replace(/^\s*arm\.mate\('hinge'.*$\n/m, '');
    const r = await diffScriptsTool({ baseCode: without, code: withMate });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mates.added).toHaveLength(1);
    expect(r.mates.added[0]).toMatchObject({ name: 'hinge', type: 'revolute', a: 'base.top', b: 'lid.bottom' });
    expect(r.mates.removed).toHaveLength(0);
  });

  it('reports the interference-volume delta when a revision introduces a clash', async () => {
    const clean = `
      const arm = assembly('rig');
      arm.part('a', box(10, 10, 10));
      arm.part('b', box(10, 10, 10).translate(20, 0, 0));
      return arm.model();
    `;
    // Slide part b so it overlaps part a by 5 mm in x → 5*10*10 = 500 mm³.
    const clashing = clean.replace('translate(20, 0, 0)', 'translate(5, 0, 0)');
    const r = await diffScriptsTool({ baseCode: clean, code: clashing });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.interference.baseTotalMm3).toBe(0);
    expect(r.interference.revisedTotalMm3).toBeCloseTo(500, 1);
    expect(r.interference.deltaMm3).toBeCloseTo(500, 1);
    expect(r.interference.revisedPairs).toHaveLength(1);
    expect(r.interference.revisedPairs[0]).toMatchObject({ a: 'a', b: 'b' });
  });

  it('diffs single-shape scripts as a "(root)" pseudo-part', async () => {
    const r = await diffScriptsTool({
      baseCode: `return box(10, 10, 10);`,
      code: `return box(10, 10, 20);`,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.base.isAssembly).toBe(false);
    expect(r.parts.changed).toHaveLength(1);
    expect(r.parts.changed[0].name).toBe(ROOT_PART_NAME);
    expect(r.parts.changed[0].volumeMm3.delta).toBeCloseTo(1000, 3);
  });

  it('reports which side failed when a script is broken', async () => {
    const r = await diffScriptsTool({
      baseCode: `throw new Error('boom');`,
      code: `return box(10, 10, 10);`,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.side).toBe('base');
    expect(r.error).toContain('boom');
  });

  it('rejects a call missing the baseline source', async () => {
    const r = await diffScriptsTool({ code: `return box(1, 1, 1);` });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.side).toBe('base');
    expect(r.errorCode).toBe('cli.invalid-args');
  });
});
