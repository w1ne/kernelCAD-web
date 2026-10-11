// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The port report: where every fluid port of the built assembly is, in
// assembly space with params and mates resolved, and which tubes end on it.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import type { PortReportEntry } from '../../../src/modeling/runtime/tube/portReport';

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

  it('a connector origin that holds a param is listed as unresolved, not at a made-up position', async () => {
    const r = await ports(`
const X = param('X', 200);
const asm = assembly('rig');
asm.part('block', box(40, 40, 40), { at: [0, 0, 0] })
  .connector('side', { type: 'axis', origin: { kind: 'vec3', value: [X, 20, 20] }, axis: [1, 0, 0], port: { system: 'fuel', od: 10 } });
return asm.model();`);
    expect(r).toEqual([{ part: 'block', name: 'side', system: 'fuel', od: 10, usedBy: [],
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
