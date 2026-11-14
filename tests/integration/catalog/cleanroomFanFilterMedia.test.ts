// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/lab-infrastructure/cleanroom-fan-filter-unit.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('lab-infrastructure/cleanroom-fan-filter-unit filter media', () => {
  it('shows a HEPA media face inside the steel flange instead of a solid steel plate', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(152);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [0.972, 0.32, 0.972].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.description).toContain('white HEPA filter-media face');
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'enamel', 'polymer', 'stainless', 'steel', 'filterMedia',
    ]);
    expect(asset.presets.cleanroom?.filterMedia).toBe('#f6f8f4');
    expect(asset.presets.highVisibility?.filterMedia).toBe('#e4e6dc');

    const media = asset.palette.find((zone) => zone.name === 'filterMedia');
    expect(media?.color).toBe('#eef0ea');
    expect(media?.parts).toEqual(['filter-media']);
    const steel = asset.palette.find((zone) => zone.name === 'steel');
    expect(steel?.parts).toEqual(['perimeter-frame']);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const boundsFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      const position = node?.getMesh()?.listPrimitives()[0]?.getAttribute('POSITION');
      expect(position, `expected exported positions for ${name}`).toBeTruthy();
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (let index = 0; index < position!.getCount(); index += 1) {
        const point = position!.getElement(index, []);
        point.forEach((value, axis) => {
          min[axis] = Math.min(min[axis]!, value);
          max[axis] = Math.max(max[axis]!, value);
        });
      }
      return { min, max };
    };
    const colorsFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      return node?.getMesh()?.listPrimitives().flatMap((primitive) => {
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

    const expectedMedia = [0xee / 255, 0xf0 / 255, 0xea / 255];
    const mediaColors = colorsFor('filter-media');
    expect(mediaColors.length).toBeGreaterThan(0);
    expect(mediaColors.every((color) => expectedMedia.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    ))).toBe(true);

    // Mesh positions are millimetres. The steel flange is a ring: its vertices stay
    // outside the 800 mm media opening.
    const frame = nodes.find((node) => node.getName() === 'perimeter-frame');
    const framePositions = frame?.getMesh()?.listPrimitives()[0]?.getAttribute('POSITION');
    expect(framePositions).toBeTruthy();
    const mediaBounds = boundsFor('filter-media');
    const mediaHalfWidth = (mediaBounds.max[0]! - mediaBounds.min[0]!) / 2;
    expect(mediaHalfWidth).toBeCloseTo(400, 1);
    for (let index = 0; index < framePositions!.getCount(); index += 1) {
      // Height stays at or below 320 mm, so the largest coordinate is lateral.
      const point = framePositions!.getElement(index, []);
      expect(Math.max(...point.map(Math.abs))).toBeGreaterThanOrEqual(mediaHalfWidth - 0.1);
    }
  }, 120_000);
});
