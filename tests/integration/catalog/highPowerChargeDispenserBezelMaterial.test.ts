// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/ev-charging-infrastructure/high-power-charge-dispenser.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('ev-charging-infrastructure/high-power-charge-dispenser bezel material', () => {
  it('frames the status screen in a black polymer bezel, not in display glass', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort()).toEqual([
      'bezelPolymer',
      'cableElastomer',
      'displayGlass',
      'powderCoat',
      'safetyPolymer',
    ]);
    expect(colorParams.find((param) => param.name === 'bezelPolymer')?.label).toBe('Screen bezel (black polymer)');
    expect(Object.keys(asset.presets)).toEqual(['fleetReady', 'nightService']);
    expect(Object.keys(asset.presets.fleetReady!)).toContain('bezelPolymer');
    expect(Object.keys(asset.presets.nightService!)).toContain('bezelPolymer');
    expect(asset.description).toMatch(/screen bezel/i);
    expect(asset.stats.triangles).toBe(376);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const nodeFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      expect(node, `${name} should export`).toBeDefined();
      return node!;
    };
    const colorsFor = (name: string) =>
      nodeFor(name).getMesh()?.listPrimitives().flatMap((primitive) => {
        const vertexColors = primitive.getAttribute('COLOR_0');
        if (vertexColors !== null) {
          return Array.from({ length: vertexColors.getCount() }, (_, index) => {
            const color = vertexColors.getElement(index, []);
            return color.slice(0, 3).map((channel) =>
              channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055,
            );
          });
        }
        const material = primitive.getMaterial();
        return material === null ? [] : [material.getBaseColorFactor().slice(0, 3)];
      }) ?? [];
    const matches = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      );
    };
    const expectFinish = (names: string[], hex: string, finish: string) => {
      for (const name of names) {
        const colors = colorsFor(name);
        expect(colors.length, `${name} should render`).toBeGreaterThan(0);
        expect(colors.every(matches(hex)), `${name} should use ${finish}`).toBe(true);
      }
    };
    expectFinish(['display-bezel'], '#1f2427', 'the screen bezel polymer finish');
    expectFinish(['display-window'], '#79cfda', 'the display glass finish');
    expectFinish(['main-enclosure', 'base-plinth', 'top-cap', 'door-seam-1', 'door-seam-2', 'roof-visor'], '#397f90', 'the powder-coat finish');

    // GLB is Y up: Y is height, Z is depth. The front is the side the screen faces.
    const span = (bounds: { min: number[]; max: number[] }, axis: number) => bounds.max[axis]! - bounds.min[axis]!;
    const enclosure = getBounds(nodeFor('main-enclosure'));
    const bezel = getBounds(nodeFor('display-bezel'));
    const window = getBounds(nodeFor('display-window'));
    const front = Math.sign((bezel.min[2]! + bezel.max[2]!) / 2);
    const toward = (bounds: { min: number[]; max: number[] }) =>
      [front * bounds.min[2]!, front * bounds.max[2]!].sort((a, b) => a - b) as [number, number];

    // The bezel is a frame seated on the enclosure face, and the glass stands proud of it.
    expect(toward(bezel)[0], 'display-bezel should sit on the enclosure face').toBeCloseTo(toward(enclosure)[1], 5);
    expect(toward(bezel)[1], 'display-bezel should stand proud of the enclosure').toBeGreaterThan(toward(enclosure)[1]);
    expect(toward(window)[1] - toward(bezel)[1], 'display-window should stand proud of the bezel').toBeCloseTo(0.0055, 5);
    expect(span(bezel, 0) - span(window, 0), 'bezel side frame width').toBeCloseTo(0.0532, 4);
    expect(span(bezel, 1) - span(window, 1), 'bezel top and bottom frame height').toBeCloseTo(0.0864, 4);
    expect(window.min[1], 'display-window bottom edge height').toBeGreaterThan(1.4);
  }, 120_000);
});
