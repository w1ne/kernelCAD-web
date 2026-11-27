// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/railway/dining-car.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('railway/dining-car running gear, windows and doors', () => {
  it('rides on two bogies with wheels on both rails and has windows and doors on both sides', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(Object.keys(asset.presets)).toEqual(['weathered', 'freshService']);
    expect(asset.params.map((param) => param.name)).toEqual(['scale', 'railSteel', 'paintedSteel', 'glass', 'stainlessSteel']);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    // World-space bounds in metres of a node's mesh (mm Z-up -> m Y-up).
    const bounds = (node: (typeof nodes)[number]) => {
      const m = node.getWorldMatrix();
      const points = node.getMesh()!.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION')!;
        return Array.from({ length: position.getCount() }, (_, index) => {
          const [x, y, z] = position.getElement(index, []) as [number, number, number];
          return [0, 1, 2].map((axis) => m[axis]! * x + m[4 + axis]! * y + m[8 + axis]! * z + m[12 + axis]!);
        });
      });
      return [0, 1, 2].map((axis) => {
        const values = points.map((point) => point[axis]!);
        return [Math.min(...values), Math.max(...values)] as [number, number];
      });
    };
    const meshNodes = nodes.filter((node) => node.getMesh() !== null);
    const named = (pattern: RegExp) => meshNodes.filter((node) => pattern.test(node.getName()));

    // Y-up metres: index 0 = x (along the car), 1 = height, 2 = -y (across the car).
    // Every axle carries one wheel on each rail: four axles, eight wheels, four per side.
    const centreAcross = (b: [number, number][]) => (b[2]![0] + b[2]![1]) / 2;
    const wheels = named(/^wheel-/).map(bounds);
    expect(wheels.length, 'two bogies with two wheel pairs each').toBe(8);
    expect(wheels.filter((b) => centreAcross(b) > 0.05).length, 'four wheels on one rail').toBe(4);
    expect(wheels.filter((b) => centreAcross(b) < -0.05).length, 'four wheels on the other rail').toBe(4);
    const axles = named(/^axle-/).map(bounds);
    expect(axles.length).toBe(4);
    for (const axle of axles) {
      expect(axle[2]![0] < -0.09 && axle[2]![1] > 0.09, 'each axle should span both wheels').toBe(true);
    }
    expect(named(/^side-frame-/).length, 'each bogie has a side frame on each rail').toBe(4);
    // Flanges reach z = 0; the treads, 8 mm smaller in radius, sit on the rail heads.
    const flanges = named(/^flange-/).map(bounds);
    expect(flanges.length).toBe(8);
    expect(Math.min(...flanges.map((b) => b[1]![0]))).toBeCloseTo(0, 3);
    expect(Math.min(...wheels.map((b) => b[1]![0]))).toBeCloseTo(0.008, 3);

    // The wheels clear the car body and the sills: they stay below the sill band.
    const body = bounds(named(/^body$/)[0]!);
    const sill = bounds(named(/^centre-sill$/)[0]!);
    for (const wheel of wheels) {
      expect(wheel[1]![1], 'wheel top stays below the sills').toBeLessThan(sill[1]![0]);
      expect(Math.abs(centreAcross(wheel)), 'wheels sit inside the body width').toBeLessThan(body[2]![1]);
    }

    // Saloon and galley windows on both sides, each on the outside of the body.
    for (const kind of ['saloon', 'galley']) {
      const windows = named(new RegExp(`^${kind}-window-`)).map(bounds);
      const near = windows.filter((b) => centreAcross(b) > body[2]![1] - 0.002);
      const far = windows.filter((b) => centreAcross(b) < body[2]![0] + 0.002);
      expect(near.length, `${kind} windows on one side`).toBeGreaterThan(0);
      expect(far.length, `${kind} windows on the other side`).toBe(near.length);
      expect(near.length + far.length).toBe(windows.length);
    }

    // A glazed end door at each end and a side entrance door on each side.
    const endDoors = named(/^end-door-[ab]$/).map(bounds);
    expect(endDoors.length).toBe(2);
    expect(endDoors.filter((b) => b[0]![0] > body[0]![1] - 0.005).length).toBe(1);
    expect(endDoors.filter((b) => b[0]![1] < body[0]![0] + 0.005).length).toBe(1);
    const sideDoors = named(/^side-door-(front|back)$/).map(bounds);
    expect(sideDoors.filter((b) => centreAcross(b) > body[2]![1] - 0.002).length).toBe(1);
    expect(sideDoors.filter((b) => centreAcross(b) < body[2]![0] + 0.002).length).toBe(1);

    expect(asset.description).toMatch(/wheels on both rails/);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
  }, 120_000);
});
