// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A tube that branches off another tube: the joint is placed on the trunk's
// resolved path, the branch solid ends on the trunk wall, the branch rules,
// the clearance exemption at the joint and the report.

import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getOC } from 'replicad';
import { buildModel, updateModelParams, type BuiltModel } from '../../../src/modeling/buildModel';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { brepExtremaClosest, wrappedShape } from '../../../src/modeling/runtime/brepDistance';
import { runTubeChecksOnModel, type TubeCheckReport } from '../../../src/modeling/runtime/tube/runTubeChecks';
import { resolveTube, tubeSceneContext } from '../../../src/modeling/runtime/tube/tubeScene';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry';

beforeAll(async () => { await initOcct(); }, 120_000);

const build = (code: string): Promise<BuiltModel> => buildModel({ fileName: 'tube-branch.kcad.ts', code });

async function gate(model: BuiltModel): Promise<TubeCheckReport> {
  const report = await runTubeChecksOnModel(model);
  expect(report).toBeDefined();
  for (const d of report!.diagnostics) expect(d.hint.trim().length, `${d.code} has no hint`).toBeGreaterThan(0);
  return report!;
}

async function run(code: string): Promise<TubeCheckReport> {
  const model = await build(code);
  expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return gate(model);
}

const errors = (r: TubeCheckReport) => r.diagnostics.filter((d) => d.severity === 'error');
const errorCodes = (r: TubeCheckReport) => errors(r).map((d) => d.code);
const messages = (r: TubeCheckReport, code: string) => r.diagnostics.filter((d) => d.code === code).map((d) => d.message);
const line = (r: TubeCheckReport, name: string) => r.lines.find((l) => l.name === name)!;

/** Where the tube declared `n`-th (0-based) starts: for a branch, the point on the trunk wall. */
function tubeStart(model: BuiltModel, n: number): number[] {
  const record = model.records.filter((r) => r.kind === 'tube')[n];
  return resolveTube(model, tubeSceneContext(model), record)[0].path.points[0];
}

/** Where the solid of tube `n` touches the solid of tube `m`. */
function contact(model: BuiltModel, n: number, m: number): { distance: number; at: number[] } {
  const c = brepExtremaClosest(getOC(), wrappedShape(tubeShape(model, n)), wrappedShape(tubeShape(model, m)))!;
  return { distance: c.distance, at: c.onA };
}

/** The shape of the tube declared `n`-th (0-based). */
function tubeShape(model: BuiltModel, n: number): OcctBackend {
  const id = model.records.filter((r) => r.kind === 'tube')[n].id;
  return model.shapes.get(id) as OcctBackend;
}

// The trunk of the two-tubes-from-one-port script: up 150 mm from the pump, one 90 degree bend of
// radius 40, then 250 mm along +X. Straight 0 to 110, bend to 110 + 20 pi, straight to the end.
const BEND_END = 110 + 20 * Math.PI;
const TRUNK_LENGTH = BEND_END + 210;
/** The station of the point x on the trunk's second leg. */
const stationAtX = (x: number): number => BEND_END + (x - 90);

const PUMP = `
const asm = assembly('f11');
const pump = asm.part('pump', box(100, 100, 100), { at: [0, 0, 0] })
  .connector('supply', { type: 'axis', origin: { kind: 'vec3', value: [50, 50, 100] }, axis: [0, 0, 1], port: { system: 'act', od: 12.7 } });
tubeSpec({});
const a = tube('act-1', { from: pump.port('supply'), to: { point: [300, 50, 250], axis: [-1, 0, 0] }, via: [[50, 50, 250]], wall: 0.9, bendRadius: 40 });
asm.part('act-1', a);
`;

/** The second actuator line as a branch off the first, leaving upward at x = 190. */
const branchScript = (from: string, opts = 'od: 12.7'): string => PUMP + `
const b = tube('act-2', { from: ${from}, to: { point: [-200, 50, 400], axis: [1, 0, 0] }, via: [[190, 50, 400]], ${opts}, wall: 0.9, bendRadius: 40 });
asm.part('act-2', b);
return asm.model();
`;
const UP = `{ tube: 'act-1', at: ${stationAtX(190)}, axis: [0, 0, 1] }`;

// A straight 400 mm trunk along +X in free space: the station is the x coordinate.
const STRAIGHT = `
const asm = assembly('rig');
tubeSpec({});
const trunk = tube('trunk', { from: { point: [0, 0, 0], axis: [1, 0, 0] }, to: { point: [400, 0, 0], axis: [-1, 0, 0] }, od: 12.7, wall: 0.9, bendRadius: 40, system: 'act' });
asm.part('trunk', trunk);
`;

describe('tube branch: the two-tubes-from-one-port script, rewritten with a branch', () => {
  it('passes every gate and reports the joint on both lines', async () => {
    const r = await run(branchScript(UP));
    expect(errors(r)).toEqual([]);
    expect(r.diagnostics.filter((d) => d.severity === 'warn')).toEqual([]);
    const at = stationAtX(190);
    expect(line(r, 'act-2').from).toEqual({ tube: 'act-1', at: expect.closeTo(at, 9) });
    expect(line(r, 'act-2').to).toBeUndefined();
    expect(line(r, 'act-1').branches).toEqual([{ tube: 'act-2', at: expect.closeTo(at, 9) }]);
    expect(line(r, 'act-1').from).toBeUndefined();
    expect(line(r, 'act-2').branches).toBeUndefined();
    expect(line(r, 'act-2').system).toBe('act');
  }, 120_000);

  it('measures the branch from the trunk wall: cut length and end straight', async () => {
    const r = await run(branchScript(UP));
    // From the wall at z = 256.35 to the corner at z = 400, a 90 degree bend, then 390 mm along -X.
    const first = 400 - (250 + 12.7 / 2) - 40;
    expect(line(r, 'act-2').lra[0].l).toBeCloseTo(first, 6);
    expect(line(r, 'act-2').cutLength).toBeCloseTo(first + 20 * Math.PI + 350, 6);
  }, 120_000);

  it('the branch solid touches the trunk and shares no volume with it', async () => {
    const model = await build(branchScript(UP));
    const trunk = tubeShape(model, 0);
    const branch = tubeShape(model, 1);
    const closest = brepExtremaClosest(getOC(), wrappedShape(branch), wrappedShape(trunk));
    expect(closest!.distance).toBeLessThan(1e-6);
    expect(branch.intersectionVolume(trunk)).toBeLessThan(1e-3);
    // The trunk is not drilled: it is the solid a tube without a branch has.
    const alone = await build(PUMP + 'return asm.model();');
    expect(trunk.volume()).toBeCloseTo(tubeShape(alone, 0).volume(), 6);
    // The saddle wraps the trunk: more metal than a square cut at the wall, less than a tube run to the centreline.
    const annulus = Math.PI * (6.35 ** 2 - 5.45 ** 2);
    const cut = line(await gate(model), 'act-2').cutLength;
    expect(branch.volume()).toBeGreaterThan(annulus * cut);
    expect(branch.volume()).toBeLessThan(annulus * (cut + 6.35));
  }, 120_000);

  it('a smaller branch on the trunk also touches without overlap', async () => {
    const model = await build(branchScript(UP, 'od: 6.35'));
    const closest = brepExtremaClosest(getOC(), wrappedShape(tubeShape(model, 1)), wrappedShape(tubeShape(model, 0)));
    expect(closest!.distance).toBeLessThan(1e-6);
    expect(tubeShape(model, 1).intersectionVolume(tubeShape(model, 0))).toBeLessThan(1e-3);
    expect(errors(await gate(model))).toEqual([]);
  }, 120_000);

  it('the nearest neighbour of the branch excludes the joint zone', async () => {
    const r = await run(branchScript(UP));
    // Past the 31.75 mm end straight the branch is 31.75 mm above the trunk.
    expect(line(r, 'act-2').minClearance).toMatchObject({ to: 'act-1', mm: expect.closeTo(31.75, 3) });
  }, 120_000);

  it('two tubes from one port still overlap, and the hint points at a branch', async () => {
    const r = await run(PUMP + `
const b = tube('act-2', { from: pump.port('supply'), to: { point: [-200, 50, 250], axis: [1, 0, 0] }, via: [[50, 50, 250]], wall: 0.9, bendRadius: 40 });
asm.part('act-2', b);
return asm.model();
`);
    expect(errorCodes(r)).toEqual(['tube.clearance.overlap']);
    expect(errors(r)[0].hint).toContain('{ tube, at, axis }');
  }, 120_000);
});

describe('tube branch: rules', () => {
  it('at on a bend fails with the straight ranges', async () => {
    const model = await build(branchScript("{ tube: 'act-1', at: 140, axis: [0, 0, 1] }"));
    const d = model.diagnostics.filter((x) => x.code === 'tube.branch.not-on-straight');
    expect(d).toHaveLength(1);
    expect(d[0].severity).toBe('error');
    expect(d[0].hint).toBe(DIAGNOSTIC_REGISTRY['tube.branch.not-on-straight'].hintTemplate);
    expect(d[0].message).toBe(
      "tube.branch.not-on-straight: tube 'act-2' from end: at 140.00 mm is on bend 1 of tube 'act-1' (110.00 to 172.83 mm). " +
      'The trunk is straight from 0.00 to 110.00, 172.83 to 382.83 mm.');
  }, 120_000);

  it('at beyond the end of the trunk fails with the trunk length', async () => {
    const model = await build(branchScript("{ tube: 'act-1', at: 500, axis: [0, 0, 1] }"));
    expect(model.diagnostics.filter((x) => x.code === 'tube.branch.not-on-straight').map((x) => x.message)).toEqual([
      "tube.branch.not-on-straight: tube 'act-2' from end: at 500.00 mm is off tube 'act-1', which is 382.83 mm long. " +
      'The trunk is straight from 0.00 to 110.00, 172.83 to 382.83 mm.']);
  }, 120_000);

  it('at too close to the end of the trunk fails', async () => {
    // 10 mm from the trunk's `to` end; the end straight rule is 2.5 x 12.7 = 31.75 mm.
    const r = await run(PUMP + `
const b = tube('act-2', { from: { tube: 'act-1', at: ${TRUNK_LENGTH - 10}, axis: [0, 0, 1] }, to: { point: [290, 200, 400], axis: [0, -1, 0] }, via: [[290, 50, 400]], od: 12.7, wall: 0.9, bendRadius: 40 });
asm.part('act-2', b);
return asm.model();
`);
    expect(errorCodes(r)).toEqual(['tube.branch.too-close']);
    expect(messages(r, 'tube.branch.too-close')).toEqual([
      "tube.branch.too-close: tube 'act-2' joins tube 'act-1' at 372.83 mm, 10.00 mm from the trunk's to end; " +
      'the rule needs 31.75 mm. On this leg at may be 198.23 to 351.08 mm.']);
  }, 120_000);

  it('at too close to a bend of the trunk fails', async () => {
    // 10 mm past the bend; the straight between bends rule is 2 x 12.7 = 25.4 mm.
    const r = await run(branchScript(`{ tube: 'act-1', at: ${BEND_END + 10}, axis: [0, 0, 1] }`).replace(/190, 50, 400/, '100, 50, 400'));
    expect(errorCodes(r)).toEqual(['tube.branch.too-close']);
    expect(messages(r, 'tube.branch.too-close')[0]).toContain("at 182.83 mm, 10.00 mm from bend 1 of the trunk; the rule needs 25.40 mm.");
  }, 120_000);

  it('an axis that is not square to the trunk fails', async () => {
    const r = await run(branchScript(`{ tube: 'act-1', at: ${stationAtX(190)}, axis: [0.2, 0, 1] }`));
    expect(errorCodes(r)).toContain('tube.branch.axis-not-square');
    expect(messages(r, 'tube.branch.axis-not-square')).toEqual([
      "tube.branch.axis-not-square: tube 'act-2' leaves tube 'act-1' 11.31 deg off square; the trunk leg runs along [1.00, 0.00, 0.00]. " +
      'Use axis [0.00, 0.00, 1.00].']);
  }, 120_000);

  it('an axis along the trunk fails and builds nothing', async () => {
    const model = await build(branchScript(`{ tube: 'act-1', at: ${stationAtX(190)}, axis: [1, 0, 0] }`));
    expect(model.diagnostics.filter((x) => x.severity === 'error').map((x) => x.code)).toContain('tube.branch.axis-not-square');
  }, 120_000);

  it('a branch larger than the trunk fails', async () => {
    const r = await run(branchScript(UP, 'od: 16'));
    expect(errorCodes(r)).toContain('tube.branch.od-too-large');
    expect(messages(r, 'tube.branch.od-too-large')).toEqual([
      "tube.branch.od-too-large: tube 'act-2' has OD 16.00 mm and branches off tube 'act-1', whose OD is 12.70 mm."]);
  }, 120_000);

  it('an unknown trunk fails evaluation with a diagnostic, not a throw', async () => {
    const r = await evaluateScriptTool({ code: branchScript("{ tube: 'act-9', at: 100, axis: [0, 0, 1] }") });
    expect(r.ok).toBe(false);
    const d = r.diagnostics.filter((x) => x.code === 'feature.invalid-args');
    expect(d).toHaveLength(1);
    expect(d[0].message).toMatch(/^tube\.branch\.trunk-not-found: /);
    expect(d[0].message).toContain("'act-1'");
  }, 120_000);

  it('a different declared system is an error', async () => {
    const r = await evaluateScriptTool({ code: branchScript(UP, "od: 12.7, system: 'fuel'") });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.filter((x) => x.code === 'feature.invalid-args')[0].message).toMatch(/^tube\.branch\.system-mismatch: /);
  }, 120_000);
});

describe('tube branch: clearance at the joint', () => {
  const back = (endZ: number): string => STRAIGHT + `
const b = tube('back', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, to: { point: [300, 0, ${endZ}], axis: [0, 0, 1] }, via: [[100, 0, 140], [300, 0, 140]], od: 12.7, wall: 0.9, bendRadius: 40 });
asm.part('back', b);
return asm.model();
`;

  it('a branch that comes back to its trunk outside the joint zone fails clearance', async () => {
    // The far end stops 10 mm above the trunk centreline: 3.65 mm from its wall.
    const r = await run(back(10));
    expect(errorCodes(r)).toEqual(['tube.clearance.violated']);
    expect(messages(r, 'tube.clearance.violated')[0]).toContain("tube 'trunk' is 3.65 mm from 'back'; the rule needs 6.00 mm.");
  }, 120_000);

  it('a branch that passes through its trunk outside the joint zone is an overlap', async () => {
    const r = await run(back(-20));
    expect(errorCodes(r)).toEqual(['tube.clearance.overlap']);
  }, 120_000);

  it('the same branch stopping 40 mm above the trunk passes', async () => {
    const r = await run(back(40));
    expect(errors(r)).toEqual([]);
  }, 120_000);

  it('a branch is not exempt against a tube that is not its trunk', async () => {
    // A second line 10 mm centre to centre beside the branch's first leg.
    const r = await run(STRAIGHT + `
const b = tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, to: { point: [100, 0, 200] }, od: 6, wall: 0.9, bendRadius: 40 });
asm.part('b', b);
const c = tube('c', { from: { point: [100, 10, 20] }, to: { point: [100, 10, 200] }, od: 6, wall: 0.9, bendRadius: 40 });
asm.part('c', c);
return asm.model();
`);
    expect(errorCodes(r)).toEqual(['tube.clearance.violated']);
    expect(messages(r, 'tube.clearance.violated')[0]).toContain("tube 'b' is 4.00 mm from 'c'");
  }, 120_000);
});

describe('tube branch: params and dependencies', () => {
  it('a param at moves the joint, and the branch is re-lowered', async () => {
    const code = STRAIGHT.replace("tubeSpec({});", "tubeSpec({});\nconst A = param('A', 100);") + `
const b = tube('b', { from: { tube: 'trunk', at: A, axis: [0, 0, 1] }, to: { point: [A.add(150), 0, 100], axis: [-1, 0, 0] }, via: [[A, 0, 100]], od: 12.7, wall: 0.9, bendRadius: 40 });
asm.part('b', b);
return asm.model();
`;
    const model = await build(code);
    const before = await gate(model);
    expect(errors(before)).toEqual([]);
    expect(line(before, 'b').from).toEqual({ tube: 'trunk', at: 100 });
    expect(tubeStart(model, 1)).toEqual([100, 0, 6.35]);
    expect(Math.abs(contact(model, 1, 0).at[0] - 100)).toBeLessThanOrEqual(6.35 + 1e-6);

    const updated = await updateModelParams(model, [{ name: 'A', value: 180 }]);
    const after = await gate(updated.model);
    expect(errors(after)).toEqual([]);
    expect(line(after, 'b').from).toEqual({ tube: 'trunk', at: 180 });
    expect(line(after, 'trunk').branches).toEqual([{ tube: 'b', at: 180 }]);
    expect(tubeStart(updated.model, 1)).toEqual([180, 0, 6.35]);
    // The solid was rebuilt at the new joint: it touches the trunk there and nowhere crosses it.
    expect(contact(updated.model, 1, 0).distance).toBeLessThan(1e-6);
    expect(Math.abs(contact(updated.model, 1, 0).at[0] - 180)).toBeLessThanOrEqual(6.35 + 1e-6);
    expect(tubeShape(updated.model, 1).intersectionVolume(tubeShape(updated.model, 0))).toBeLessThan(1e-3);
  }, 120_000);

  it('a param at that lands too close to the end is reported after the update', async () => {
    const code = STRAIGHT.replace("tubeSpec({});", "tubeSpec({});\nconst A = param('A', 100);") + `
const b = tube('b', { from: { tube: 'trunk', at: A, axis: [0, 0, 1] }, to: { point: [A, 0, 150] }, od: 12.7, wall: 0.9, bendRadius: 40 });
asm.part('b', b);
return asm.model();
`;
    const model = await build(code);
    expect(errors(await gate(model))).toEqual([]);
    const updated = await updateModelParams(model, [{ name: 'A', value: 390 }]);
    expect(errorCodes(await gate(updated.model))).toEqual(['tube.branch.too-close']);
  }, 120_000);

  it('a trunk moved by a param in the at of its part moves the joint with it', async () => {
    const code = `
const X = param('X', 0);
const asm = assembly('f11');
const pump = asm.part('pump', box(100, 100, 100), { at: [X, 0, 0] })
  .connector('supply', { type: 'axis', origin: { kind: 'vec3', value: [50, 50, 100] }, axis: [0, 0, 1], port: { system: 'act', od: 12.7 } });
tubeSpec({});
const a = tube('act-1', { from: pump.port('supply'), to: { point: [X.add(300), 50, 250], axis: [-1, 0, 0] }, via: [[X.add(50), 50, 250]], wall: 0.9, bendRadius: 40 });
asm.part('act-1', a);
const b = tube('act-2', { from: ${UP}, to: { point: [X.add(-200), 50, 400], axis: [1, 0, 0] }, via: [[X.add(190), 50, 400]], od: 12.7, wall: 0.9, bendRadius: 40 });
asm.part('act-2', b);
return asm.model();
`;
    const model = await build(code);
    expect(errors(await gate(model))).toEqual([]);
    expect(tubeStart(model, 1)[0]).toBeCloseTo(190, 9);

    const updated = await updateModelParams(model, [{ name: 'X', value: 35 }]);
    const after = await gate(updated.model);
    expect(errors(after)).toEqual([]);
    expect(tubeStart(updated.model, 1)[0]).toBeCloseTo(225, 9);
    expect(tubeStart(updated.model, 1)[2]).toBeCloseTo(256.35, 9);
    expect(contact(updated.model, 1, 0).distance).toBeLessThan(1e-6);
    expect(Math.abs(contact(updated.model, 1, 0).at[0] - 225)).toBeLessThanOrEqual(6.35 + 1e-6);
    expect(tubeShape(updated.model, 1).intersectionVolume(tubeShape(updated.model, 0))).toBeLessThan(1e-3);
  }, 120_000);

  it('a trunk moved by a param moves a branch that has no param of its own', async () => {
    const code = `
const S = param('S', 0);
tubeSpec({});
const trunk = tube('trunk', { from: { point: [S, 0, 0] }, to: { point: [S.add(400), 0, 0] }, od: 12.7, wall: 0.9, bendRadius: 40 });
const b = tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, to: { point: [100, 0, 200] }, od: 12.7, wall: 0.9, bendRadius: 40 });
return b;
`;
    const model = await build(code);
    const branchId = model.records.filter((r) => r.kind === 'tube')[1].id;
    expect((model.records.find((r) => r.id === branchId)!.metadata as { paramRefs?: string[] }).paramRefs).toBeUndefined();
    expect(tubeStart(model, 1)).toEqual([100, 0, 6.35]);
    const updated = await updateModelParams(model, [{ name: 'S', value: 20 }]);
    expect(updated.result.relowered).toContain(branchId);
    expect(tubeStart(updated.model, 1)).toEqual([120, 0, 6.35]);
    expect(Math.abs(contact(updated.model, 1, 0).at[0] - 120)).toBeLessThanOrEqual(6.35 + 1e-6);
    expect(contact(updated.model, 1, 0).distance).toBeLessThan(1e-6);
  }, 120_000);

  it('the trunk is lowered before the branch whatever order the records come in', async () => {
    const model = await build(STRAIGHT + `
const b = tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, to: { point: [100, 0, 200] }, od: 12.7, wall: 0.9, bendRadius: 40 });
return b;
`);
    const [trunk, branch] = model.records.filter((r) => r.kind === 'tube');
    const order: string[] = [];
    const result = await new RecomputeEngine(createOcctLowerer(model.session)).run([branch, trunk], {
      paramTable: model.session.paramTable,
      onEvent: (e) => { if (e.kind === 'feature.compiled') order.push(e.featureId); },
    });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(order).toEqual([trunk.id, branch.id]);
  }, 120_000);

  it('a branch declared before its trunk is refused: the trunk must come first', async () => {
    const r = await evaluateScriptTool({ code: `
tubeSpec({});
const b = tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, to: { point: [100, 0, 150] }, od: 12.7, wall: 0.9, bendRadius: 40 });
const trunk = tube('trunk', { from: { point: [0, 0, 0] }, to: { point: [400, 0, 0] }, od: 12.7, wall: 0.9, bendRadius: 40 });
return trunk;
` });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.filter((x) => x.code === 'feature.invalid-args')[0].message).toMatch(/^tube\.branch\.trunk-not-found: /);
  }, 120_000);
});

describe('tube branch: either end, and a branch of a branch', () => {
  it('the to end may be the branch end', async () => {
    const r = await run(STRAIGHT + `
const b = tube('b', { from: { point: [250, 0, 150], axis: [-1, 0, 0] }, to: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, via: [[100, 0, 150]], od: 12.7, wall: 0.9, bendRadius: 40 });
asm.part('b', b);
return asm.model();
`);
    expect(errors(r)).toEqual([]);
    expect(line(r, 'b').to).toEqual({ tube: 'trunk', at: 100 });
    expect(line(r, 'b').from).toBeUndefined();
    // 150 mm leg from x = 250 to the corner, then down to the wall at z = 6.35.
    expect(line(r, 'b').lastStraight).toBeCloseTo(150 - 6.35 - 40, 6);
  }, 120_000);

  it('a branch may itself be a trunk', async () => {
    const r = await run(STRAIGHT + `
const b = tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, to: { point: [100, 0, 200] }, od: 12.7, wall: 0.9, bendRadius: 40 });
asm.part('b', b);
const c = tube('c', { from: { tube: 'b', at: 100, axis: [0, 1, 0] }, to: { point: [100, 150, 106.35] }, od: 6.35, wall: 0.9, bendRadius: 40 });
asm.part('c', c);
return asm.model();
`);
    expect(errors(r)).toEqual([]);
    expect(line(r, 'b').from).toEqual({ tube: 'trunk', at: 100 });
    expect(line(r, 'b').branches).toEqual([{ tube: 'c', at: 100 }]);
    // b starts on the trunk wall at z = 6.35, so its station 100 is z = 106.35; c starts on b's wall.
    expect(line(r, 'c').cutLength).toBeCloseTo(150 - 6.35, 6);
  }, 120_000);
});

describe('tube branch: exports', () => {
  it('the bend table of the trunk lists the branch station, and the branch names its trunk', async () => {
    const out = await mkdtemp(join(tmpdir(), 'bend-branch-'));
    const r = await exportModelTool({ code: branchScript(UP), format: 'bend-table', output_path: out });
    expect(r.ok).toBe(true);
    const trunk = await readFile(join(out, 'act-1.csv'), 'utf8');
    expect(trunk).toContain(`branch,at_mm\nact-2,${stationAtX(190).toFixed(3)}\n`);
    const branch = await readFile(join(out, 'act-2.csv'), 'utf8');
    expect(branch).toContain(`from_tube,act-1\nfrom_at_mm,${stationAtX(190).toFixed(3)}\n`);
    expect(branch).not.toContain('branch,at_mm');
  }, 120_000);

  it('STEP keeps one solid per tube', async () => {
    const out = join(await mkdtemp(join(tmpdir(), 'step-branch-')), 'branch.step');
    const r = await exportModelTool({ code: STRAIGHT + `
const b = tube('b', { from: { tube: 'trunk', at: 100, axis: [0, 0, 1] }, to: { point: [100, 0, 200] }, od: 12.7, wall: 0.9, bendRadius: 40 });
asm.part('b', b);
return asm.model();
`, format: 'step', output_path: out });
    expect(r.ok).toBe(true);
    expect((await readFile(out, 'utf8')).match(/MANIFOLD_SOLID_BREP/g)).toHaveLength(2);
  }, 120_000);
});
