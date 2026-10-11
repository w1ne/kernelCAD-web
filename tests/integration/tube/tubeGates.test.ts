// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tube gates on built scripts: path rules, port positions, clearance against
// parts and other tubes, and the per-tube line report.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runTubeChecksOnModel, type TubeCheckReport } from '../../../src/modeling/runtime/tube/runTubeChecks';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry';

// Counts exact kernel distance measurements, to hold the bounding-box prefilter to its job, and
// fails the measurement whose 1-based call number is `failCall`.
const kernel = vi.hoisted(() => ({ exactCalls: 0, failCall: 0, failRod: false }));
vi.mock('../../../src/modeling/runtime/brepDistance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/modeling/runtime/brepDistance')>();
  return {
    ...actual,
    brepExtremaClosest: (...args: Parameters<typeof actual.brepExtremaClosest>) => {
      kernel.exactCalls += 1;
      if (kernel.exactCalls === kernel.failCall) return undefined;
      return actual.brepExtremaClosest(...args);
    },
  };
});
// When `failRod` is set, the sweep that builds a tube solid throws (set after the model is built).
vi.mock('../../../src/modeling/backends/occt/tubeLowerer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/modeling/backends/occt/tubeLowerer')>();
  return {
    ...actual,
    tubeSolid: (...args: Parameters<typeof actual.tubeSolid>) => {
      if (kernel.failRod) throw new Error('injected sweep failure');
      return actual.tubeSolid(...args);
    },
  };
});

/** Build the script, then run the gate; `arm` runs in between, to inject kernel faults into the gate only. */
async function runWithFault(code: string, arm: () => void): Promise<TubeCheckReport> {
  const model = await buildModel({ fileName: 'tube-gates.kcad.ts', code });
  expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  arm();
  const report = await runTubeChecksOnModel(model);
  for (const d of report!.diagnostics) expect(d.hint.trim().length, `${d.code} has no hint`).toBeGreaterThan(0);
  return report!;
}

async function runRaw(code: string): Promise<TubeCheckReport | undefined> {
  const model = await buildModel({ fileName: 'tube-gates.kcad.ts', code });
  expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return runTubeChecksOnModel(model);
}

async function run(code: string): Promise<TubeCheckReport> {
  const report = await runRaw(code);
  expect(report).toBeDefined();
  for (const d of report!.diagnostics) expect(d.hint.trim().length, `${d.code} has no hint`).toBeGreaterThan(0);
  return report!;
}

const errors = (r: TubeCheckReport) => r.diagnostics.filter((d) => d.severity === 'error');
const codes = (r: TubeCheckReport) => r.diagnostics.map((d) => d.code);
const messages = (r: TubeCheckReport, code: string) => r.diagnostics.filter((d) => d.code === code).map((d) => d.message);

/** A 40 mm block with a fuel port on top (p1) and a bleed port on its +X side (p2), and a wall at x = 150..160. */
const HEAD = `
const asm = assembly('rig');
const block = asm.part('block', box(40, 40, 40), { at: [0, 0, 0] })
  .connector('p1', { type: 'axis', origin: { kind: 'vec3', value: [20, 20, 40] }, axis: [0, 0, 1], port: { system: 'fuel', od: 10 } })
  .connector('p2', { type: 'axis', origin: { kind: 'vec3', value: [40, 20, 20] }, axis: [1, 0, 0], port: { system: 'bleed', od: 10 } });
const wall = asm.part('wall', box(10, 200, 200), { at: [150, -80, 0] });
`;

beforeEach(() => {
  kernel.exactCalls = 0;
  kernel.failCall = 0;
  kernel.failRod = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('tube gates: path rules and line report', () => {
  it('a legal line passes and reports its bend table', async () => {
    const r = await run(HEAD + `
tubeSpec({});
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 150, 120], axis: [0, -1, 0] }, via: [[20, 20, 120]], wall: 1, bendRadius: 30 });
asm.part('fuel-1', t);
return asm.model();`);
    expect(r.diagnostics).toEqual([]);
    expect(r.usedDefaultSpec).toBe(false);
    const line = r.lines[0];
    expect(line).toMatchObject({ name: 'fuel-1', system: 'fuel', bends: 1, od: 10, wall: 1, bendRadius: 30 });
    expect(line.lra).toEqual([{ l: 50, r: 0, a: expect.closeTo(90, 9) }]);
    expect(line.lastStraight).toBeCloseTo(100, 9);
    expect(line.minStraight).toBeCloseTo(50, 9);
    expect(line.cutLength).toBeCloseTo(150 + 15 * Math.PI, 9);
    expect(line.xyz).toHaveLength(3);
    // The block owns the port: the 25 mm end straight is the fitting zone, the rest starts 25 mm above it.
    expect(line.minClearance!.to).toBe('block');
    expect(line.minClearance!.mm).toBeGreaterThan(24.5);
    expect(line.minClearance!.mm).toBeLessThan(25.5);
    expect(line.minClearance!.at[2]).toBeCloseTo(65, 6);
    expect(line.massKg).toBeNull();
    expect(line.pressureDropKPa).toBeNull();
    expect(line.volumeInternalMl).toBeCloseTo((Math.PI * 16 * line.cutLength) / 1000, 9);
    expect(r.systems).toEqual([{ system: 'fuel', lines: 1, cutLength: line.cutLength, massKg: null }]);
    expect(r.timings.total).toBeGreaterThan(0);
  });

  it('param-driven bend radius and corner are resolved before checking', async () => {
    const r = await run(HEAD + `
tubeSpec({});
const R = param('R', 30);
const H = param('H', 120);
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 150, H] }, via: [[20, 20, H]], wall: 1, bendRadius: R });
asm.part('fuel-1', t);
return asm.model();`);
    expect(errors(r)).toEqual([]);
    expect(r.lines[0].bendRadius).toBe(30);
    expect(r.lines[0].lra[0].l).toBeCloseTo(50, 9);
    expect(r.lines[0].cutLength).toBeCloseTo(150 + 15 * Math.PI, 9);
  });

  it('a param-driven radius below the rule fails with the resolved value', async () => {
    const r = await run(HEAD + `
tubeSpec({});
const R = param('R', 22);
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 150, 120] }, via: [[20, 20, 120]], wall: 1, bendRadius: R });
asm.part('fuel-1', t);
return asm.model();`);
    expect(messages(r, 'tube.bend.radius-too-small')).toEqual([
      "tube.bend.radius-too-small: tube 'fuel-1' bends at 22.00 mm; the rule needs 30.00 mm (3 x OD 10.00)."]);
    const d = r.diagnostics[0];
    expect(d.severity).toBe('error');
    expect(d.featureId).toBe('tube_1');
    expect(d.nextAction).toEqual({ kind: 'fix-arg', field: 'bendRadius' });
  });

  it('mass, internal volume and pressure drop come from the tube options', async () => {
    const r = await run(`
tubeSpec({});
tube('a', { from: { point: [0, 0, 0] }, to: { point: [1000, 0, 0] }, od: 10, wall: 1, bendRadius: 30, system: 'cool',
  material: 'aluminum', flow: { lpm: 6, fluid: 'water' } });
tube('b', { from: { point: [0, 100, 0] }, to: { point: [1000, 100, 0] }, od: 10, wall: 1, bendRadius: 30, system: 'cool', density: 8000 });
tube('c', { from: { point: [0, 200, 0] }, to: { point: [500, 200, 0] }, od: 10, wall: 1, bendRadius: 30, system: 'vent' });
return box(1, 1, 1);`);
    expect(errors(r)).toEqual([]);
    const section = Math.PI * (25 - 16);
    const [a, b, c] = r.lines;
    expect(a.material).toBe('aluminum');
    expect(a.massKg! / (section * 1000 / 1e9)).toBeGreaterThan(2600);
    expect(a.massKg! / (section * 1000 / 1e9)).toBeLessThan(2900);
    expect(b.massKg).toBeCloseTo((section * 1000 * 8000) / 1e9, 6);
    expect(c.massKg).toBeNull();
    expect(a.volumeInternalMl).toBeCloseTo((Math.PI * 16 * 1000) / 1000, 9);
    // 6 L/min of water in an 8 mm bore: about 2 m/s, turbulent, a few kPa per metre.
    expect(a.pressureDropKPa).toBeGreaterThan(3);
    expect(a.pressureDropKPa).toBeLessThan(8);
    expect(b.pressureDropKPa).toBeNull();
    expect(r.systems).toEqual([
      { system: 'cool', lines: 2, cutLength: 2000, massKg: expect.closeTo(a.massKg! + b.massKg!, 9) },
      { system: 'vent', lines: 1, cutLength: 500, massKg: null },
    ]);
  });

  it('no tubeSpec gives the defaulted warning and still enforces', async () => {
    const r = await run(HEAD + `
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 150, 120] }, via: [[20, 20, 120]], wall: 1, bendRadius: 12 });
asm.part('fuel-1', t); return asm.model();`);
    expect(r.usedDefaultSpec).toBe(true);
    expect(codes(r)).toEqual(['tube.spec.defaulted', 'tube.bend.radius-too-small']);
    expect(r.diagnostics[0].severity).toBe('warn');
    expect(r.diagnostics[0].hint).toBe(DIAGNOSTIC_REGISTRY['tube.spec.defaulted'].hintTemplate);
  });

  it('the last tubeSpec wins', async () => {
    const r = await run(HEAD + `
tubeSpec({ minBendRadiusFactor: 5 });
tubeSpec({ minBendRadiusFactor: 2 });
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 150, 120] }, via: [[20, 20, 120]], wall: 1, bendRadius: 22 });
asm.part('fuel-1', t); return asm.model();`);
    expect(r.diagnostics).toEqual([]);
  });

  it('a script with no tubes returns undefined', async () => {
    expect(await runRaw(`return box(10, 10, 10);`)).toBeUndefined();
  });

  it('tubes outside any assembly are still checked and reported', async () => {
    const solo = await run(`
tubeSpec({});
return tube('solo', { from: { point: [0, 0, 0] }, to: { point: [100, 60, 0] }, via: [[100, 0, 0]], od: 10, wall: 1, bendRadius: 20 });`);
    expect(codes(solo)).toEqual(['tube.bend.radius-too-small']);
    expect(solo.lines).toHaveLength(1);
    expect(solo.lines[0]).toMatchObject({ name: 'solo', bends: 1, bendRadius: 20 });
    expect(solo.lines[0].minClearance).toBeUndefined();
    expect(solo.systems).toEqual([]);

    // Not added to the assembly: measured where it was built, against the scene's parts.
    const loose = await run(HEAD + `
tubeSpec({});
tube('loose', { from: { point: [142, 20, 0] }, to: { point: [142, 20, 100] }, od: 10, wall: 1, bendRadius: 30 });
return asm.model();`);
    expect(messages(loose, 'tube.clearance.violated')).toEqual([
      expect.stringMatching(/^tube\.clearance\.violated: tube 'loose' is 3\.00 mm from 'wall'; the rule needs 6\.00 mm\./)]);
    expect(loose.lines[0].minClearance).toMatchObject({ to: 'wall', mm: expect.closeTo(3, 6) });
  });
});

describe('tube gates: clearance', () => {
  it('a tube 3 mm from a part violates the 6 mm default and names both', async () => {
    const r = await run(HEAD + `
tubeSpec({});
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [142, 20, 200] }, via: [[20, 20, 120], [142, 20, 120]], wall: 1, bendRadius: 30 });
asm.part('fuel-1', t);
return asm.model();`);
    expect(codes(r)).toEqual(['tube.clearance.violated']);
    const m = r.diagnostics[0].message;
    expect(m).toMatch(/tube 'fuel-1' is 3\.00 mm from 'wall'; the rule needs 6\.00 mm\. Closest point on the tube: \[147\.00, [-\d.]+, [-\d.]+\]; on 'wall': \[150\.00, [-\d.]+, [-\d.]+\]\.$/);
    expect(r.lines[0].minClearance).toMatchObject({ to: 'wall', mm: expect.closeTo(3, 6) });
    expect(r.lines[0].minClearance!.at[0]).toBeCloseTo(147, 6);
  });

  it('a larger default clearance in the spec is enforced', async () => {
    const src = (min: number) => HEAD + `
tubeSpec({ clearance: { default: ${min} } });
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [130, 20, 200] }, via: [[20, 20, 120], [130, 20, 120]], wall: 1, bendRadius: 30 });
asm.part('fuel-1', t);
return asm.model();`;
    expect((await run(src(15))).diagnostics).toEqual([]);   // 15 mm from the wall exactly
    expect(messages(await run(src(16)), 'tube.clearance.violated')[0])
      .toContain("tube 'fuel-1' is 15.00 mm from 'wall'; the rule needs 16.00 mm.");
  });

  it('a tube through a part reports overlap with the shared volume', async () => {
    const r = await run(HEAD + `
tubeSpec({});
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [250, 20, 120] }, via: [[20, 20, 120]], wall: 1, bendRadius: 30 });
asm.part('fuel-1', t);
return asm.model();`);
    expect(codes(r)).toEqual(['tube.clearance.overlap']);
    // 10 mm of wall across a 10 x 1 mm tube section: pi * (25 - 16) * 10 = 282.74 mm^3.
    expect(r.diagnostics[0].message).toBe("tube.clearance.overlap: tube 'fuel-1' passes through 'wall' (282.74 mm^3 shared).");
    expect(r.lines[0].minClearance).toMatchObject({ to: 'wall', mm: 0 });
  });

  it('a tube touching a part without entering it violates at 0 mm', async () => {
    // Tangent: the tube's outer surface (x = 145 + 5) lies on the wall face at x = 150.
    const r = await run(HEAD + `
tubeSpec({});
tube('loose', { from: { point: [145, 20, 20] }, to: { point: [145, 20, 100] }, od: 10, wall: 1, bendRadius: 30 });
return asm.model();`);
    expect(codes(r)).toEqual(['tube.clearance.violated']);
    expect(r.diagnostics[0].message).toMatch(
      /^tube\.clearance\.violated: tube 'loose' is 0\.00 mm from 'wall'; the rule needs 6\.00 mm\. Closest point on the tube: \[150\.00, 20\.00, /);
    expect(r.lines[0].minClearance).toMatchObject({ to: 'wall', mm: 0 });
  });

  it('a failed distance measurement warns for that pair and the others are still measured', async () => {
    const src = HEAD + `
tubeSpec({});
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [142, 20, 200] }, via: [[20, 20, 120], [142, 20, 120]], wall: 1, bendRadius: 30 });
asm.part('fuel-1', t);
return asm.model();`;
    // The wall is the nearest pair, so it is measured first.
    const r = await runWithFault(src, () => { kernel.failCall = 1; });
    expect(codes(r)).toEqual(['feature.kernel-failed']);
    expect(r.diagnostics[0].severity).toBe('warn');
    expect(r.diagnostics[0].message).toBe(
      "tube.clearance: the distance measurement failed on tube 'fuel-1' and 'wall'; this pair's clearance was not checked.");
    expect(r.lines[0].minClearance).toMatchObject({ to: 'block', mm: expect.closeTo(25, 6) });
    expect(r.lines[0].cutLength).toBeGreaterThan(0);
  });

  it('a failed fitting-zone sweep warns for the port owner and the other parts are still measured', async () => {
    const src = HEAD + `
tubeSpec({});
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [142, 20, 200] }, via: [[20, 20, 120], [142, 20, 120]], wall: 1, bendRadius: 30 });
asm.part('fuel-1', t);
return asm.model();`;
    const r = await runWithFault(src, () => { kernel.failRod = true; });
    expect(codes(r)).toEqual(['feature.kernel-failed', 'tube.clearance.violated']);
    expect(r.diagnostics[0].message).toBe(
      "tube.clearance: building the tube without its fitting zone failed on tube 'fuel-1' and 'block'; this pair's clearance was not checked.");
    expect(r.diagnostics[1].message).toContain("tube 'fuel-1' is 3.00 mm from 'wall'");
  });

  it('a tube whose bounding box fails still gets its rules and line report', async () => {
    const src = `
tubeSpec({});
tube('a', { from: { point: [0, 0, 0] }, to: { point: [100, 60, 0] }, via: [[100, 0, 0]], od: 10, wall: 1, bendRadius: 20, density: 8000 });
return box(1, 1, 1);`;
    const r = await runWithFault(src, () => {
      vi.spyOn(OcctBackend.prototype, 'boundingBox').mockImplementation(() => { throw new Error('injected bbox failure'); });
      vi.spyOn(OcctBackend.prototype, 'volume').mockImplementation(() => { throw new Error('injected volume failure'); });
    });
    expect(codes(r)).toEqual(['tube.bend.radius-too-small', 'feature.kernel-failed']);
    expect(r.diagnostics[1].message).toBe(
      "tube.clearance: the bounding box failed on tube 'a'; the tube's clearance was not checked.");
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].minClearance).toBeUndefined();
    // Mass falls back to section x cut length when the solid cannot be measured.
    expect(r.lines[0].massKg).toBeCloseTo((Math.PI * (25 - 16) * r.lines[0].cutLength * 8000) / 1e9, 12);
  });

  it('a system pair rule is stricter than the default', async () => {
    const src = (min: number) => HEAD + `
tubeSpec({ clearance: { pairs: [{ a: 'fuel', b: 'bleed', min: ${min} }] } });
const a = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 20, 200] }, wall: 1, bendRadius: 30 });
const b = tube('bleed-1', { from: block.port('p2'), to: { point: [100, 20, 200] }, via: [[100, 20, 20]], wall: 1, bendRadius: 30 });
asm.part('fuel-1', a); asm.part('bleed-1', b);
return asm.model();`;
    const ok = await run(src(10));
    expect(ok.diagnostics).toEqual([]);
    // Nearest approach is at the two ports: 15 mm apart in x and in z.
    expect(ok.lines.map((l) => [l.name, l.minClearance!.to])).toEqual([['fuel-1', 'bleed-1'], ['bleed-1', 'fuel-1']]);
    expect(ok.lines[0].minClearance!.mm).toBeCloseTo(Math.hypot(15, 15), 6);
    const strict = await run(src(90));
    expect(messages(strict, 'tube.clearance.violated')).toEqual([
      expect.stringContaining("tube 'fuel-1' is 21.21 mm from 'bleed-1'; the rule needs 90.00 mm.")]);
  });

  it('the pair rule applies in either order and the largest matching rule wins', async () => {
    const r = await run(HEAD + `
tubeSpec({ clearance: { pairs: [{ a: 'bleed', b: 'fuel', min: 22 }, { a: 'fuel', b: 'bleed', min: 30 }, { a: 'fuel', b: 'oil', min: 99 }] } });
const a = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 20, 200] }, wall: 1, bendRadius: 30 });
const b = tube('bleed-1', { from: block.port('p2'), to: { point: [100, 20, 200] }, via: [[100, 20, 20]], wall: 1, bendRadius: 30 });
asm.part('fuel-1', a); asm.part('bleed-1', b);
return asm.model();`);
    expect(messages(r, 'tube.clearance.violated')).toEqual([
      expect.stringContaining("is 21.21 mm from 'bleed-1'; the rule needs 30.00 mm.")]);
    // The fuel / oil pair matches no tube: a warning, not an error.
    expect(messages(r, 'tube.clearance.pair-unused')).toEqual([
      "tube.clearance.pair-unused: clearance pair 'fuel' / 'oil' (99.00 mm) applies to no tubes: no tube has system 'oil'. " +
      "Systems in this script: 'bleed', 'fuel'."]);
  });

  it('a misspelt system in a clearance pair warns and names the systems present', async () => {
    const r = await run(`
const asm = assembly('rig');
tubeSpec({ clearance: { default: 6, pairs: [{ a: 'fuel', b: 'bleeed', min: 25 }, { a: 'x', b: 'y', min: 9 }] } });
const a = tube('a', { from: { point: [200, 0, 0] }, to: { point: [200, 0, 200] }, od: 10, wall: 1, bendRadius: 30, system: 'fuel' });
const b = tube('b', { from: { point: [225, 0, 0] }, to: { point: [225, 0, 200] }, od: 10, wall: 1, bendRadius: 30, system: 'bleed' });
asm.part('a', a); asm.part('b', b);
return asm.model();`);
    expect(codes(r)).toEqual(['tube.clearance.pair-unused', 'tube.clearance.pair-unused']);
    expect(r.diagnostics.map((d) => d.severity)).toEqual(['warn', 'warn']);
    expect(r.diagnostics.map((d) => d.message)).toEqual([
      "tube.clearance.pair-unused: clearance pair 'fuel' / 'bleeed' (25.00 mm) applies to no tubes: no tube has system 'bleeed'. " +
      "Systems in this script: 'bleed', 'fuel'.",
      "tube.clearance.pair-unused: clearance pair 'x' / 'y' (9.00 mm) applies to no tubes: no tube has system 'x' or 'y'. " +
      "Systems in this script: 'bleed', 'fuel'."]);
  });

  it('a clearance wider than the end straight does not fail a tube against its own port owner', async () => {
    const src = (rest: string) => `
const asm = assembly('rig');
const block = asm.part('block', box(40, 40, 40), { at: [0, 0, 0] })
  .connector('p1', { type: 'axis', origin: { kind: 'vec3', value: [20, 20, 40] }, axis: [0, 0, 1], port: { system: 'air', od: 3.175 } });
tubeSpec({ clearance: { default: 10 } });
const a = tube('a', { from: block.port('p1'), ${rest}, wall: 0.5, bendRadius: 10 });
asm.part('a', a);
return asm.model();`;
    // 2.5 x OD is 7.94 mm; the rule is 10 mm. The zone is the larger of the two.
    const ok = await run(src('to: { point: [20, 20, 200] }'));
    expect(ok.diagnostics).toEqual([]);
    expect(ok.lines[0].minClearance).toMatchObject({ to: 'block', mm: expect.closeTo(10, 6) });
    // Up, over, down the far side and back in: the free end stops 6 mm from the block's -X face.
    const grazing = await run(src('to: { point: [-6, 20, 20] }, via: [[20, 20, 140], [-70, 20, 140], [-70, 20, 20]]'));
    expect(messages(grazing, 'tube.clearance.violated')).toEqual([
      expect.stringContaining("tube 'a' is 6.00 mm from 'block'; the rule needs 10.00 mm.")]);
  });

  it('a tube shape added under a second part name is reported', async () => {
    const r = await run(HEAD + `
tubeSpec({});
const a = tube('a', { from: block.port('p1'), to: { point: [20, 150, 120] }, via: [[20, 20, 120]], wall: 1, bendRadius: 30 });
asm.part('a', a); asm.part('a2', a, { at: [0, 0, -300] });
return asm.model();`);
    expect(messages(r, 'tube.part.duplicate')).toEqual([
      "tube.part.duplicate: tube 'a' is added to the assembly as parts 'a', 'a2'; only 'a' is checked."]);
    expect(r.diagnostics.find((d) => d.code === 'tube.part.duplicate')!.severity).toBe('error');
  });

  it('the port owner is exempt at the fitting but not elsewhere', async () => {
    const ok = await run(HEAD + `
tubeSpec({});
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 20, 200] }, wall: 1, bendRadius: 30 });
asm.part('fuel-1', t); return asm.model();`);
    expect(ok.diagnostics).toEqual([]);
    // Up, over the block, down its far side, and back in: the free end stops 4 mm from the block's -X face.
    const grazing = await run(HEAD + `
tubeSpec({});
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [-4, 20, 20] }, via: [[20, 20, 140], [-70, 20, 140], [-70, 20, 20]], wall: 1, bendRadius: 30 });
asm.part('fuel-1', t); return asm.model();`);
    expect(codes(grazing)).toEqual(['tube.clearance.violated']);
    expect(grazing.diagnostics[0].message).toContain("tube 'fuel-1' is 4.00 mm from 'block'; the rule needs 6.00 mm.");
    expect(grazing.diagnostics[0].message).toContain('[-4.00, ');
  });

  it('a port that asks for a longer straight has a longer fitting zone', async () => {
    const r = await run(`
const asm = assembly('rig');
const block = asm.part('block', box(40, 40, 40), { at: [0, 0, 0] })
  .connector('p1', { type: 'axis', origin: { kind: 'vec3', value: [20, 20, 40] }, axis: [0, 0, 1], port: { system: 'fuel', od: 10, minStraight: 40 } });
tubeSpec({});
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 20, 200] }, wall: 1, bendRadius: 30 });
asm.part('fuel-1', t); return asm.model();`);
    expect(r.diagnostics).toEqual([]);
    expect(r.lines[0].minClearance).toMatchObject({ to: 'block', mm: expect.closeTo(40, 6) });
  });

  it('two tubes from different ports of one part pass apart and fail where one crosses the other', async () => {
    const src = (bleedRoute: string) => HEAD + `
tubeSpec({});
const a = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 20, 200] }, wall: 1, bendRadius: 30 });
const b = tube('bleed-1', { from: block.port('p2'), ${bleedRoute}, wall: 1, bendRadius: 30 });
asm.part('fuel-1', a); asm.part('bleed-1', b);
return asm.model();`;
    const apart = await run(src(`to: { point: [100, 20, 200] }, via: [[100, 20, 20]]`));
    expect(apart.diagnostics).toEqual([]);
    // The bleed line turns back over the block at z = 120 and runs through the fuel line.
    const crossing = await run(src(`to: { point: [-60, 20, 120] }, via: [[100, 20, 20], [100, 20, 120]]`));
    expect(codes(crossing)).toEqual(['tube.clearance.overlap']);
    expect(crossing.diagnostics[0].message).toMatch(/^tube\.clearance\.overlap: tube 'fuel-1' passes through 'bleed-1' \(\d+\.\d\d mm\^3 shared\)\.$/);
    expect(crossing.lines.map((l) => l.minClearance!.mm)).toEqual([0, 0]);
  });

  it('the bounding-box prefilter keeps exact measurements to the pairs that are near', async () => {
    // 6 tubes in a row 60 mm apart and 40 blocks in a far grid: 15 tube pairs + 240 tube-part pairs.
    const r = await run(`
const asm = assembly('field');
tubeSpec({});
for (let i = 0; i < 6; i++) {
  asm.part('line-' + i, tube('line-' + i, { from: { point: [i * 60, 0, 0] }, to: { point: [i * 60, 80, 100] }, via: [[i * 60, 0, 100]], od: 10, wall: 1, bendRadius: 30 }));
}
for (let i = 0; i < 40; i++) {
  asm.part('block-' + i, box(20, 20, 20), { at: [(i % 8) * 60, 300 + Math.floor(i / 8) * 60, 0] });
}
return asm.model();`);
    expect(r.diagnostics).toEqual([]);
    expect(r.lines).toHaveLength(6);
    for (const line of r.lines) expect(line.minClearance!.mm).toBeCloseTo(50, 6);
    expect(kernel.exactCalls).toBeLessThanOrEqual(12);
  });
});

describe('tube gates: a plain end that names its part', () => {
  const line = (from: string, rest = "to: { point: [20, 150, 120] }, via: [[20, 20, 120]]") => HEAD + `
tubeSpec({});
const t = tube('fuel-1', { from: ${from}, ${rest}, od: 10, wall: 1, bendRadius: 30 });
asm.part('fuel-1', t); return asm.model();`;

  it('on the part surface with `part` set, the end straight is the fitting zone', async () => {
    const r = await run(line("{ point: [20, 20, 40], axis: [0, 0, 1], part: 'block' }"));
    expect(r.diagnostics).toEqual([]);
    // 2.5 x OD of end straight is excused; the rest starts 25 mm above the block.
    expect(r.lines[0].minClearance).toMatchObject({ to: 'block', mm: expect.closeTo(25, 6) });
  });

  it('the same end without `part` touches the block and violates at 0 mm', async () => {
    const r = await run(line('{ point: [20, 20, 40], axis: [0, 0, 1] }'));
    expect(codes(r)).toEqual(['tube.clearance.violated']);
    expect(r.diagnostics[0].message).toContain("tube 'fuel-1' is 0.00 mm from 'block'; the rule needs 6.00 mm.");
  });

  it('with `part` set the tube is still measured against that part outside the end straight', async () => {
    // Up, over the block, down its far side, and back in: the free end stops 4 mm from the block's -X face.
    const r = await run(line("{ point: [20, 20, 40], axis: [0, 0, 1], part: 'block' }",
      'to: { point: [-4, 20, 20] }, via: [[20, 20, 140], [-70, 20, 140], [-70, 20, 20]]'));
    expect(codes(r)).toEqual(['tube.clearance.violated']);
    expect(r.diagnostics[0].message).toContain("tube 'fuel-1' is 4.00 mm from 'block'; the rule needs 6.00 mm.");
  });

  it('a part name the assembly does not have is reported, and the tube is measured in full', async () => {
    const r = await run(line("{ point: [20, 20, 40], axis: [0, 0, 1], part: 'blok' }"));
    expect(codes(r)).toEqual(['tube.end.part-not-found', 'tube.clearance.violated']);
    expect(r.diagnostics[0].severity).toBe('error');
    expect(r.diagnostics[0].message).toBe(
      "tube.end.part-not-found: tube 'fuel-1' from end names part 'blok', which is not a part of the assembly; its parts are 'block', 'wall', 'fuel-1'.");
  });

  it('an end 3 mm off the part it names is not on it, and gets no fitting zone', async () => {
    const r = await run(HEAD + `
tubeSpec({});
const a = tube('a', { from: { point: [20, 20, 43], axis: [0, 0, 1], part: 'block' }, to: { point: [20, 20, 200] }, od: 10, wall: 1, bendRadius: 30 });
asm.part('a', a);
return asm.model();`);
    expect(codes(r)).toEqual(['tube.port.misaligned', 'tube.clearance.violated']);
    expect(r.diagnostics[0].message).toBe(
      "tube.port.misaligned: tube 'a' from end is 3.00 mm from part 'block', which it names as its part; the end must touch the part.");
    expect(r.diagnostics[1].message).toContain("tube 'a' is 3.00 mm from 'block'; the rule needs 6.00 mm.");
  });

  it('an end that names a part far away is reported', async () => {
    const r = await run(`
const asm = assembly('rig');
const block = asm.part('block', box(40, 40, 40), { at: [0, 0, 0] });
asm.part('wall', box(10, 200, 200), { at: [300, -80, 0] });
tubeSpec({});
const a = tube('a', { from: { point: [20, 20, 40], axis: [0, 0, 1], part: 'block' }, to: { point: [20, 150, 120], axis: [0, -1, 0], part: 'wall' }, via: [[20, 20, 120]], od: 10, wall: 1, bendRadius: 30 });
asm.part('a', a);
return asm.model();`);
    // The wall is 275 mm away in x and its edge 20 mm short of the end stub in y.
    expect(r.diagnostics.map((d) => d.message)).toEqual([
      "tube.port.misaligned: tube 'a' to end is 275.73 mm from part 'wall', which it names as its part; the end must touch the part."]);
  });

  it('an end on a part a mate moved is routed to the solved position and names the part', async () => {
    // The fastened mate seats the valve on the base; its outlet ends up at [20, 20, 30].
    const r = await run(`
const asm = assembly('rig');
const base = asm.part('base', box(40, 40, 10), { at: [0, 0, 0] })
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [20, 20, 10] } });
const valve = asm.part('valve', box(20, 20, 20), { at: [0, 0, 0] })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 0] } });
asm.mate('seat-on-mount', 'valve.seat', 'base.mount', 'fastened');
tubeSpec({});
const t = tube('oil-1', { from: { point: [20, 20, 30], axis: [0, 0, 1], part: 'valve' }, to: { point: [20, 20, 130] }, od: 6, wall: 0.7, bendRadius: 18 });
asm.part('oil-1', t);
return asm.solvedModel({});`);
    expect(r.diagnostics).toEqual([]);
    expect(r.lines[0].minClearance).toMatchObject({ to: 'valve', mm: expect.closeTo(15, 6) });
  });

  it('a named part with no assembly at all is reported', async () => {
    const r = await run(`
tubeSpec({});
return tube('solo', { from: { point: [0, 0, 0], part: 'pump' }, to: { point: [0, 0, 100] }, od: 10, wall: 1, bendRadius: 30 });`);
    expect(codes(r)).toEqual(['tube.end.part-not-found']);
    expect(r.diagnostics[0].message).toBe(
      "tube.end.part-not-found: tube 'solo' from end names part 'pump', but the script returns no assembly.");
  });
});

describe('tube gates: port positions', () => {
  it('a tube end that no longer sits on its port is reported', async () => {
    // The fastened mate seats the valve on the base: it ends up 10 mm along x, y and z from its `at`.
    const r = await run(`
const asm = assembly('rig');
const base = asm.part('base', box(40, 40, 10), { at: [0, 0, 0] })
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [20, 20, 10] } });
const valve = asm.part('valve', box(20, 20, 20), { at: [0, 0, 0] })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 0] } })
  .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 20] }, axis: [0, 0, 1], port: { system: 'oil', od: 6 } });
asm.mate('seat-on-mount', 'valve.seat', 'base.mount', 'fastened');
tubeSpec({});
const t = tube('oil-1', { from: valve.port('out'), to: { point: [10, 10, 120] }, wall: 0.7, bendRadius: 18 });
asm.part('oil-1', t);
return asm.solvedModel({});`);
    expect(messages(r, 'tube.port.misaligned')).toEqual([
      "tube.port.misaligned: tube 'oil-1' from end is 17.32 mm from port 'valve.out'; the port is at [20.00, 20.00, 30.00]."]);
    expect(r.diagnostics.find((d) => d.code === 'tube.port.misaligned')!.message).toMatch(/tube 'oil-1' .* port 'valve\.out'/);
  });

  it('a tube routed to where the mate puts the port passes', async () => {
    const r = await run(`
const asm = assembly('rig');
const base = asm.part('base', box(40, 40, 10), { at: [0, 0, 0] })
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [20, 20, 10] } });
const valve = asm.part('valve', box(20, 20, 20), { at: [10, 10, 10] })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 0] } })
  .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 20] }, axis: [0, 0, 1], port: { system: 'oil', od: 6 } });
tubeSpec({});
const t = tube('oil-1', { from: valve.port('out'), to: { point: [20, 20, 130] }, wall: 0.7, bendRadius: 18 });
asm.part('oil-1', t);
return asm.model();`);
    expect(r.diagnostics).toEqual([]);
    expect(r.lines[0].minClearance).toMatchObject({ to: 'valve', mm: expect.closeTo(15, 6) });
  });

  it('a port whose part turned under a mate is off its axis', async () => {
    // The hinge runs through the port, so the port stays put and only its axis swings.
    const src = (deg: number) => `
const asm = assembly('rig');
const base = asm.part('base', box(4, 4, 4).translate(-40, 0, 0))
  .connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 20] }, axis: [1, 0, 0] });
const valve = asm.part('valve', box(20, 20, 20))
  .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 20] }, axis: [1, 0, 0] })
  .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 20] }, axis: [0, 0, 1], port: { system: 'oil', od: 6 } });
asm.mate('hinge', 'base.pivot', 'valve.hinge', 'revolute');
tubeSpec({});
const t = tube('oil-1', { from: valve.port('out'), to: { point: [10, 10, 120] }, wall: 0.7, bendRadius: 18 });
asm.part('oil-1', t);
return asm.solvedModel({ hinge: ${deg} });`;
    expect(messages(await run(src(0)), 'tube.port.misaligned')).toEqual([]);
    expect(messages(await run(src(30)), 'tube.port.misaligned')).toEqual([
      "tube.port.misaligned: tube 'oil-1' leaves port 'valve.out' 30.00 deg off the port axis; the part turned."]);
  });

  it('a tube part moved in the assembly is off its ends and is measured where it is', async () => {
    const r = await run(HEAD + `
tubeSpec({});
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 20, 200] }, wall: 1, bendRadius: 30 });
asm.part('fuel-1', t, { at: [122, 0, 0] });
return asm.model();`);
    expect(messages(r, 'tube.port.misaligned')).toEqual([
      "tube.port.misaligned: tube 'fuel-1' from end is 122.00 mm from port 'block.p1'; the port is at [20.00, 20.00, 40.00].",
      "tube.port.misaligned: tube 'fuel-1' to end is 122.00 mm from its captured point [20.00, 20.00, 200.00]; the tube was moved after it was routed.",
    ]);
    expect(messages(r, 'tube.clearance.violated')).toEqual([
      expect.stringContaining("tube 'fuel-1' is 3.00 mm from 'wall'; the rule needs 6.00 mm.")]);
  });

  it('a tube translated after routing is treated the same way', async () => {
    const r = await run(HEAD + `
tubeSpec({});
const t = tube('fuel-1', { from: block.port('p1'), to: { point: [20, 20, 200] }, wall: 1, bendRadius: 30 });
asm.part('fuel-1', t.translate(0, 0, 5));
return asm.model();`);
    expect(messages(r, 'tube.port.misaligned')[0])
      .toBe("tube.port.misaligned: tube 'fuel-1' from end is 5.00 mm from port 'block.p1'; the port is at [20.00, 20.00, 40.00].");
  });
});

describe('tube gates: per-system rules', () => {
  /** A 114.3 mm hot-gas duct bent at 1.5 x OD and a 6.35 mm fuel line bent at 1.5 x OD, 400 mm apart. */
  const twoSizes = (specArgs: string) => `
const asm = assembly('rig');
tubeSpec(${specArgs});
const duct = tube('duct', { from: { point: [0, 0, 0], axis: [1, 0, 0] }, to: { point: [600, 600, 0], axis: [0, -1, 0] },
  via: [[600, 0, 0]], od: 114.3, wall: 1.6, bendRadius: 171.45, system: 'hot-gas' });
const sense = tube('sense', { from: { point: [0, 0, 400], axis: [1, 0, 0] }, to: { point: [100, 100, 400], axis: [0, -1, 0] },
  via: [[100, 0, 400]], od: 6.35, wall: 0.71, bendRadius: 9.525, system: 'fuel' });
asm.part('duct', duct); asm.part('sense', sense);
return asm.model();`;

  it('one factor cannot fit both sizes; a hot-gas override passes the duct and still fails the small line', async () => {
    const strict = await run(twoSizes('{}'));
    expect(messages(strict, 'tube.bend.radius-too-small')).toEqual([
      "tube.bend.radius-too-small: tube 'duct' bends at 171.45 mm; the rule needs 342.90 mm (3 x OD 114.30).",
      "tube.bend.radius-too-small: tube 'sense' bends at 9.53 mm; the rule needs 19.05 mm (3 x OD 6.35)."]);
    const loose = await run(twoSizes('{ minBendRadiusFactor: 1.5 }'));
    expect(loose.diagnostics).toEqual([]);   // the small line is let through with the duct
    const bySystem = await run(twoSizes("{ systems: { 'hot-gas': { minBendRadiusFactor: 1.5 } } }"));
    expect(bySystem.diagnostics.map((d) => d.message)).toEqual([
      "tube.bend.radius-too-small: tube 'sense' bends at 9.53 mm; the rule needs 19.05 mm (3 x OD 6.35)."]);
  }, 120_000);

  it('a param in an override is read at its current value', async () => {
    const src = (k: number) => twoSizes(`{ systems: { 'hot-gas': { minBendRadiusFactor: param('K', ${k}) } } }`);
    expect(messages(await run(src(1.5)), 'tube.bend.radius-too-small')).toEqual([
      expect.stringContaining("tube 'sense'")]);
    expect(messages(await run(src(2)), 'tube.bend.radius-too-small')).toEqual([
      "tube.bend.radius-too-small: tube 'duct' bends at 171.45 mm; the rule needs 228.60 mm (2 x OD 114.30, system 'hot-gas').",
      expect.stringContaining("tube 'sense'")]);
  }, 120_000);

  it('a systems entry no tube uses warns and names the systems present', async () => {
    const r = await run(twoSizes("{ minBendRadiusFactor: 1.5, systems: { 'hot-gass': { minBendRadiusFactor: 1 }, fuel: {} } }"));
    expect(r.diagnostics.map((d) => [d.severity, d.message])).toEqual([['warn',
      "tube.spec.system-unused: the tubeSpec rules for system 'hot-gass' apply to no tubes: no tube has system 'hot-gass'. " +
      "Systems in this script: 'fuel', 'hot-gas'."]]);
    expect(r.diagnostics[0].nextAction).toEqual(DIAGNOSTIC_REGISTRY['tube.spec.system-unused'].nextAction);
  }, 120_000);

  it('the end-straight override sets the fitting zone left out of clearance', async () => {
    // The block carries a tower beside its port: 3 mm from the tube surface, up to 18 mm above the port face.
    const src = (specArgs: string) => `
const asm = assembly('rig');
const block = asm.part('block', box(40, 40, 40).union(box(12, 40, 18).translate(28, 0, 40)), { at: [0, 0, 0] })
  .connector('p1', { type: 'axis', origin: { kind: 'vec3', value: [20, 20, 40] }, axis: [0, 0, 1], port: { system: 'fuel', od: 10 } });
tubeSpec(${specArgs});
const a = tube('a', { from: block.port('p1'), to: { point: [20, 20, 240] }, wall: 1, bendRadius: 30 });
asm.part('a', a);
return asm.model();`;
    // 2.5 x OD: the first 25 mm is the fitting zone, which clears the tower top by 7 mm.
    const wide = await run(src('{}'));
    expect(errors(wide)).toEqual([]);
    expect(wide.lines[0].minClearance).toMatchObject({ to: 'block', mm: expect.closeTo(Math.hypot(3, 7), 6) });
    // 1 x OD for fuel: the zone is 10 mm, so the tube beside the tower is measured.
    const narrow = await run(src('{ systems: { fuel: { minStraightAtEnd: 1 } } }'));
    expect(messages(narrow, 'tube.clearance.violated')).toEqual([
      expect.stringContaining("tube 'a' is 3.00 mm from 'block'; the rule needs 6.00 mm.")]);
    // And the other way: a short top-level rule, lengthened for fuel.
    const back = await run(src('{ minStraightAtEnd: 1, systems: { fuel: { minStraightAtEnd: 2.5 } } }'));
    expect(errors(back)).toEqual([]);
    // An override for another system changes nothing for this tube.
    const other = await run(src('{ minStraightAtEnd: 1, systems: { oil: { minStraightAtEnd: 2.5 } } }'));
    expect(messages(other, 'tube.clearance.violated')).toHaveLength(1);
  }, 180_000);
});
