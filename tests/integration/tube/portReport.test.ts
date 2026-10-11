// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The port report: where every fluid port of the built assembly is, in
// assembly space with params and mates resolved, and which tubes end on it.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import { buildModel } from '../../../src/modeling/buildModel';
import { portReportOnModel, type PortReportEntry } from '../../../src/modeling/runtime/tube/portReport';
import { tubeSceneContext } from '../../../src/modeling/runtime/tube/tubeScene';
import { transformScenePart } from '../../../src/modeling/runtime/dfm/clearance';
import { TOOL_OUTPUT_SCHEMAS } from '../../../src/agent/mcp/toolOutputSchemas';

beforeAll(async () => { await initOcct(); }, 120_000);

async function ports(code: string): Promise<PortReportEntry[] | undefined> {
  return (await evaluateAndBuildScript({ code })).portReport;
}

/** A pump placed by a param, with two fuel ports and one oil port; one fuel line. */
const pumpRig = (x: number, rest = '') => `
const X = param('X', ${x});
const asm = assembly('rig');
const pump = asm.part('pump', box(40, 40, 40), { at: [X, -130, -240] })
  .connector('out-a', { type: 'axis', origin: { kind: 'vec3', value: [20, 20, 40] }, axis: [0, 0, 2], port: { system: 'fuel', od: 12.7, minStraight: 20 } })
  .connector('out-b', { type: 'axis', origin: { kind: 'vec3', value: [40, 20, 20] }, axis: [1, 0, 0], port: { system: 'fuel', od: 12.7 } })
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [20, 20, 0] } });
const tank = asm.part('tank', box(30, 30, 30), { at: [0, 200, 0] })
  .connector('drain', { type: 'axis', origin: { kind: 'vec3', value: [15, 0, 15] }, axis: [0, -1, 0], port: { system: 'oil', od: 6 } });
tubeSpec({});
${rest}
return asm.model();`;

const FUEL_A = `
const a = tube('fuel-a', { from: pump.port('out-a'), to: { point: [X.add(20), -110, 0] }, wall: 0.9, bendRadius: 40 });
asm.part('fuel-a', a);`;

describe('port report', () => {
  it('lists every port of the assembly with its resolved position, and no plain connector', async () => {
    expect(await ports(pumpRig(60, FUEL_A))).toEqual([
      { part: 'pump', name: 'out-a', system: 'fuel', od: 12.7, minStraight: 20,
        origin: [80, -110, -200], axis: [0, 0, 1], placedBy: 'at', usedBy: ['fuel-a'] },
      { part: 'pump', name: 'out-b', system: 'fuel', od: 12.7,
        origin: [100, -110, -220], axis: [1, 0, 0], placedBy: 'at', usedBy: [] },
      { part: 'tank', name: 'drain', system: 'oil', od: 6,
        origin: [15, 200, 15], axis: [0, -1, 0], placedBy: 'at', usedBy: [] },
    ]);
  }, 120_000);

  it('a param change moves the port', async () => {
    const moved = await ports(pumpRig(85, FUEL_A));
    expect(moved!.map((p) => p.origin)).toEqual([[105, -110, -200], [125, -110, -220], [15, 200, 15]]);
  }, 120_000);

  it('ports are reported when the script has no tubes', async () => {
    const r = await evaluateAndBuildScript({ code: pumpRig(60) });
    expect(r.tubeReport).toBeUndefined();
    expect(r.portReport!.map((p) => [p.part, p.name, p.usedBy])).toEqual([
      ['pump', 'out-a', []], ['pump', 'out-b', []], ['tank', 'drain', []]]);
    expect(r.portReport![0].origin).toEqual([80, -110, -200]);
  }, 120_000);

  it('an assembly with no ports reports an empty list; a script with no assembly reports nothing', async () => {
    expect(await ports("const asm = assembly('a'); asm.part('b', box(10, 10, 10)); return asm.model();")).toEqual([]);
    expect(await ports('return box(10, 10, 10);')).toBeUndefined();
  }, 120_000);

  /** The fastened mate seats the valve on the base: 10 mm along x, y and z from its `at`. */
  const mated = (tubeLines: string) => `
const asm = assembly('rig');
const base = asm.part('base', box(40, 40, 10), { at: [0, 0, 0] })
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [20, 20, 10] } })
  .connector('vent', { type: 'axis', origin: { kind: 'vec3', value: [0, 20, 5] }, axis: [-1, 0, 0], port: { system: 'oil', od: 6 } });
const valve = asm.part('valve', box(20, 20, 20), { at: [0, 0, 0] })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 0] } })
  .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 20] }, axis: [0, 0, 1], port: { system: 'oil', od: 6 } });
asm.mate('seat-on-mount', 'valve.seat', 'base.mount', 'fastened');
tubeSpec({});
${tubeLines}
return asm.solvedModel({});`;

  it('a part moved by a mate reports the solved position and says so', async () => {
    const r = await ports(mated(''));
    expect(r).toEqual([
      { part: 'base', name: 'vent', system: 'oil', od: 6, origin: [0, 20, 5], axis: [-1, 0, 0], placedBy: 'at', usedBy: [] },
      { part: 'valve', name: 'out', system: 'oil', od: 6, origin: [20, 20, 30], axis: [0, 0, 1], placedBy: 'mate', usedBy: [] },
    ]);
  }, 120_000);

  /** As `mated`, with the valve's own `at` and seat origin given. The solver works in the parts' own frames
   *  (seat onto mount) and its transform is applied on top of `at`. */
  const matedAt = (at: string, seat = '[10, 10, 0]') => `
const S = param('S', 5);
const asm = assembly('rig');
const base = asm.part('base', box(40, 40, 10), { at: [0, 0, 0] })
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [20, 20, 10] } });
const valve = asm.part('valve', box(20, 20, 20), { at: ${at} })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: ${seat} } })
  .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 20] }, axis: [0, 0, 1], port: { system: 'oil', od: 6 } });
asm.mate('seat-on-mount', 'valve.seat', 'base.mount', 'fastened');
return asm.solvedModel({});`;
  const out = { part: 'valve', name: 'out', system: 'oil', od: 6, axis: [0, 0, 1], usedBy: [] };

  it('a part that is both placed and mated reports at plus the mate offset, the solved position', async () => {
    // The mate offset is [10, 10, 10] (seat [10, 10, 0] onto mount [20, 20, 10]); the port is at at + [10, 10, 20] + offset.
    expect(await ports(matedAt('[3, -40, 7]'))).toEqual([{ ...out, origin: [23, -20, 37], placedBy: 'mate' }]);
    // The same with at driven by a param: S = 5.
    expect(await ports(matedAt('[S, S.multiply(2), 0]'))).toEqual([{ ...out, origin: [25, 30, 30], placedBy: 'mate' }]);
  }, 120_000);

  it('a mate whose solved transform is the identity reports placedBy at', async () => {
    // Seat and mount share one origin, so the fastened mate moves nothing: the part is where at puts it.
    expect(await ports(matedAt('[3, -40, 7]', '[20, 20, 10]'))).toEqual([{ ...out, origin: [13, -30, 27], placedBy: 'at' }]);
    expect(await ports(matedAt('[S.multiply(2), 10, 10]', '[20, 20, 10]'))).toEqual([{ ...out, origin: [20, 20, 30], placedBy: 'at' }]);
  }, 120_000);

  it('a plain end at a port position is not credited when it names another part', async () => {
    const r = await ports(mated(`
const other = tube('other', { from: { point: [20, 20, 30], axis: [0, 0, 1], part: 'base' }, to: { point: [20, 20, 130] }, od: 6, wall: 0.7, bendRadius: 18 });
asm.part('other', other);
const free = tube('free', { from: { point: [0, 20, 5], axis: [-1, 0, 0] }, to: { point: [-100, 20, 5] }, od: 6, wall: 0.7, bendRadius: 18 });
asm.part('free', free);`));
    // 'other' sits on valve.out but says it belongs to base; 'free' names no part and sits on base.vent.
    expect(r!.map((p) => [p.part, p.name, p.usedBy])).toEqual([['base', 'vent', ['free']], ['valve', 'out', []]]);
  }, 120_000);

  it('a part turned by a mate reports the turned axis', async () => {
    const r = await ports(`
const asm = assembly('rig');
const base = asm.part('base', box(4, 4, 4).translate(-40, 0, 0))
  .connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 20] }, axis: [1, 0, 0] });
const valve = asm.part('valve', box(20, 20, 20))
  .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 20] }, axis: [1, 0, 0] })
  .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [10, 10, 20] }, axis: [0, 0, 1], port: { system: 'oil', od: 6 } });
asm.mate('hinge', 'base.pivot', 'valve.hinge', 'revolute');
return asm.solvedModel({ hinge: 90 });`);
    expect(r).toHaveLength(1);
    expect(r![0]).toMatchObject({ part: 'valve', name: 'out', origin: [10, 10, 20], placedBy: 'mate' });
    expect(Math.abs(r![0].axis![2])).toBeLessThan(1e-6);
    expect(Math.abs(r![0].axis![1])).toBeCloseTo(1, 6);
  }, 120_000);

  it('usedBy counts a port end and a plain end routed to the solved port, not a tube that misses it', async () => {
    const r = await ports(mated(`
// A plain end at the solved position of valve.out, as the skill tells a mated part to be routed.
const hit = tube('hit', { from: { point: [20, 20, 30], axis: [0, 0, 1], part: 'valve' }, to: { point: [20, 20, 130] }, od: 6, wall: 0.7, bendRadius: 18 });
asm.part('hit', hit);
const vent = tube('vent-1', { from: base.port('vent'), to: { point: [-100, 20, 5] }, wall: 0.7, bendRadius: 18 });
asm.part('vent-1', vent);
const miss = tube('miss', { from: { point: [200, 200, 30] }, to: { point: [200, 200, 130] }, od: 6, wall: 0.7, bendRadius: 18 });
asm.part('miss', miss);`));
    expect(r!.map((p) => [p.part, p.name, p.usedBy])).toEqual([['base', 'vent', ['vent-1']], ['valve', 'out', ['hit']]]);
  }, 120_000);

  it('two tubes on one port are both listed', async () => {
    const r = await ports(pumpRig(60, FUEL_A + `
const b = tube('fuel-a2', { from: pump.port('out-a'), to: { point: [X.add(20), -110, 100] }, wall: 0.9, bendRadius: 40 });
asm.part('fuel-a2', b);`));
    expect(r![0].usedBy).toEqual(['fuel-a', 'fuel-a2']);
  }, 120_000);

  it('a port with no fixed position is listed with the reason and no position', async () => {
    const r = await ports(`
const asm = assembly('rig');
const block = asm.part('block', box(40, 40, 40), { at: [0, 0, 0] })
  .connector('top', { type: 'axis', origin: '@kc[block/face/top]', axis: [0, 0, 1], port: { system: 'fuel', od: 10 } })
  .connector('side', { type: 'axis', origin: { kind: 'vec3', value: [40, 20, 20] }, axis: [1, 0, 0], port: { system: 'fuel', od: 10 } });
return asm.model();`);
    expect(r).toEqual([
      { part: 'block', name: 'top', system: 'fuel', od: 10, usedBy: [],
        unresolved: 'the connector origin is a face, edge or vertex reference, not a fixed point' },
      { part: 'block', name: 'side', system: 'fuel', od: 10, origin: [40, 20, 20], axis: [1, 0, 0], placedBy: 'at', usedBy: [] },
    ]);
  }, 120_000);

  it('a stored origin that is not numeric is listed as unresolved, not at a made-up position', async () => {
    // Capture refuses this; the report must still not invent a position if such a connector reaches it.
    const model = await buildModel({ fileName: 'ports.kcad.ts', code: `
const asm = assembly('rig');
asm.part('block', box(40, 40, 40), { at: [0, 0, 0] })
  .connector('side', { type: 'axis', origin: { kind: 'vec3', value: [40, 20, 20] }, axis: [1, 0, 0], port: { system: 'fuel', od: 10 } });
return asm.model();` });
    const parts = (Array.from(model.session.assemblies.values())[0] as { __parts(): Array<{ mateConnectors: Array<{ origin: { value: unknown[] } }> }> }).__parts();
    parts[0].mateConnectors[0].origin.value = [Number.NaN, 20, 20];
    expect(portReportOnModel(model)).toEqual([{ part: 'block', name: 'side', system: 'fuel', od: 10, usedBy: [],
      unresolved: 'the connector origin is not three finite numbers' }]);
  }, 120_000);

  it('a port of an assembly the script does not return is listed with the reason', async () => {
    const r = await ports(`
const asm = assembly('rig');
asm.part('block', box(40, 40, 40), { at: [0, 0, 0] })
  .connector('side', { type: 'axis', origin: { kind: 'vec3', value: [40, 20, 20] }, axis: [1, 0, 0], port: { system: 'fuel', od: 10 } });
return box(10, 10, 10);`);
    expect(r).toEqual([{ part: 'block', name: 'side', system: 'fuel', od: 10, usedBy: [],
      unresolved: 'no built assembly: the build failed, or the script does not return this assembly' }]);
  }, 120_000);
});

/** Bounding box of an assembly part's own built shape (it carries the part's `at`). */
type Box = { min: number[]; max: number[] };
async function builtParts(code: string): Promise<{ report: PortReportEntry[]; box: (part: string) => Box }> {
  const model = await buildModel({ fileName: 'ports.kcad.ts', code });
  const parts = (Array.from(model.session.assemblies.values()) as Array<{ __parts(): Array<{ name: string; id: string }> }>)
    .flatMap((a) => a.__parts());
  const box = (part: string): Box =>
    (model.shapes.get(parts.find((p) => p.name === part)!.id as never) as unknown as { boundingBox(): Box }).boundingBox();
  return { report: portReportOnModel(model)!, box };
}

/** A port on top of a box, in the middle: [w / 2, w / 2, w] in the part's frame. */
const topPort = (w: number, system = 'oil') =>
  `.connector('out', { type: 'axis', origin: { kind: 'vec3', value: [${w / 2}, ${w / 2}, ${w}] }, axis: [0, 0, 1], port: { system: '${system}', od: 6 } })`;
/** The top-face centre of a built box: where `topPort` must be reported. */
const topOf = (b: Box): number[] => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, b.max[2]];
/** A shape that fails to build: no edge of the box can take the fillet. */
const BROKEN = 'box(20, 20, 20).fillet(500)';

describe('port report when a part fails to build', () => {
  const threeParts = (end: string) => `
const X = param('X', 35);
const asm = assembly('rig');
const a = asm.part('a', box(20, 20, 20), { at: [X, 5, -10] })${topPort(20)};
const bad = asm.part('bad', ${BROKEN}, { at: [100, 0, 0] })${topPort(20)};
const c = asm.part('c', box(30, 30, 30), { at: [200, X.multiply(2), 0] })${topPort(30, 'fuel')};
${end}`;

  it('resolves the ports of the good parts and names the failed part', async () => {
    const { report, box } = await builtParts(threeParts('return asm.model();'));
    expect(report).toEqual([
      { part: 'a', name: 'out', system: 'oil', od: 6, origin: [45, 15, 10], axis: [0, 0, 1], placedBy: 'at', usedBy: [] },
      { part: 'bad', name: 'out', system: 'oil', od: 6, usedBy: [], unresolved: "part 'bad' failed to build" },
      { part: 'c', name: 'out', system: 'fuel', od: 6, origin: [215, 85, 30], axis: [0, 0, 1], placedBy: 'at', usedBy: [] },
    ]);
    // The numbers above are the built shapes', not only the report's own arithmetic.
    expect(report[0].origin).toEqual(topOf(box('a')));
    expect(report[2].origin).toEqual(topOf(box('c')));
  }, 120_000);

  it('does the same through evaluate, where the build is a failure', async () => {
    const r = await evaluateAndBuildScript({ code: threeParts('return asm.solvedModel({});') });
    expect(r.evaluation.exitCode).toBe(1);
    expect(r.portReport!.map((p) => [p.part, p.origin ?? p.unresolved])).toEqual([
      ['a', [45, 15, 10]], ['bad', "part 'bad' failed to build"], ['c', [215, 85, 30]]]);
  }, 120_000);

  it('a tube on a good port is still listed in usedBy', async () => {
    const { report } = await builtParts(threeParts(`
tubeSpec({});
asm.part('line', tube('line', { from: a.port('out'), to: { point: [X.add(10), 15, 200] }, wall: 0.7, bendRadius: 18 }));
return asm.model();`));
    expect(report.map((p) => [p.part, p.usedBy])).toEqual([['a', ['line']], ['bad', []], ['c', []]]);
    expect(report[0].origin).toEqual([45, 15, 10]);
  }, 120_000);

  it('a part a mate positions, or one placed with connect, stays unresolved: the solve did not run', async () => {
    const { report } = await builtParts(`
const asm = assembly('rig');
const base = asm.part('base', box(40, 40, 10), { at: [0, 0, 0], connectors: { pad: { origin: [5, 5, 10], axis: [0, 0, 1] } } })
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [20, 20, 10] } })${topPort(10)};
const valve = asm.part('valve', box(20, 20, 20), { at: [0, 0, 0] })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 0] } })${topPort(20)};
asm.part('cap', box(10, 10, 10), { connectors: { foot: { origin: [5, 5, 0], axis: [0, 0, 1] } }, connect: { connector: 'foot', to: base.connector('pad') } })${topPort(10)};
asm.part('free', box(20, 20, 20), { at: [300, 0, 0] })${topPort(20)};
asm.part('bad', ${BROKEN}, { at: [100, 0, 0] })${topPort(20)};
asm.mate('seat-on-mount', 'valve.seat', 'base.mount', 'fastened');
return asm.solvedModel({});`);
    const notSolved = "the assembly was not built (part 'bad' failed to build), so the solve did not run";
    expect(report.map((p) => [p.part, p.origin ?? p.unresolved])).toEqual([
      ['base', `${notSolved}; part 'base' is positioned by a mate`],
      ['valve', `${notSolved}; part 'valve' is positioned by a mate`],
      ['cap', `${notSolved}; part 'cap' is placed with connect`],
      ['free', [310, 10, 20]],
      ['bad', "part 'bad' failed to build"],
    ]);
    expect(report.every((p) => (p.origin === undefined) === (p.placedBy === undefined))).toBe(true);
  }, 120_000);

  it('an assembly the script never builds keeps the old reason, failed part or not', async () => {
    const { report } = await builtParts(`
const asm = assembly('rig');
asm.part('a', box(20, 20, 20), { at: [0, 0, 0] })${topPort(20)};
return box(10, 10, 10);`);
    expect(report.map((p) => p.unresolved)).toEqual(['no built assembly: the build failed, or the script does not return this assembly']);
  }, 120_000);
});

/** The report next to the built scene: `box(part)` is the part's bounding box where the scene puts it. */
async function builtScene(code: string): Promise<{ report: PortReportEntry[]; box: (part: string) => Box; errors: string[] }> {
  const model = await buildModel({ fileName: 'ports.kcad.ts', code });
  const scene = tubeSceneContext(model).scene!;
  const box = (part: string): Box => transformScenePart(scene.parts.find((p) => p.name === part)!, []).bbox as Box;
  const built = await evaluateAndBuildScript({ code });
  const errors = built.evaluation.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message);
  return { report: portReportOnModel(model)!, box, errors };
}

describe('ports on a part placed with connect', () => {
  /** A cap seated on the body's pad with `connect`, with a port on top of the cap. */
  const capOnBody = (rest: string, x = 50) => `
const X = param('X', ${x});
const asm = assembly('rig');
const body = asm.part('body', box(40, 40, 40), { at: [X, -30, 5], connectors: { pad: { origin: [25, 15, 40], axis: [0, 0, 1] } } });
const cap = asm.part('cap', box(20, 20, 20), { connectors: { foot: { origin: [10, 10, 0], axis: [0, 0, 1] } }, connect: { connector: 'foot', to: body.connector('pad') } })${topPort(20)};
tubeSpec({});
${rest}`;
  const LINE = `
asm.part('line', tube('line', { from: cap.port('out'), to: { point: [X.add(25), -15, 200] }, wall: 0.7, bendRadius: 18 }));`;

  it('reports the port where the built scene has the part, placedBy connect', async () => {
    const { report, box } = await builtScene(capOnBody('return asm.model();'));
    // The cap's foot [10, 10, 0] sits on the pad at [50 + 25, -30 + 15, 5 + 40]; the port is 20 above the foot.
    expect(report).toEqual([{ part: 'cap', name: 'out', system: 'oil', od: 6,
      origin: [75, -15, 65], axis: [0, 0, 1], placedBy: 'connect', usedBy: [] }]);
    expect(report[0].origin).toEqual(topOf(box('cap')));
    expect(box('cap').min[2]).toBe(box('body').max[2]);
  }, 120_000);

  it('a param on the parent moves the port, and the scene agrees', async () => {
    const { report, box } = await builtScene(capOnBody('return asm.model();', 130));
    expect(report[0]).toMatchObject({ origin: [155, -15, 65], placedBy: 'connect' });
    expect(report[0].origin).toEqual(topOf(box('cap')));
  }, 120_000);

  it('reports what the scene has when a mate moves the parent', async () => {
    const { report, box } = await builtScene(`
const asm = assembly('rig');
const base = asm.part('base', box(100, 100, 10), { at: [0, 0, 0] })
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [70, 60, 10] } });
const body = asm.part('body', box(40, 40, 40), { at: [0, 0, 0], connectors: { pad: { origin: [20, 20, 40], axis: [0, 0, 1] } } })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [20, 20, 0] } })${topPort(40)};
asm.part('cap', box(20, 20, 20), { connectors: { foot: { origin: [10, 10, 0], axis: [0, 0, 1] } }, connect: { connector: 'foot', to: body.connector('pad') } })${topPort(20)};
asm.mate('seat-on-mount', 'body.seat', 'base.mount', 'fastened');
return asm.solvedModel({});`);
    expect(report.map((p) => [p.part, p.placedBy])).toEqual([['body', 'mate'], ['cap', 'connect']]);
    // Whatever the solve does with the pair, each port is on top of its own built part.
    expect(report[0].origin).toEqual(topOf(box('body')));
    expect(report[1].origin).toEqual(topOf(box('cap')));
    // Today the solve moves the body to the mount and leaves the cap where connect put it at capture.
    expect(report.map((p) => p.origin)).toEqual([[70, 60, 50], [20, 20, 60]]);
  }, 120_000);

  it('a mate on the connect part itself reports placedBy mate, at the solved position', async () => {
    const { report, box } = await builtScene(`
const asm = assembly('rig');
const base = asm.part('base', box(100, 100, 10), { at: [0, 0, 0], connectors: { pad: { origin: [10, 10, 10], axis: [0, 0, 1] } } })
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [70, 60, 10] } });
asm.part('cap', box(20, 20, 20), { connectors: { foot: { origin: [10, 10, 0], axis: [0, 0, 1] } }, connect: { connector: 'foot', to: base.connector('pad') } })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 0] } })${topPort(20)};
asm.mate('seat-on-mount', 'cap.seat', 'base.mount', 'fastened');
return asm.solvedModel({});`);
    expect(report).toHaveLength(1);
    expect(report[0].placedBy).toBe('mate');
    expect(report[0].origin).toEqual(topOf(box('cap')));
  }, 120_000);

  it('part.port() on the connect part ends a tube on the port: the gate passes and usedBy lists it', async () => {
    for (const x of [50, 130]) {
      const { report, box, errors } = await builtScene(capOnBody(`${LINE}\nreturn asm.model();`, x));
      expect(errors).toEqual([]);
      expect(report[0]).toMatchObject({ origin: [x + 25, -15, 65], placedBy: 'connect', usedBy: ['line'] });
      // The tube starts on top of the cap as built: its lowest point is the cap's top face, on the port.
      expect(box('line').min[2]).toBeCloseTo(box('cap').max[2], 6);
      expect((box('line').min[0] + box('line').max[0]) / 2).toBeCloseTo(report[0].origin![0], 6);
    }
  }, 120_000);

  it('a tube on a connect port that the solve moves away is reported, like any other port', async () => {
    const { report, errors } = await builtScene(`
const asm = assembly('rig');
const base = asm.part('base', box(100, 100, 10), { at: [0, 0, 0], connectors: { pad: { origin: [10, 10, 10], axis: [0, 0, 1] } } })
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [70, 60, 10] } });
const cap = asm.part('cap', box(20, 20, 20), { connectors: { foot: { origin: [10, 10, 0], axis: [0, 0, 1] } }, connect: { connector: 'foot', to: base.connector('pad') } })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 0] } })${topPort(20)};
asm.mate('seat-on-mount', 'cap.seat', 'base.mount', 'fastened');
tubeSpec({});
asm.part('line', tube('line', { from: cap.port('out'), to: { point: [10, 10, 200] }, wall: 0.7, bendRadius: 18 }));
return asm.solvedModel({});`);
    expect(report[0].placedBy).toBe('mate');
    expect(errors.filter((m) => m.startsWith('tube.port.misaligned'))).toEqual([
      expect.stringMatching(/^tube\.port\.misaligned: tube 'line' from end is \d+\.\d\d mm from port 'cap\.out'; the port is at \[/)]);
  }, 120_000);

  it('the output schema allows placedBy connect', () => {
    expect(TOOL_OUTPUT_SCHEMAS.evaluate_script.properties.ports.items.properties.placedBy.enum).toEqual(['at', 'connect', 'mate']);
  });
});
