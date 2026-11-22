// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/water-treatment/sludge-thickener-tank.kcad.ts';

const parseHex = (hex: string): number[] => [0, 1, 2].map((index) =>
  Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255,
);

const readNodeColors = (document: Awaited<ReturnType<NodeIO['readBinary']>>, name: string) => {
  const node = document.getRoot().listNodes().find((candidate) => candidate.getName() === name);
  expect(node, name).toBeDefined();
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

const matchesHex = (hex: string) => {
  const expected = parseHex(hex);
  return (color: number[]) => expected.every((channel, index) =>
    Math.abs(channel - color[index]!) < 0.015,
  );
};

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('water-treatment/sludge-thickener-tank materials', () => {
  it('exposes the cast-iron center drive above the well and uses steel for the scraper arm', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(500);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM).toEqual([1.07, 0.85, 1.07]);
    expect(asset.params.find((param) => param.name === 'castIron'))
      .toMatchObject({ default: '#343a3d', label: 'Center drive cast iron' });
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(asset.presets.weathered).toMatchObject({ castIron: '#292d2f' });
    expect(asset.presets.highVisibility).toMatchObject({ castIron: '#3a4145' });

    const concreteParts = asset.palette.find((zone) => zone.name === 'concrete')?.parts ?? [];
    const steelParts = asset.palette.find((zone) => zone.name === 'structuralSteel')?.parts ?? [];
    const ironParts = asset.palette.find((zone) => zone.name === 'castIron')?.parts ?? [];
    expect(concreteParts).toContain('tank');
    expect(concreteParts).not.toContain('drive');
    expect(concreteParts).not.toContain('scraper-arm');
    expect(steelParts).toContain('bridge');
    expect(steelParts).toContain('scraper-arm');
    expect(ironParts).toContain('drive');

    const document = await new NodeIO().readBinary(glb);
    for (const [part, color] of [
      ['drive', '#343a3d'],
      ['scraper-arm', '#68777b'],
      ['tank', '#b8b1a1'],
    ] as const) {
      const colors = readNodeColors(document, part);
      expect(colors.length, part).toBeGreaterThan(0);
      expect(colors.every(matchesHex(color)), part).toBe(true);
    }
  }, 120_000);
});
