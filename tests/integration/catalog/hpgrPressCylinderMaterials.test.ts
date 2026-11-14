// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/mining/high-pressure-grinding-rolls.kcad.ts';

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

describe('mining/high-pressure-grinding-rolls materials', () => {
  it('paints the press-cylinder barrels and keeps only the piston rods chrome', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.find((param) => param.name === 'structuralSteel'))
      .toMatchObject({ default: '#4b5459', label: 'Drive, cylinder barrel and bin steel' });

    const steelParts = asset.palette.find((zone) => zone.name === 'structuralSteel')?.parts ?? [];
    const barrels = ['press-cylinder-0-0', 'press-cylinder-0-1', 'press-cylinder-1-0', 'press-cylinder-1-1'];
    for (const barrel of barrels) expect(steelParts).toContain(barrel);

    const document = await new NodeIO().readBinary(glb);
    for (const part of barrels) {
      const colors = readNodeColors(document, part);
      expect(colors.length, part).toBeGreaterThan(0);
      expect(colors.every(matchesHex('#4b5459')), part).toBe(true);
    }
    for (const part of ['press-cylinder-rod-0-0', 'press-cylinder-rod-1-1', 'roll-shaft-0']) {
      const colors = readNodeColors(document, part);
      expect(colors.length, part).toBeGreaterThan(0);
      expect(colors.every(matchesHex('#c3cacc')), part).toBe(true);
    }
  }, 120_000);
});
