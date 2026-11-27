// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/railway/maintenance-railcar.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('railway/maintenance-railcar running gear, cab and deck', () => {
  it('runs on two axles with wheels on both rails and has a glazed cab and a railed deck', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(Object.keys(asset.presets)).toEqual(['weathered', 'freshService']);
    expect(asset.params.map((param) => param.name)).toEqual(['scale', 'railSteel', 'safetyPaint', 'paintedSteel', 'signalAmberGlass', 'glass']);
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
    // Two axles, each with one wheel on each rail.
    const centreAcross = (b: [number, number][]) => (b[2]![0] + b[2]![1]) / 2;
    const wheels = named(/^wheel-/).map(bounds);
    expect(wheels.length, 'two axles with a wheel on each rail').toBe(4);
    const near = wheels.filter((b) => centreAcross(b) > 0.05);
    const far = wheels.filter((b) => centreAcross(b) < -0.05);
    expect(near.length, 'two wheels on one rail').toBe(2);
    expect(far.length, 'two wheels on the other rail').toBe(2);
    // The wheel track is centred on the car centre line.
    const nearY = near.reduce((sum, b) => sum + centreAcross(b), 0) / near.length;
    const farY = far.reduce((sum, b) => sum + centreAcross(b), 0) / far.length;
    expect(nearY + farY).toBeCloseTo(0, 3);
    const axles = named(/^axle-/).map(bounds);
    expect(axles.length).toBe(2);
    for (const axle of axles) {
      expect(axle[2]![0] < -0.09 && axle[2]![1] > 0.09, 'each axle should span both wheels').toBe(true);
    }
    expect(named(/^horn-guide-/).length, 'each axle runs in a horn guide on each side').toBe(4);
    // Flanges reach z = 0; the treads, 8 mm smaller in radius, sit on the rail heads.
    const flanges = named(/^flange-/).map(bounds);
    expect(flanges.length).toBe(4);
    expect(Math.min(...flanges.map((b) => b[1]![0]))).toBeCloseTo(0, 3);
    expect(Math.min(...wheels.map((b) => b[1]![0]))).toBeCloseTo(0.008, 3);

    // The wheels clear the frame: every wheel top stays below the solebars and the deck.
    const solebars = named(/^solebar-/).map(bounds);
    expect(solebars.length).toBe(2);
    const deck = bounds(named(/^deck$/)[0]!);
    for (const wheel of wheels) {
      expect(wheel[1]![1], 'wheel top stays below the solebars').toBeLessThan(Math.min(...solebars.map((b) => b[1]![0])));
      expect(Math.abs(centreAcross(wheel)), 'wheels sit inside the deck width').toBeLessThan(deck[2]![1]);
    }

    // Glazed cab: windscreen beyond the cab front, rear window onto the deck, a side window and a door on each side.
    const cab = bounds(named(/^cab$/)[0]!);
    const windscreen = bounds(named(/^windscreen$/)[0]!);
    expect(windscreen[0]![0]).toBeLessThan(cab[0]![0]);
    const rearWindow = bounds(named(/^rear-window$/)[0]!);
    expect(rearWindow[0]![1]).toBeGreaterThan(cab[0]![1]);
    for (const kind of ['side-window', 'cab-door']) {
      const parts = named(new RegExp(`^${kind}-(front|back)$`)).map(bounds);
      expect(parts.filter((b) => centreAcross(b) > cab[2]![1] - 0.002).length, `${kind} on one side`).toBe(1);
      expect(parts.filter((b) => centreAcross(b) < cab[2]![0] + 0.002).length, `${kind} on the other side`).toBe(1);
    }

    // Open deck behind the cab with handrails on both sides; the crane boom clears the tool cabinet.
    const topRails = named(/^handrail-top-(front|back)$/).map(bounds);
    expect(topRails.length).toBe(2);
    for (const rail of topRails) expect(rail[0]![0]).toBeGreaterThanOrEqual(cab[0]![1] - 0.001);
    const boom = bounds(named(/^crane-boom$/)[0]!);
    const cabinet = bounds(named(/^tool-cabinet$/)[0]!);
    expect(boom[1]![0]).toBeGreaterThanOrEqual(cabinet[1]![1]);

    // Buffers and a coupler hook on each end.
    expect(named(/^buffer-head-/).length).toBe(4);
    expect(named(/^coupler-hook-/).length).toBe(2);

    expect(asset.description).toMatch(/wheels on both rails/);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
  }, 120_000);
});
