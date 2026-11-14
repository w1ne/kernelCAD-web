// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/shipyard/blast-dust-collector.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('shipyard/blast-dust-collector filter media material', () => {
  it('keeps exposed filter media separate from the painted steel collector', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(356);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [2.05, 2.13, 0.995].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'yardPaint', 'filterMedia', 'elastomer',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fresh-coat', 'weathered-yard']);
    expect(asset.presets['fresh-coat']).toMatchObject({ filterMedia: '#e4e8e3' });
    expect(asset.presets['weathered-yard']).toMatchObject({ filterMedia: '#c4ccc5' });

    const media = asset.palette.find((zone) => zone.name === 'filterMedia');
    expect(media?.color).toBe('#d7ded8');
    expect(media?.parts).toEqual(expect.arrayContaining([
      'filter-canister-0', 'filter-canister-1', 'filter-canister-2',
    ]));
    const yard = asset.palette.find((zone) => zone.name === 'yardPaint');
    expect(yard?.parts).toEqual(expect.arrayContaining([
      'skid', 'inlet-duct', 'fan-housing', 'service-door',
    ]));
    expect(yard?.parts).not.toContain('filter-canister-0');

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
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
    const expected = [0xd7 / 255, 0xde / 255, 0xd8 / 255];
    const matchesFilterMedia = (color: number[]) => expected.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const name of ['filter-canister-0', 'filter-canister-1', 'filter-canister-2']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matchesFilterMedia), `${name} should use filter media`).toBe(true);
    }
  }, 120_000);
});
