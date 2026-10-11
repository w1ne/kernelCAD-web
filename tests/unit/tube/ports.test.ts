// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Fluid port data on axis connectors and `part.port(name)`.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import type { AssemblyPartRef } from '../../../src/modeling/capture/assemblyTypes';

function makeApi() {
  const session = new CaptureSession();
  return { session, api: createModelingApi({ session }) };
}

describe('part.port()', () => {
  it('returns the part base, the local origin and the unit axis', () => {
    const { api } = makeApi();
    const asm = api.assembly('rig');
    const pump = asm.part('pump', api.box(40, 40, 40), { at: [100, 0, 0] })
      .connector('outlet', { type: 'axis', origin: { kind: 'vec3', value: [20, 20, 40] }, axis: [0, 0, 2],
        port: { system: 'hydraulic', od: 9.525, minStraight: 20 } });
    const end = pump.port('outlet');
    expect(end.offset).toEqual([20, 20, 40]);
    expect(end.axis).toEqual([0, 0, 1]);
    expect(end.base).toBe(pump.at);
    expect(end).toMatchObject({ od: 9.525, system: 'hydraulic', minStraight: 20, part: 'pump', connector: 'outlet' });
  });

  it('keeps port data on the stored connector (shared array)', () => {
    const { api } = makeApi();
    const pump = api.assembly('rig').part('pump', api.box(40, 40, 40))
      .connector('outlet', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1],
        port: { system: 'oil', od: 6 } });
    expect(pump.mateConnectors[0].port).toEqual({ system: 'oil', od: 6 });
  });

  it.each([
    ['tube.port.not-found', (p: AssemblyPartRef) => p.port('nope')],
    ['tube.port.not-a-port', (p: AssemblyPartRef) =>
      p.connector('plain', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] }).port('plain')],
    ['tube.port.unresolved', (p: AssemblyPartRef) =>
      p.connector('onface', { type: 'axis', origin: '@kc[pump/face/top]', axis: [0, 0, 1],
        port: { system: 'oil', od: 6 } }).port('onface')],
  ])('%s', (prefix, run) => {
    const { api } = makeApi();
    const pump = api.assembly('rig').part('pump', api.box(40, 40, 40));
    expect(() => run(pump)).toThrowError(new RegExp(`^${prefix.replace(/\./g, '\\.')}:`));
  });

  it('port errors name the connector, the part and the feature', () => {
    const { api } = makeApi();
    const pump = api.assembly('rig').part('pump', api.box(40, 40, 40));
    const caught = (run: () => unknown): { message: string; hint: string; featureId?: string } => {
      try { run(); } catch (e) { return e as { message: string; hint: string; featureId?: string }; }
      throw new Error('did not throw');
    };
    const missing = caught(() => pump.port('nope'));
    expect(missing.message).toMatch(
      /^tube\.port\.not-found: connector 'nope' on part 'pump' — got no connector of that name; requires a connector registered on the part before port\(\) is called\./);
    expect(missing.hint).toBe("Register it first: part.connector('nope', { type: 'axis', origin, axis, port: { system, od } }).");
    expect(missing.featureId).toBe(pump.id);
    const badOd = caught(() => pump.connector('b', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1],
      port: { system: 'oil', od: 0 } }));
    expect(badOd.message).toMatch(
      /^tube\.port\.invalid: connector 'b' on part 'pump' — got port data \{"system":"oil","od":0\}; requires port: \{ system: <non-empty name>, od: <positive mm>/);
    expect(badOd.hint).toBe('Pass port: { system: <name>, od: <mm>, minStraight?: <mm> } as an object with positive numbers.');
    expect(badOd.featureId).toBe(pump.id);
    const badAxis = caught(() => pump.connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 0],
      port: { system: 'oil', od: 6 } }));
    expect(badAxis.message).toMatch(
      /^tube\.port\.invalid: connector 'c' on part 'pump' — got axis \[0,0,0\]; requires a finite, non-zero axis \[x, y, z\]\./);
    const frame = caught(() => pump.connector('d', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] },
      port: { system: 'oil', od: 6 } }));
    expect(frame.message).toMatch(
      /^tube\.port\.axis-required: connector 'd' on part 'pump' — got port data on a 'frame' connector with no axis; requires an axis connector with an axis/);
  });

  it('rejects port data on a non-axis connector and a non-positive od', () => {
    const { api } = makeApi();
    const pump = api.assembly('rig').part('pump', api.box(40, 40, 40));
    expect(() => pump.connector('a', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] },
      port: { system: 'oil', od: 6 } })).toThrowError(/^tube\.port\.axis-required:/);
    expect(() => pump.connector('b', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1],
      port: { system: 'oil', od: 0 } })).toThrowError(/^tube\.port\.invalid:/);
  });
  it.each([
    ['a non-object port', 'oil'],
    ['an array port', [1, 2]],
    ['a null port', null],
  ])('rejects %s with tube.port.invalid', (_label, port) => {
    const { api } = makeApi();
    const pump = api.assembly('rig').part('pump', api.box(40, 40, 40));
    expect(() => pump.connector('a', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1],
      port: port as never })).toThrowError(/^tube\.port\.invalid:/);
  });

  it.each([
    ['a zero-length axis', [0, 0, 0]],
    ['a NaN axis component', [0, Number.NaN, 1]],
    ['an infinite axis component', [Number.POSITIVE_INFINITY, 0, 1]],
  ])('rejects %s with tube.port.invalid', (_label, axis) => {
    const { api } = makeApi();
    const pump = api.assembly('rig').part('pump', api.box(40, 40, 40));
    expect(() => pump.connector('a', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: axis as [number, number, number], port: { system: 'oil', od: 6 } })).toThrowError(/^tube\.port\.invalid:/);
  });

  it('port() on a part placed with connect throws tube.port.unresolved', () => {
    const { api } = makeApi();
    const asm = api.assembly('rig');
    const base = asm.part('base', api.box(20, 20, 8), { at: [0, 0, 0],
      connectors: { mount: { origin: [10, 0, 8], axis: [0, 0, 1] } } });
    const pump = asm.part('pump', api.box(40, 40, 40), {
      connectors: { root: { origin: [0, 0, 0], axis: [0, 0, 1] } },
      connect: { connector: 'root', to: base.connector('mount') },
    }).connector('out', { type: 'axis', origin: { kind: 'vec3', value: [20, 20, 40] }, axis: [0, 0, 1],
      port: { system: 'oil', od: 6 } });
    expect(() => pump.port('out')).toThrowError(/^tube\.port\.unresolved:/);
  });
});

describe('connector origin must be numeric', () => {
  const HINT = /build the part in its own frame and place it with a param in `at`/;

  it.each([
    ['a bare param', (x: unknown) => [x, 20, 20]],
    ['a param expression', (x: { add(n: number): unknown }) => [x.add(0), 20, 20]],
    ['NaN', () => [Number.NaN, 20, 20]],
    ['a string', () => ['20', 20, 20]],
    ['two components', () => [20, 20]],
  ])('rejects %s in a vec3 origin, on a port and on a plain frame connector', (_label, value) => {
    for (const rest of [{ type: 'axis', axis: [1, 0, 0], port: { system: 'fuel', od: 10 } }, { type: 'frame' }]) {
      const { api } = makeApi();
      const part = api.assembly('rig').part('b', api.box(40, 40, 40));
      let thrown: { code?: string; message?: string; hint?: string } = {};
      try {
        part.connector('p', { ...rest, origin: { kind: 'vec3', value: value(api.param('X', 200) as never) } } as never);
      } catch (e) { thrown = e as typeof thrown; }
      expect(thrown.code).toBe('feature.invalid-args');
      expect(thrown.message).toMatch(/^connector\(name, opts\): origin\.value — got .*; requires three finite numbers \[x, y, z\] in the part's own frame/);
      expect(thrown.hint).toMatch(HINT);
      expect(part.mateConnectors).toHaveLength(0);
    }
  });

  it('names the param in the message', () => {
    const { api } = makeApi();
    const x = api.param('X', 200);
    expect(() => api.assembly('rig').part('b', api.box(40, 40, 40))
      .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [x as never, 20, 20] } }))
      .toThrowError(/got \[param X, 20, 20\]/);
  });

  it('still accepts plain numbers and topology references', () => {
    const { api } = makeApi();
    const part = api.assembly('rig').part('b', api.box(40, 40, 40))
      .connector('a', { type: 'frame', origin: { kind: 'vec3', value: [0, -1.5, 40] } })
      .connector('t', { type: 'axis', origin: '@kc[b/face/top]', axis: [0, 0, 1] });
    expect(part.mateConnectors.map((c) => c.origin.kind)).toEqual(['vec3', 'topology']);
  });
});

