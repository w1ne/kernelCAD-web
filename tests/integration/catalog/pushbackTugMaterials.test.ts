// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/airfield/pushback-tug.kcad.ts';

const parseHex = (hex: string) => [0, 1, 2].map((index) =>
  Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255,
);

const colorsFor = (document: Awaited<ReturnType<NodeIO['readBinary']>>, name: string) => {
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

describe('airfield/pushback-tug materials', () => {
  it('uses steel for the rigid nose-wheel cradle and rubber only for the four tyres', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(272);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);

    const steelParts = asset.palette.find((zone) => zone.name === 'stainlessSteel')?.parts ?? [];
    const rubberParts = asset.palette.find((zone) => zone.name === 'rubber')?.parts ?? [];
    expect(steelParts).toContain('nose-wheel-cradle');
    expect([...rubberParts].sort()).toEqual(['wheel-1-left', 'wheel-1-right', 'wheel-2-left', 'wheel-2-right']);

    const document = await new NodeIO().readBinary(glb);
    for (const [part, color] of [
      ['nose-wheel-cradle', '#a9b4b6'],
      ['wheel-1-left', '#282e31'],
      ['wheel-2-right', '#282e31'],
    ] as const) {
      const colors = colorsFor(document, part);
      expect(colors.length, `expected exported colors for ${part}`).toBeGreaterThan(0);
      expect(colors.every(matchesHex(color)), part).toBe(true);
    }
  }, 120_000);
});
