// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/wind-energy/tower-section.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('wind-energy/tower-section shell material', () => {
  it('draws a tapered painted shell between steel flanges', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(144);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name).sort()).toEqual([
      'flangeSteel', 'paintedSteel', 'towerPaint',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(Object.keys(asset.presets.weathered!)).toContain('towerPaint');

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

    expectFinish(['shaft'], '#e2e5e3', 'the tower paint');
    expectFinish(['lower-collar', 'upper-band'], '#7f8b8e', 'the flange steel finish');
    expectFinish(['access-panel'], '#53727c', 'the painted steel finish');

    // GLB is Y up and the tower axis is the Y axis. Collect shaft vertices in world space.
    const shaft = nodeFor('shaft');
    const world = shaft.getWorldMatrix();
    const points: number[][] = [];
    for (const primitive of shaft.getMesh()!.listPrimitives()) {
      const position = primitive.getAttribute('POSITION')!;
      for (let index = 0; index < position.getCount(); index++) {
        const [x, y, z] = position.getElement(index, []) as [number, number, number];
        points.push([0, 1, 2].map((row) =>
          world[row]! * x + world[4 + row]! * y + world[8 + row]! * z + world[12 + row]!,
        ));
      }
    }
    const heights = points.map((point) => point[1]!);
    const low = Math.min(...heights);
    const high = Math.max(...heights);
    const radiusAt = (height: number) => Math.max(
      ...points.filter((point) => Math.abs(point[1]! - height) < 1e-4).map((point) => Math.hypot(point[0]!, point[2]!)),
    );
    expect(low).toBeCloseTo(0.05, 4);
    expect(high).toBeCloseTo(1.75, 4);
    expect(radiusAt(low), 'shell base radius').toBeCloseTo(0.15, 4);
    expect(radiusAt(high), 'shell top radius should be smaller than the base').toBeCloseTo(0.11, 4);

    // The flanges stand proud of the shell at both ends; the access panel is set into the shell wall.
    const extent = (name: string) => {
      const { min, max } = getBounds(nodeFor(name));
      return { min, max, size: max.map((value, axis) => value - min[axis]!) };
    };
    expect(extent('lower-collar').size[0]! / 2).toBeGreaterThan(radiusAt(low));
    expect(extent('upper-band').size[0]! / 2).toBeGreaterThan(radiusAt(high));
    const panel = extent('access-panel');
    const panelDepths = [Math.abs(panel.min[2]!), Math.abs(panel.max[2]!)];
    const flatAt = (heightMm: number) => (150 - (40 * (heightMm - 50)) / 1700) * Math.cos(Math.PI / 12) / 1000;
    expect(Math.min(...panelDepths), 'panel back face should be inside the shell').toBeLessThan(flatAt(850));
    expect(Math.max(...panelDepths), 'panel front face should stand proud of the shell').toBeGreaterThan(flatAt(500));
    expect(Math.max(...panelDepths) - flatAt(500), 'panel should not float off the shell').toBeLessThan(0.02);

    const all = getBounds(document.getRoot().listScenes()[0]!);
    expect(all.max[0]! - all.min[0]!).toBeCloseTo(0.36, 3);
    expect(all.max[1]! - all.min[1]!).toBeCloseTo(1.75, 3);
  }, 120_000);
});
