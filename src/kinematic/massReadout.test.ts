// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Selection → mass / CoM / principal-moment readout. No OCCT: a fake body
// returns a known tensor so the mapping and the water-default flag are what
// the test checks.
import { describe, expect, it } from 'vitest';
import type { MassProperties } from '../kernel/properties/massProperties';
import {
  massReadoutForIds,
  type MassBody,
  type MassTarget,
} from './massReadout';

const TENSOR: MassProperties = {
  mass: 2,
  com: [4, -5, 6.5],
  inertia6: [1, 0.1, 0.2, 2, 0.3, 3],
  inertiaMatrix: [
    [1, 0.1, 0.2],
    [0.1, 2, 0.3],
    [0.2, 0.3, 3],
  ],
  principalMoments: [1.5, 2.5, 3.5],
  principalAxes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  hasSymmetryAxis: false,
  hasSymmetryPoint: false,
};

function fakeBody(volume = 1000, mass = TENSOR): MassBody & { readonly densities: number[] } {
  const densities: number[] = [];
  return {
    densities,
    volume: () => volume,
    massProperties: (density = 1000) => {
      densities.push(density);
      return mass;
    },
  };
}

function readyOf(target: MassTarget) {
  const readout = massReadoutForIds(['only'], () => target);
  expect(readout.status).toBe('ready');
  if (readout.status !== 'ready') throw new Error('expected a ready readout');
  return readout;
}

describe('mass readout for the current selection', () => {
  it('says nothing numeric when nothing is selected', () => {
    const readout = massReadoutForIds([], () => undefined);
    expect(readout).toEqual({
      status: 'empty',
      reason: 'no-selection',
      message: 'Select one solid or part to see mass properties.',
    });
    expect(JSON.stringify(readout)).not.toMatch(/massKg|0 kg|principal/);
  });

  it('refuses a multi-selection instead of averaging', () => {
    const readout = massReadoutForIds(['a', 'b'], () => ({ kind: 'other' }));
    expect(readout.status).toBe('empty');
    if (readout.status !== 'empty') return;
    expect(readout.reason).toBe('multi-select');
    expect(readout.message).toMatch(/single/i);
    expect(JSON.stringify(readout)).not.toMatch(/0 kg|massKg/);
  });

  it('refuses a non-solid and a missing body', () => {
    expect(massReadoutForIds(['sketch'], () => ({ kind: 'other' }))).toMatchObject({
      status: 'empty',
      reason: 'not-a-solid',
    });
    expect(massReadoutForIds(['gone'], () => undefined)).toMatchObject({
      status: 'empty',
      reason: 'not-a-solid',
    });
  });

  it('reports mass, CoM, principal moments, volume, and a raw density', () => {
    const body = fakeBody();
    const readout = readyOf({ kind: 'solid', label: 'bracket', body, density: 7850 });
    expect(body.densities).toEqual([7850]);
    expect(readout.label).toBe('bracket');
    expect(readout.massKg).toBe(2);
    expect(readout.comMm).toEqual([4, -5, 6.5]);
    expect(readout.principalMomentsKgM2).toEqual([1.5, 2.5, 3.5]);
    expect(readout.volumeMm3).toBe(1000);
    expect(readout.densityKgM3).toBe(7850);
    expect(readout.densitySource).toBe('raw');
    expect(readout.densityDefaulted).toBe(false);
    expect(readout.warning).toBeUndefined();
    expect(readout.lines.map((line) => line.id)).toEqual(['mass', 'density', 'com', 'principal', 'volume']);
    expect(readout.lines.find((line) => line.id === 'density')?.value).toBe('7850 kg/m³ · raw');
    expect(readout.lines.find((line) => line.id === 'com')?.value).toContain('mm');
    expect(readout.lines.find((line) => line.id === 'principal')?.value).toContain('kg·m²');
    expect(readout.lines.find((line) => line.id === 'volume')?.value).toContain('mm³');
    expect(readout.inertia6KgM2).toEqual([1, 0.1, 0.2, 2, 0.3, 3]);
  });

  it('uses a named material density and does not flag water', () => {
    const body = fakeBody();
    const readout = readyOf({ kind: 'solid', label: 'plate', body, material: 'aluminium' });
    expect(body.densities).toEqual([2700]);
    expect(readout.densityKgM3).toBe(2700);
    expect(readout.densitySource).toBe('material');
    expect(readout.material).toBe('aluminum-6061');
    expect(readout.densityDefaulted).toBe(false);
    expect(readout.lines.find((line) => line.id === 'density')?.value).toBe(
      '2700 kg/m³ · material (aluminum-6061)',
    );
    expect(readout.lines.find((line) => line.id === 'density')?.flag).toBeUndefined();
  });

  it('flags a water default and never presents it as a chosen density', () => {
    const body = fakeBody();
    const readout = readyOf({ kind: 'solid', label: 'block', body });
    expect(body.densities).toEqual([1000]);
    expect(readout.densitySource).toBe('default');
    expect(readout.densityDefaulted).toBe(true);
    expect(readout.densityKgM3).toBe(1000);
    expect(readout.warning).toMatch(/1000/);
    expect(readout.warning).toMatch(/water/i);
    const density = readout.lines.find((line) => line.id === 'density');
    expect(density?.flag).toBe('water-default');
    expect(density?.value).toMatch(/default \(water\)/);
  });

  it('treats an explicit density of 1000 as raw, not as the water default', () => {
    const readout = readyOf({ kind: 'solid', label: 'block', body: fakeBody(), density: 1000 });
    expect(readout.densitySource).toBe('raw');
    expect(readout.densityDefaulted).toBe(false);
    expect(readout.warning).toBeUndefined();
  });

  it('does not invent a water mass for an unknown material on a solid', () => {
    const body = fakeBody();
    const readout = massReadoutForIds(['only'], () => ({
      kind: 'solid',
      label: 'block',
      body,
      material: 'kryptonite',
    }));
    expect(readout.status).toBe('unavailable');
    if (readout.status !== 'unavailable') return;
    expect(readout.message).toMatch(/kryptonite/);
    expect(readout.message).not.toMatch(/water/i);
    expect(body.densities).toEqual([]);
  });

  it('refuses a solid that sets both density and material', () => {
    const readout = massReadoutForIds(['only'], () => ({
      kind: 'solid',
      label: 'block',
      body: fakeBody(),
      density: 7850,
      material: 'steel',
    }));
    expect(readout.status).toBe('unavailable');
    if (readout.status !== 'unavailable') return;
    expect(readout.message).toMatch(/not both/i);
  });

  it('rejects a non-positive density', () => {
    const readout = massReadoutForIds(['only'], () => ({
      kind: 'solid',
      label: 'block',
      body: fakeBody(),
      density: 0,
    }));
    expect(readout.status).toBe('unavailable');
  });

  it('does not show zeros for a body with no volume', () => {
    const body = fakeBody(0);
    const readout = massReadoutForIds(['only'], () => ({ kind: 'solid', label: 'empty', body }));
    expect(readout).toMatchObject({ status: 'empty', reason: 'no-volume' });
    expect(body.densities).toEqual([]);
    expect(JSON.stringify(readout)).not.toMatch(/0 kg/);
  });

  it('reads an assembly part through the part-mass precedence', () => {
    const body = fakeBody();
    const readout = readyOf({
      kind: 'assemblyPart',
      part: { name: 'arm', material: 'pla' },
      body,
    });
    expect(body.densities).toEqual([1240, 1240]);
    expect(readout.label).toBe('arm');
    expect(readout.densityKgM3).toBe(1240);
    expect(readout.densitySource).toBe('material');
    expect(readout.material).toBe('pla');
    expect(readout.massKg).toBe(2);
    expect(readout.densityDefaulted).toBe(false);
  });

  it('flags water when an assembly part has no density source', () => {
    const readout = readyOf({
      kind: 'assemblyPart',
      part: { name: 'link' },
      body: fakeBody(),
    });
    expect(readout.densitySource).toBe('default');
    expect(readout.densityDefaulted).toBe(true);
    expect(readout.warning).toMatch(/water/i);
    expect(readout.lines.find((line) => line.id === 'density')?.flag).toBe('water-default');
  });

  it('keeps a declared part mass and scales the principal moments with it', () => {
    const readout = readyOf({
      kind: 'assemblyPart',
      part: { name: 'servo', massKg: 4 },
      body: fakeBody(),
    });
    expect(readout.massKg).toBe(4);
    expect(readout.massDeclared).toBe(true);
    expect(readout.comMm).toEqual([4, -5, 6.5]);
    expect(readout.principalMomentsKgM2).toEqual([3, 5, 7]);
    expect(readout.inertia6KgM2).toEqual([2, 0.2, 0.4, 4, 0.6, 6]);
    // The geometric density was the water fallback, and the line still says so.
    // The mass itself is the declaration, so the water warning stays off.
    expect(readout.densitySource).toBe('default');
    expect(readout.densityDefaulted).toBe(false);
    expect(readout.warning).toBeUndefined();
    expect(readout.lines.find((line) => line.id === 'density')?.flag).toBe('water-default');
    expect(readout.lines.find((line) => line.id === 'mass')?.value).toMatch(/declared/);
  });

  it('treats an assembly part density as raw', () => {
    const body = fakeBody();
    const readout = readyOf({
      kind: 'assemblyPart',
      part: { name: 'pin', density: 7850 },
      body,
    });
    expect(body.densities[0]).toBe(7850);
    expect(readout.densitySource).toBe('raw');
    expect(readout.densityDefaulted).toBe(false);
  });

  it('reports a geometry failure instead of zeros', () => {
    const body: MassBody = {
      volume: () => { throw new Error('mesh failed'); },
      massProperties: () => TENSOR,
    };
    const readout = massReadoutForIds(['only'], () => ({ kind: 'solid', label: 'bad', body }));
    expect(readout.status).toBe('unavailable');
    if (readout.status !== 'unavailable') return;
    expect(readout.message).toMatch(/mesh failed/);
    expect(JSON.stringify(readout)).not.toMatch(/0 kg/);
  });

  it('names an unresolved assembly material while flagging the water fallback', () => {
    const readout = readyOf({
      kind: 'assemblyPart',
      part: { name: 'mystery', material: 'kryptonite' },
      body: fakeBody(),
    });
    expect(readout.densitySource).toBe('default');
    expect(readout.densityDefaulted).toBe(true);
    expect(readout.warning).toMatch(/kryptonite/);
    expect(readout.warning).toMatch(/water/i);
    expect(readout.densityKgM3).toBe(1000);
  });
});
