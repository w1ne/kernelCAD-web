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
