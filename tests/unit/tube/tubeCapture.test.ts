// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// tube() and tubeSpec() capture: validation, record shape, param refs.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import type { TubeMetadata } from '../../../src/shared/intent/tubeRecord';
import { tubeCornerPoints } from '../../../src/shared/intent/tubeRecord';
import type { V3 } from '../../../src/shared/tube/tubePath';

function makeApi() {
  const session = new CaptureSession();
  return { session, api: createModelingApi({ session }) };
}

function rig() {
  const { session, api } = makeApi();
  const asm = api.assembly('rig');
  const pump = asm.part('pump', api.box(40, 40, 40), { at: [0, 0, 0] })
    .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [20, 20, 40] }, axis: [0, 0, 1],
      port: { system: 'hydraulic', od: 9.525 } });
  const act = asm.part('act', api.box(40, 40, 40), { at: [200, 0, 100] })
    .connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 20, 20] }, axis: [-1, 0, 0],
      port: { system: 'hydraulic', od: 9.525 } });
  return { session, api, asm, pump, act };
}

const prefixRe = (p: string) => new RegExp(`^${p.replace(/\./g, '\\.')}:`);
const free = { wall: 1, bendRadius: 30, od: 10 };

describe('tube()', () => {
  it('captures a tube record with od from the ports and corner points from both ends', () => {
    const { session, api, pump, act } = rig();
    api.tube('hyd-p', { from: pump.port('out'), to: act.port('in'), via: [[20, 20, 120]], wall: 0.89, bendRadius: 28.6 });
    const rec = session.getRecords().find((r) => r.kind === 'tube')!;
    expect(rec.params.od.evaluated).toBe(9.525);
    const meta = (rec.metadata as unknown as { tube: TubeMetadata }).tube;
    expect(tubeCornerPoints(meta)).toEqual([[20, 20, 40], [20, 20, 120], [200, 20, 120]]);
    expect(meta.from).toMatchObject({ part: 'pump', connector: 'out', axis: [0, 0, 1], system: 'hydraulic' });
    expect(meta.system).toBe('hydraulic');
  });

  it('a ParamRef on the part position reaches the tube record', () => {
    const { session, api } = makeApi();
    const x = api.param('actX', 200);
    const act = api.assembly('rig').part('act', api.box(40, 40, 40), { at: [x, 0, 100] })
      .connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 20, 20] }, axis: [-1, 0, 0],
        port: { system: 'hydraulic', od: 9.525 } });
    api.tube('t', { from: { point: [20, 20, 120] }, to: act.port('in'), wall: 0.89, bendRadius: 28.6 });
    const rec = session.getRecords().find((r) => r.kind === 'tube')!;
    expect((rec.metadata as { paramRefs?: string[] }).paramRefs).toContain('actX');
  });

  it('a ParamRef on wall reaches params and paramRefs', () => {
    const { session, api } = makeApi();
    const w = api.param('wall', 1);
    api.tube('t', { from: { point: [0, 0, 0] }, to: { point: [0, 0, 50] }, od: 10, wall: w, bendRadius: 30 });
    const rec = session.getRecords().find((r) => r.kind === 'tube')!;
    expect((rec.metadata as { paramRefs?: string[] }).paramRefs).toContain('wall');
  });

  it.each([
    ['tube.port.od-mismatch', { od: 12.7 }],
    ['tube.wall.invalid', { wall: 5 }],
    ['tube.bend-radius.invalid', { bendRadius: 0 }],
    ['tube.flow.unknown-fluid', { flow: { lpm: 5, fluid: 'syrup' } }],
    ['tube.corner.unreachable', { via: [[20, 20, 45]] as V3[] }],
  ])('%s', (prefix, patch) => {
    const { api, pump, act } = rig();
    expect(() => api.tube('t', { from: pump.port('out'), to: act.port('in'), via: [[20, 20, 120]],
      wall: 0.89, bendRadius: 28.6, ...patch })).toThrowError(prefixRe(prefix));
  });

  it.each([
    ['tube.flow.invalid', { flow: { lpm: 0, fluid: 'water' } }],
    ['tube.flow.invalid', { flow: { lpm: -2, fluid: 'water' } }],
    ['tube.flow.invalid', { flow: { lpm: Number.NaN, fluid: 'water' } }],
    ['tube.flow.invalid', { flow: { lpm: Number.POSITIVE_INFINITY, fluid: 'water' } }],
    ['tube.flow.invalid', { flow: { lpm: '5', fluid: 'water' } }],
    ['tube.flow.invalid', { flow: 5 }],
    ['tube.flow.invalid', { flow: null }],
    ['tube.flow.invalid', { flow: ['water'] }],
    ['tube.density.invalid', { density: 0 }],
    ['tube.density.invalid', { density: -7800 }],
    ['tube.density.invalid', { density: Number.NaN }],
    ['tube.density.invalid', { density: Number.POSITIVE_INFINITY }],
    ['tube.density.invalid', { density: '7800' }],
  ])('%s for %j', (prefix, patch) => {
    const { api } = makeApi();
    expect(() => api.tube('t', { from: { point: [0, 0, 0] }, to: { point: [0, 0, 50] }, ...free, ...patch } as never))
      .toThrowError(prefixRe(prefix));
  });

  it('accepts a positive flow and density', () => {
    const { session, api } = makeApi();
    api.tube('t', { from: { point: [0, 0, 0] }, to: { point: [0, 0, 50] }, ...free, density: 7800, flow: { lpm: 0.5, fluid: 'water' } });
    const meta = (session.getRecords().find((r) => r.kind === 'tube')!.metadata as unknown as { tube: TubeMetadata }).tube;
    expect(meta).toMatchObject({ densityKgM3: 7800, flow: { lpm: 0.5, fluid: 'water' } });
  });

  it.each([
    [{ wall: 5 }, /^tube\.wall\.invalid: wall — got 5; requires a positive number below half the od \(4\.7625 mm\) \(mm\)\./],
    [{ od: 12.7 }, /^tube\.port\.od-mismatch: od — got 9\.525 vs 9\.525 vs 12\.7 mm across the tube od and its port sizes; requires one outer diameter/],
    [{ bendRadius: 0 }, /^tube\.bend-radius\.invalid: bendRadius — got 0; requires a positive finite number \(mm\)\./],
    [{ flow: { lpm: 5, fluid: 'syrup' } }, /^tube\.flow\.unknown-fluid: flow\.fluid — got "syrup"; requires one of water, jet-a, /],
    [{ flow: { lpm: -2, fluid: 'water' } }, /^tube\.flow\.invalid: flow\.lpm — got -2; requires a positive finite number \(L\/min\)\./],
    [{ density: -7800 }, /^tube\.density\.invalid: density — got -7800; requires a positive finite number \(kg\/m\^3\)\./],
    // Leg 0 is 5 mm long; the 67.38 degree bend needs a 28.6 x tan(33.69 deg) = 19.07 mm tangent on it.
    [{ via: [[20, 20, 45]] as V3[] }, /^tube\.corner\.unreachable: tube 't' leg 0 — got a leg 14\.07 mm too short for the bends at its ends; requires the leg at least 14\.07 mm longer/],
  ])('the message for %j carries the path, the value and the requirement', (patch, message) => {
    const { api, pump, act } = rig();
    expect(() => api.tube('t', { from: pump.port('out'), to: act.port('in'), via: [[20, 20, 120]],
      wall: 0.89, bendRadius: 28.6, ...patch } as never)).toThrowError(message);
  });

  it('keeps the recovery hint of a tube() error', () => {
    const { api, pump, act } = rig();
    let hint = '';
    try {
      api.tube('t', { from: pump.port('out'), to: act.port('in'), via: [[20, 20, 120]], wall: 5, bendRadius: 28.6 });
    } catch (e) { hint = (e as { hint: string }).hint; }
    expect(hint).toBe('Pick a wall thickness between 0 and od / 2, for example 0.89 for 9.525 mm tube.');
  });

  it('a duplicate name and a bad name say what is wrong with the name', () => {
    const { api } = makeApi();
    api.tube('t', { from: { point: [0, 0, 0] }, to: { point: [0, 0, 50] }, ...free });
    expect(() => api.tube('t', { from: { point: [9, 0, 0] }, to: { point: [9, 0, 50] }, ...free }))
      .toThrowError(/^tube\.name\.invalid: name — got 't', which another tube in this script already uses; requires a name no other tube\(\) has\./);
    expect(() => api.tube('a,b', { from: { point: [9, 0, 0] }, to: { point: [9, 0, 50] }, ...free }))
      .toThrowError(/^tube\.name\.invalid: name — got "a,b"; requires a name with no comma, double quote or line break\./);
  });

  it('rejects mismatched port ods between the two ends', () => {
    const { api, asm, pump } = rig();
    const other = asm.part('other', api.box(10, 10, 10), { at: [200, 0, 100] })
      .connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 5, 5] }, axis: [-1, 0, 0],
        port: { system: 'hydraulic', od: 6 } });
    expect(() => api.tube('t', { from: pump.port('out'), to: other.port('in'), via: [[20, 5, 120]],
      wall: 0.5, bendRadius: 20 })).toThrowError(prefixRe('tube.port.od-mismatch'));
  });

  it('rejects a duplicate tube name and a missing od', () => {
    const { api } = makeApi();
    api.tube('t', { from: { point: [0, 0, 0] }, to: { point: [0, 0, 50] }, ...free });
    expect(() => api.tube('t', { from: { point: [9, 0, 0] }, to: { point: [9, 0, 50] }, ...free }))
      .toThrowError(prefixRe('tube.name.invalid'));
    expect(() => api.tube('u', { from: { point: [0, 0, 0] }, to: { point: [0, 0, 50] }, wall: 1, bendRadius: 30 }))
      .toThrowError(prefixRe('tube.od.required'));
  });

  it.each([[''], ['a,b'], ['a"b'], ['a\nb'], ['a\rb']])('rejects the name %j', (name) => {
    const { api } = makeApi();
    expect(() => api.tube(name, { from: { point: [0, 0, 0] }, to: { point: [0, 0, 50] }, ...free }))
      .toThrowError(prefixRe('tube.name.invalid'));
  });

  it.each([
    ['tube.od.invalid', { od: Number.NaN }],
    ['tube.od.invalid', { od: Number.POSITIVE_INFINITY }],
    ['tube.od.invalid', { od: 0 }],
    ['tube.wall.invalid', { wall: Number.NaN }],
    ['tube.wall.invalid', { wall: Number.POSITIVE_INFINITY }],
    ['tube.wall.invalid', { wall: 0 }],
    ['tube.bend-radius.invalid', { bendRadius: Number.NaN }],
    ['tube.bend-radius.invalid', { bendRadius: Number.POSITIVE_INFINITY }],
  ])('%s for a non-finite or non-positive value %#', (prefix, patch) => {
    const { api } = makeApi();
    expect(() => api.tube('t', { from: { point: [0, 0, 0] }, to: { point: [0, 0, 50] }, ...free, ...patch }))
      .toThrowError(prefixRe(prefix));
  });

  it.each([
    ['zero', [0, 0, 0]],
    ['NaN', [0, Number.NaN, 1]],
    ['infinite', [Number.POSITIVE_INFINITY, 0, 1]],
  ])('tube.end.invalid for a %s point axis', (_label, axis) => {
    const { api } = makeApi();
    expect(() => api.tube('t', { from: { point: [0, 0, 0], axis: axis as V3 }, to: { point: [0, 0, 50] }, ...free }))
      .toThrowError(prefixRe('tube.end.invalid'));
  });

  // A corner the path maths cannot use must be refused, not dropped: a dropped
  // corner builds and reports the tube along another route with no diagnostic.
  it.each([
    ['a NaN coordinate', [50, Number.NaN, 0]],
    ['two coordinates', [50, 30]],
    ['an infinite coordinate', [Number.POSITIVE_INFINITY, 0, 50]],
  ])('tube.end.invalid for a via corner with %s', (_label, corner) => {
    const { api } = makeApi();
    expect(() => api.tube('t', { from: { point: [0, 0, 0] }, to: { point: [100, 0, 0] }, via: [corner as V3], ...free }))
      .toThrowError(/^tube\.end\.invalid: tube 't' corner points — got a non-finite coordinate \(NaN or Infinity\); requires finite \[x, y, z\] for the ends, the via corners and the part positions\./);
  });

  it.each([
    ['an empty string', ''],
    ['a number', 5],
    ['null', null],
  ])('tube.end.invalid for a point end whose part is %s', (_label, part) => {
    const { api } = makeApi();
    expect(() => api.tube('t', { from: { point: [0, 0, 0], part: part as unknown as string }, to: { point: [0, 0, 50] }, ...free }))
      .toThrowError(prefixRe('tube.end.invalid'));
  });

  it('carries the part a point end names into the record', () => {
    const { session, api } = makeApi();
    api.tube('t', { from: { point: [0, 0, 0], axis: [0, 0, 1], part: 'pump' }, to: { point: [0, 0, 50] }, ...free });
    const meta = (session.getRecords().find((r) => r.kind === 'tube')!.metadata as unknown as { tube: TubeMetadata }).tube;
    expect(meta.from).toEqual({ part: 'pump', axis: [0, 0, 1] });
    expect(meta.to).toEqual({});
  });

  it('normalises a point-end axis to a unit vector', () => {
    const { session, api } = makeApi();
    api.tube('t', { from: { point: [0, 0, 0], axis: [0, 0, 4] }, to: { point: [0, 0, 50] }, ...free });
    const meta = (session.getRecords().find((r) => r.kind === 'tube')!.metadata as unknown as { tube: TubeMetadata }).tube;
    expect(meta.from.axis).toEqual([0, 0, 1]);
  });
});

describe('tubeSpec()', () => {
  it('fills defaults, is virtual, and throws on a malformed rule', () => {
    const { api } = makeApi();
    const { metadata } = api.tubeSpec({ clearance: { pairs: [{ a: 'fuel', b: 'bleed', min: 25 }] } });
    expect(metadata).toEqual({ virtual: true, minBendRadiusFactor: 3, minStraightBetweenBends: 2,
      minStraightAtEnd: 2.5, maxBendAngle: 180, clearance: { default: 6, pairs: [{ a: 'fuel', b: 'bleed', min: 25 }] } });
    expect(() => api.tubeSpec({ maxBendAngle: 200 })).toThrowError(/tubeSpec/);
    expect(() => api.tubeSpec({ clearance: { default: -1 } })).toThrowError(/tubeSpec/);
  });

  it.each([
    [{ minBendRadiusFactor: 0 }],
    [{ minStraightBetweenBends: Number.NaN }],
    [{ minStraightAtEnd: Number.POSITIVE_INFINITY }],
    [{ maxBendAngle: 0 }],
    [{ clearance: { pairs: [{ a: '', b: 'x', min: 5 }] } }],
    [{ clearance: { pairs: [{ a: 'x', b: 'y', min: 0 }] } }],
    [{ clearance: { pairs: 'nope' } }],
    ['nope'],
    [null],
  ])('throws feature.invalid-args naming tubeSpec for %j', (spec) => {
    const { api } = makeApi();
    expect(() => api.tubeSpec(spec as never)).toThrowError(/^tubeSpec:/);
  });

  it.each([
    [{ minBendRadius: 3 },
      /^tubeSpec: minBendRadius — got a field tubeSpec does not have; requires one of minBendRadiusFactor, minStraightBetweenBends, minStraightAtEnd, maxBendAngle, clearance, systems\./],
    [{ maxBendAngle: 90, clearence: { default: 10 } },
      /^tubeSpec: clearence — got a field tubeSpec does not have; requires one of minBendRadiusFactor, /],
    [{ clearance: { defualt: 10 } },
      /^tubeSpec: clearance\.defualt — got a field tubeSpec does not have; requires one of clearance\.default, clearance\.pairs\./],
    [{ clearance: { default: 10, pair: [] } },
      /^tubeSpec: clearance\.pair — got a field tubeSpec does not have; requires one of clearance\.default, clearance\.pairs\./],
  ])('throws on the unknown key in %j', (spec, message) => {
    const { api } = makeApi();
    expect(() => api.tubeSpec(spec as never)).toThrowError(message);
  });

  it.each([
    [{ maxBendAngle: 200 }, /^tubeSpec: maxBendAngle — got 200; requires a number in \(0, 180\] degrees\./],
    [{ clearance: { default: -1 } }, /^tubeSpec: clearance\.default — got -1; requires a positive finite number\./],
    [{ clearance: { pairs: [{ a: 'x', b: 'y' }] } },
      /^tubeSpec: clearance\.pairs\[0\]\.min — got no min; requires a positive finite number \(the field is required\)\./],
    [{ clearance: { pairs: [{ a: '', b: 'x', min: 5 }] } },
      /^tubeSpec: clearance\.pairs\[0\] — got \{"a":"","b":"x","min":5\}; requires \{ a, b, min \} with two non-empty system names\./],
  ])('names the field, the value and the requirement for %j', (spec, message) => {
    const { api } = makeApi();
    expect(() => api.tubeSpec(spec as never)).toThrowError(message);
  });

  it('keeps the tube-spec hint slug with the field name', () => {
    const { api } = makeApi();
    let hint = '';
    try { api.tubeSpec({ maxBendAngle: 200 }); } catch (e) { hint = (e as { hint: string }).hint; }
    expect(hint).toBe('invalid-args.tube-spec.maxBendAngle — fix the field; tubeSpec is an enforcement gate, malformed declarations fail the build rather than silently disabling checks.');
  });

  it('a top-level rule or clearance number may be a param; a plain number is stored as the number it was', () => {
    const { api } = makeApi();
    const k = api.param('K', 4);
    const c = api.param('C', 8);
    const { metadata } = api.tubeSpec({
      minBendRadiusFactor: k, minStraightBetweenBends: k.divide(2), minStraightAtEnd: 2.5, maxBendAngle: api.param('A', 120),
      clearance: { default: c, pairs: [{ a: 'fuel', b: 'bleed', min: c.multiply(3) }, { a: 'fuel', b: 'oil', min: 12 }] },
    });
    expect(metadata.minBendRadiusFactor).toMatchObject({ paramRef: 'K', unit: 'unitless' });
    expect(metadata.minStraightBetweenBends).toMatchObject({ unit: 'unitless', paramRef: { kind: 'binop', op: '/' } });
    expect(metadata.minStraightAtEnd).toBe(2.5);
    expect(metadata.maxBendAngle).toMatchObject({ paramRef: 'A', unit: 'deg' });
    expect(metadata.clearance.default).toMatchObject({ paramRef: 'C', unit: 'mm' });
    expect(metadata.clearance.pairs[0]).toMatchObject({ a: 'fuel', b: 'bleed', min: { unit: 'mm', paramRef: { kind: 'binop', op: '*' } } });
    expect(metadata.clearance.pairs[1]).toEqual({ a: 'fuel', b: 'oil', min: 12 });
    // A rule left out is the default number, param or no param elsewhere in the spec.
    expect(api.tubeSpec({ minBendRadiusFactor: k }).metadata).toMatchObject({
      minStraightBetweenBends: 2, minStraightAtEnd: 2.5, maxBendAngle: 180, clearance: { default: 6, pairs: [] } });
  });

  it.each([
    ['minBendRadiusFactor', 0, (p: unknown) => ({ minBendRadiusFactor: p }),
      /^tubeSpec: minBendRadiusFactor — got 0; requires a positive finite number\./],
    ['minStraightBetweenBends', -2, (p: unknown) => ({ minStraightBetweenBends: p }),
      /^tubeSpec: minStraightBetweenBends — got -2; requires a positive finite number\./],
    ['minStraightAtEnd', 0, (p: unknown) => ({ minStraightAtEnd: p }),
      /^tubeSpec: minStraightAtEnd — got 0; requires a positive finite number\./],
    ['maxBendAngle', 200, (p: unknown) => ({ maxBendAngle: p }),
      /^tubeSpec: maxBendAngle — got 200; requires a number in \(0, 180\] degrees\./],
    ['clearance.default', -1, (p: unknown) => ({ clearance: { default: p } }),
      /^tubeSpec: clearance\.default — got -1; requires a positive finite number\./],
    ['clearance.pairs[0].min', 0, (p: unknown) => ({ clearance: { pairs: [{ a: 'x', b: 'y', min: p }] } }),
      /^tubeSpec: clearance\.pairs\[0\]\.min — got 0; requires a positive finite number\./],
  ])('a param in %s is checked at its current value (%d)', (_field, value, spec, message) => {
    const { api } = makeApi();
    expect(() => api.tubeSpec(spec(api.param('P', value)) as never)).toThrowError(message);
  });

  it.each([
    ['minBendRadiusFactor', (p: unknown) => ({ minBendRadiusFactor: p })],
    ['maxBendAngle', (p: unknown) => ({ maxBendAngle: p })],
    ['clearance.default', (p: unknown) => ({ clearance: { default: p } })],
    ['clearance.pairs[0].min', (p: unknown) => ({ clearance: { pairs: [{ a: 'x', b: 'y', min: p }] } })],
    ['systems.oil.minStraightAtEnd', (p: unknown) => ({ systems: { oil: { minStraightAtEnd: p } } })],
  ])('a param in %s that is not a number, or cannot be evaluated, fails as a tubeSpec argument error', (field, spec) => {
    const { api } = makeApi();
    const caught = (run: () => unknown): { code?: string; message: string } => {
      try { run(); } catch (e) { return e as { code?: string; message: string }; }
      throw new Error('did not throw');
    };
    const text = caught(() => api.tubeSpec(spec(api.param('S', 'steel')) as never));
    expect(text.code).toBe('feature.invalid-args');
    expect(text.message.startsWith(`tubeSpec: ${field} — got a param that cannot be read as a number (`), text.message).toBe(true);
    const zero = api.param('Z', 0);
    const divided = caught(() => api.tubeSpec(spec(api.param('N', 6).divide(zero)) as never));
    expect(divided.code).toBe('feature.invalid-args');
    expect(divided.message.startsWith(`tubeSpec: ${field} — got a param that cannot be read as a number (division by zero`), divided.message).toBe(true);
  });

  it('stores a systems entry as params and leaves it out when none is declared', () => {
    const { api } = makeApi();
    expect('systems' in api.tubeSpec({}).metadata).toBe(false);
    const { metadata } = api.tubeSpec({ systems: { 'hot-gas': { minBendRadiusFactor: 1.5, maxBendAngle: 120 }, idle: {} } });
    expect(metadata.minBendRadiusFactor).toBe(3);
    expect(metadata.systems).toEqual({
      'hot-gas': {
        minBendRadiusFactor: { expression: '1.5', unit: 'unitless', evaluated: 1.5 },
        maxBendAngle: { expression: '120', unit: 'deg', evaluated: 120 },
      },
      idle: {},
    });
  });

  it('a systems value may be a param, validated at its current value', () => {
    const { session, api } = makeApi();
    const k = api.param('K', 1.5);
    const { id, metadata } = api.tubeSpec({ systems: { 'hot-gas': { minBendRadiusFactor: k, minStraightAtEnd: k.multiply(2) } } });
    expect(metadata.systems!['hot-gas'].minBendRadiusFactor).toMatchObject({ paramRef: 'K', unit: 'unitless' });
    expect((session.getRecords().find((r) => r.id === id)!.metadata as { paramRefs?: string[] }).paramRefs).toEqual(['K']);
    const zero = api.param('Z', 0);
    expect(() => api.tubeSpec({ systems: { 'hot-gas': { minBendRadiusFactor: zero } } })).toThrowError(
      /^tubeSpec: systems\.hot-gas\.minBendRadiusFactor — got 0; requires a positive finite number\./);
    const wide = api.param('A', 200);
    expect(() => api.tubeSpec({ systems: { 'hot-gas': { maxBendAngle: wide } } })).toThrowError(
      /^tubeSpec: systems\.hot-gas\.maxBendAngle — got 200; requires a number in \(0, 180\] degrees\./);
  });

  it.each([
    [{ systems: { 'hot-gas': { minBendRadius: 1.5 } } },
      /^tubeSpec: systems\.hot-gas\.minBendRadius — got a field tubeSpec does not have; requires one of systems\.hot-gas\.minBendRadiusFactor, systems\.hot-gas\.minStraightBetweenBends, systems\.hot-gas\.minStraightAtEnd, systems\.hot-gas\.maxBendAngle\./],
    [{ systems: { 'hot-gas': { clearance: { default: 3 } } } },
      /^tubeSpec: systems\.hot-gas\.clearance — got a field a systems entry does not have; requires clearance between systems in clearance\.pairs, and one of systems\.hot-gas\.minBendRadiusFactor, /],
    [{ systems: { 'hot-gas': { minBendRadiusFactor: -1 } } },
      /^tubeSpec: systems\.hot-gas\.minBendRadiusFactor — got -1; requires a positive finite number\./],
    [{ systems: { 'hot-gas': { minStraightAtEnd: '1' } } },
      /^tubeSpec: systems\.hot-gas\.minStraightAtEnd — got "1"; requires a positive finite number\./],
    [{ systems: { 'hot-gas': { maxBendAngle: 181 } } },
      /^tubeSpec: systems\.hot-gas\.maxBendAngle — got 181; requires a number in \(0, 180\] degrees\./],
    [{ systems: { 'hot-gas': 1.5 } },
      /^tubeSpec: systems\.hot-gas — got 1\.5; requires an object with any of minBendRadiusFactor, minStraightBetweenBends, minStraightAtEnd, maxBendAngle\./],
    [{ systems: { '': { maxBendAngle: 90 } } },
      /^tubeSpec: systems — got an entry with an empty name; requires a non-empty system name for every entry\./],
    [{ systems: ['hot-gas'] },
      /^tubeSpec: systems — got \["hot-gas"\]; requires an object keyed by system name, like \{ 'hot-gas': \{ minBendRadiusFactor: 1\.5 \} \}\./],
  ])('throws on the malformed systems entry in %j', (spec, message) => {
    const { api } = makeApi();
    expect(() => api.tubeSpec(spec as never)).toThrowError(message);
  });

  it('records a virtual tubeSpec feature', () => {
    const { session, api } = makeApi();
    const { id } = api.tubeSpec({ maxBendAngle: 90 });
    expect(session.getRecords().find((r) => r.id === id)!.kind).toBe('tubeSpec');
  });
});
