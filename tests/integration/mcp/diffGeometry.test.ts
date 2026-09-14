// tests/integration/mcp/diffGeometry.test.ts
//
// MCP `diff_geometry` — material-level delta: added / removed / common
// volume from OCCT booleans, bbox + face/edge/hole counts, surface
// deviation, and the per-body verdict an agent branches on.

import { describe, it, expect, beforeAll } from 'vitest';
import { diffGeometryTool, classify, pairBodies } from '../../../src/agent/mcp/tools/diffGeometry';
import { ROOT_PART_NAME } from '../../../src/agent/mcp/tools/diffScripts';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

/** Two-part rig with a parametric lid width, so the same source can be
 *  diffed against itself under a param override. */
const BASE_RIG = `
  const lidW = param('lidW', 10, { min: 2, max: 50 });
  const arm = assembly('rig');
  arm.part('base', box(10, 10, 10));
  arm.part('lid', box(lidW, 10, 2).translate(0, 0, 12));
  return arm.model();
`;

const PLATE = `return box(40, 40, 6);`;
const PLATE_WITH_HOLE = `
  return box(40, 40, 6).subtract(cylinder(8, 3).translate(20, 20, -1));
`;

describe('diff_geometry MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 120000);

  it('reports all-zero deltas and verdict identical for identical scripts', async () => {
    const r = await diffGeometryTool({ baseCode: BASE_RIG, code: BASE_RIG });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.bodies).toHaveLength(2);
    for (const body of r.bodies) {
      expect(body.verdict).toBe('identical');
      expect(body.matchedBy).toBe('name');
      expect(body.addedMm3).toBeCloseTo(0, 6);
      expect(body.removedMm3).toBeCloseTo(0, 6);
      expect(body.volumeMm3.delta).toBeCloseTo(0, 6);
      expect(body.faceCount.delta).toBe(0);
      expect(body.edgeCount.delta).toBe(0);
      expect(body.holeCount.delta).toBe(0);
      expect(body.bbox.minDelta).toEqual([0, 0, 0]);
      expect(body.bbox.extentDelta).toEqual([0, 0, 0]);
      expect(body.maxDeviationMm).toBe(0);
    }
    expect(r.summary).toMatchObject({
      identical: 2, moved: 0, resized: 0, topologyChanged: 0, unmatched: 0,
    });
    expect(r.summary.totalAddedMm3).toBeCloseTo(0, 6);
    expect(r.summary.totalRemovedMm3).toBeCloseTo(0, 6);
    expect(r.unmatched).toEqual([]);
    expect(r.diagnostics).toEqual([]);
  });

  it('common volume equals the body volume when nothing changed', async () => {
    const r = await diffGeometryTool({ baseCode: PLATE, code: PLATE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bodies).toHaveLength(1);
    expect(r.bodies[0].name).toBe(ROOT_PART_NAME);
    expect(r.bodies[0].commonMm3).toBeCloseTo(40 * 40 * 6, 3);
    expect(r.bodies[0].verdict).toBe('identical');
  });

  it('a param resize reports verdict resized with a correctly-signed volume delta', async () => {
    // lid 10 → 20 wide: +200 mm³ of material, all of it ADDED.
    const grew = await diffGeometryTool({ baseCode: BASE_RIG, params: { lidW: 20 } });
    expect(grew.ok).toBe(true);
    if (!grew.ok) return;

    const lidGrew = grew.bodies.find((b) => b.name === 'lid')!;
    expect(lidGrew.verdict).toBe('resized');
    expect(lidGrew.volumeMm3.base).toBeCloseTo(200, 3);
    expect(lidGrew.volumeMm3.revised).toBeCloseTo(400, 3);
    expect(lidGrew.volumeMm3.delta).toBeCloseTo(200, 3);
    expect(lidGrew.addedMm3).toBeCloseTo(200, 3);
    expect(lidGrew.removedMm3).toBeCloseTo(0, 3);
    expect(lidGrew.commonMm3).toBeCloseTo(200, 3);
    expect(lidGrew.faceCount.delta).toBe(0);
    expect(grew.bodies.find((b) => b.name === 'base')!.verdict).toBe('identical');

    // The opposite direction must flip the sign, not the magnitude only.
    const shrank = await diffGeometryTool({ baseCode: BASE_RIG, params: { lidW: 5 } });
    expect(shrank.ok).toBe(true);
    if (!shrank.ok) return;
    const lidShrank = shrank.bodies.find((b) => b.name === 'lid')!;
    expect(lidShrank.verdict).toBe('resized');
    expect(lidShrank.volumeMm3.delta).toBeCloseTo(-100, 3);
    expect(lidShrank.addedMm3).toBeCloseTo(0, 3);
    expect(lidShrank.removedMm3).toBeCloseTo(100, 3);
  });

  it('an added hole reports verdict topology-changed with holeCount delta 1', async () => {
    const r = await diffGeometryTool({ baseCode: PLATE, code: PLATE_WITH_HOLE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.bodies).toHaveLength(1);
    const body = r.bodies[0];
    expect(body.verdict).toBe('topology-changed');
    expect(body.holeCount.base).toBe(0);
    expect(body.holeCount.revised).toBe(1);
    expect(body.holeCount.delta).toBe(1);
    expect(body.faceCount.delta).toBeGreaterThan(0);
    // Drilling removes material and adds none.
    expect(body.removedMm3).toBeGreaterThan(0);
    expect(body.addedMm3).toBeCloseTo(0, 3);
    expect(body.volumeMm3.delta).toBeLessThan(0);
    expect(r.summary.topologyChanged).toBe(1);
  });

  it('a pure translation reports verdict moved with unchanged extents', async () => {
    const moved = BASE_RIG.replace('translate(0, 0, 12)', 'translate(3, 0, 12)');
    const r = await diffGeometryTool({ baseCode: BASE_RIG, code: moved });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const lid = r.bodies.find((b) => b.name === 'lid')!;
    expect(lid.verdict).toBe('moved');
    expect(lid.volumeMm3.delta).toBeCloseTo(0, 3);
    expect(lid.bbox.minDelta[0]).toBeCloseTo(3, 6);
    expect(lid.bbox.extentDelta).toEqual([0, 0, 0]);
    expect(lid.maxDeviationMm).toBeGreaterThan(0);
    expect(r.summary.moved).toBe(1);
  });

  it('reports a body with no counterpart as unmatched with diff.body.unmatched', async () => {
    const revised = BASE_RIG.replace(
      'return arm.model();',
      `arm.part('knob', box(4, 4, 4).translate(0, 0, 20));\n  return arm.model();`,
    );
    const r = await diffGeometryTool({ baseCode: BASE_RIG, code: revised });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.unmatched).toEqual([
      { side: 'revised', name: 'knob', volumeMm3: expect.closeTo(64, 3) },
    ]);
    expect(r.summary.unmatched).toBe(1);
    const diag = r.diagnostics.find((d) => d.code === 'diff.body.unmatched');
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe('warn');
    expect(diag!.hint).toContain('knob');
    expect(diag!.nextAction).toBeDefined();
  });

  it('rejects a param override naming a param the baseline does not declare', async () => {
    const r = await diffGeometryTool({ baseCode: BASE_RIG, params: { nope: 1 } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.side).toBe('revised');
    expect(r.error).toContain('nope');
    expect(r.error).toContain('lidW');
  });

  it('requires a baseline and a revised side', async () => {
    const noBase = await diffGeometryTool({ code: PLATE });
    expect(noBase).toMatchObject({ ok: false, side: 'base', errorCode: 'cli.invalid-args' });

    const noRevision = await diffGeometryTool({ baseCode: PLATE });
    expect(noRevision).toMatchObject({ ok: false, side: 'revised', errorCode: 'cli.invalid-args' });

    const both = await diffGeometryTool({ baseCode: PLATE, code: PLATE, params: { a: 1 } });
    expect(both).toMatchObject({ ok: false, errorCode: 'cli.invalid-args' });
  });
});

describe('diff_geometry verdict classifier', () => {
  const ZERO = {
    addedMm3: 0, removedMm3: 0, volTol: 1e-6, volumeDelta: 0,
    faceDelta: 0, edgeDelta: 0, holeDelta: 0,
    extentDelta: [0, 0, 0] as [number, number, number],
    minDelta: [0, 0, 0] as [number, number, number],
  };

  it('topology outranks every dimensional reading', () => {
    expect(classify({ ...ZERO, faceDelta: 1, volumeDelta: 100, minDelta: [5, 0, 0] }))
      .toBe('topology-changed');
    expect(classify({ ...ZERO, holeDelta: -1 })).toBe('topology-changed');
    expect(classify({ ...ZERO, edgeDelta: 2 })).toBe('topology-changed');
  });

  it('a changed extent or volume is a resize', () => {
    expect(classify({ ...ZERO, extentDelta: [2, 0, 0] })).toBe('resized');
    expect(classify({ ...ZERO, volumeDelta: 5 })).toBe('resized');
  });

  it('same topology + same extents + displaced bbox is a move', () => {
    expect(classify({ ...ZERO, minDelta: [3, 0, 0], addedMm3: 50, removedMm3: 50 }))
      .toBe('moved');
  });

  it('interior-only change with identical outer bbox still reports resized', () => {
    expect(classify({ ...ZERO, addedMm3: 10, removedMm3: 10 })).toBe('resized');
  });

  it('nothing beyond tolerance is identical', () => {
    expect(classify(ZERO)).toBe('identical');
  });
});

describe('diff_geometry body pairing', () => {
  const body = (name: string) => ({ name, shape: {} as never });

  it('pairs by name first', () => {
    const r = pairBodies([body('a'), body('b')], [body('b'), body('a')]);
    expect(r.pairs.map((p) => [p.base.name, p.revised.name, p.matchedBy]))
      .toEqual([['a', 'a', 'name'], ['b', 'b', 'name']]);
    expect(r.unmatchedBase).toEqual([]);
    expect(r.unmatchedRevised).toEqual([]);
  });

  it('falls back to positional pairing for renamed leftovers', () => {
    const r = pairBodies([body('a'), body('old')], [body('a'), body('new')]);
    expect(r.pairs.map((p) => [p.base.name, p.revised.name, p.matchedBy]))
      .toEqual([['a', 'a', 'name'], ['old', 'new', 'position']]);
    expect(r.unmatchedBase).toEqual([]);
    expect(r.unmatchedRevised).toEqual([]);
  });

  it('leaves surplus bodies unmatched', () => {
    const r = pairBodies([body('a')], [body('a'), body('extra')]);
    expect(r.pairs).toHaveLength(1);
    expect(r.unmatchedRevised.map((b) => b.name)).toEqual(['extra']);
    expect(r.unmatchedBase).toEqual([]);
  });
});
