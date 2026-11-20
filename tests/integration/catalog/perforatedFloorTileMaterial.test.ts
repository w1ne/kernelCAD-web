// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/data-center-infrastructure/perforated-floor-tile.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('data-center-infrastructure/perforated-floor-tile panel material and support', () => {
  it('builds a painted-steel tile panel with polymer edge trim that sits on its pedestals', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort()).toEqual(['polymer', 'steel']);
    expect(Object.keys(asset.presets)).toEqual(['facilityStandard', 'highVisibility']);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const colorsFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      expect(node, `${name} should export`).toBeDefined();
      return node!.getMesh()?.listPrimitives().flatMap((primitive) => {
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
    };
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
    expectFinish(
      ['tile-panel', 'air-slot-bar-0', 'air-slot-bar-7', 'pedestal-0', 'pedestal-3', 'lift-ring'],
      '#4f7485',
      'the painted-steel finish',
    );
    expectFinish(
      ['edge-trim-front', 'edge-trim-rear', 'edge-trim-left', 'edge-trim-right'],
      '#2f3438',
      'the polymer edge trim',
    );

    // Vertical extent in metres of a node's mesh after its world matrix (mm Z-up -> m Y-up).
    const verticalRange = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name)!;
      const m = node.getWorldMatrix();
      const ys = node.getMesh()!.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION')!;
        return Array.from({ length: position.getCount() }, (_, index) => {
          const [x, y, z] = position.getElement(index, []) as [number, number, number];
          return m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
        });
      });
      return [Math.min(...ys), Math.max(...ys)];
    };
    const [panelBottom] = verticalRange('tile-panel');
    for (const pedestal of ['pedestal-0', 'pedestal-1', 'pedestal-2', 'pedestal-3']) {
      const [, pedestalTop] = verticalRange(pedestal);
      expect(pedestalTop, `${pedestal} should stop under the tile panel`).toBeLessThanOrEqual(panelBottom + 1e-4);
    }
    expect(panelBottom).toBeCloseTo(0.15, 3);

    expect(asset.stats.triangles).toBe(376);
    expect(asset.description).toMatch(/painted-steel airflow panel .* polymer edge trim, carried 150 mm above the slab on four steel pedestals/i);
  }, 120_000);
});
