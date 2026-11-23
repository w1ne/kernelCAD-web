// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/railway/hopper-wagon.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('railway/hopper-wagon running gear and hopper silhouette', () => {
  it('rides on wheels on both rails and hangs two discharge pockets between the bogies', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(Object.keys(asset.presets)).toEqual(['weathered', 'freshService']);
    expect(asset.params.map((param) => param.name)).toEqual(['scale', 'railSteel', 'paintedSteel', 'galvanizedSteel']);
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
    const wheels = named(/^wheel-/).map(bounds);
    expect(wheels.length, 'two bogies with two wheel pairs each').toBe(8);
    const centreAcross = (b: [number, number][]) => (b[2]![0] + b[2]![1]) / 2;
    expect(wheels.filter((b) => centreAcross(b) > 0.05).length, 'four wheels on one rail').toBe(4);
    expect(wheels.filter((b) => centreAcross(b) < -0.05).length, 'four wheels on the other rail').toBe(4);
    const axles = named(/^axle-/).map(bounds);
    expect(axles.length).toBe(4);
    for (const axle of axles) {
      expect(axle[2]![0] < -0.09 && axle[2]![1] > 0.09, 'each axle should span both wheels').toBe(true);
    }
    // Flanges reach z = 0; the treads, 8 mm smaller in radius, sit on the rail heads.
    const flanges = named(/^flange-/).map(bounds);
    expect(flanges.length).toBe(8);
    expect(Math.min(...flanges.map((b) => b[1]![0]))).toBeCloseTo(0, 3);
    expect(Math.min(...wheels.map((b) => b[1]![0]))).toBeCloseTo(0.008, 3);

    // Hopper silhouette: the side sheet reaches lower between the bogies than over them,
    // and the floor has two pocket outlets with gates under them.
    const floor = bounds(named(/^hopper-floor$/)[0]!);
    const sideSheet = bounds(named(/^side-sheet-front$/)[0]!);
    const bolster = bounds(named(/^body-bolster-a$/)[0]!);
    expect(floor[1]![0], 'pocket outlets hang below the body bolsters').toBeLessThan(bolster[1]![0] - 0.05);
    expect(sideSheet[1]![0], 'the side sheet follows the pockets down').toBeLessThan(bolster[1]![0] - 0.05);
    const wheelTop = Math.max(...wheels.map((b) => b[1]![1]));
    expect(floor[1]![0], 'the pocket outlets drop below the wheel tops').toBeLessThan(wheelTop);
    const gates = named(/^gate-door-/).map(bounds);
    expect(gates.length).toBe(2);
    for (const gate of gates) {
      expect(gate[1]![1]).toBeLessThanOrEqual(floor[1]![0] + 0.001);
      expect(Math.abs((gate[0]![0] + gate[0]![1]) / 2), 'gates sit between the bogies').toBeLessThan(0.3);
    }

    expect(asset.description).toMatch(/V-shaped discharge pockets/);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
  }, 120_000);
});
