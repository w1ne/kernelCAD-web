// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/water-treatment/equalization-basin.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('water-treatment/equalization-basin materials', () => {
  it('uses concrete for the basin structure and stainless steel for the mixer', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);

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
    const matchesHex = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      );
    };
    const isConcrete = matchesHex('#b8b1a1');
    const isStainlessSteel = matchesHex('#b5c0c0');

    for (const part of ['floor', 'wall-front', 'wall-back', 'wall-left', 'wall-right']) {
      const colors = colorsFor(part);
      expect(colors.length, `${part} should render`).toBeGreaterThan(0);
      expect(colors.every(isConcrete), `${part} should use the concrete finish`).toBe(true);
    }

    for (const part of ['mixer-pedestal', 'mixer-arm', 'mixer-hub']) {
      const colors = colorsFor(part);
      expect(colors.length, `${part} should render`).toBeGreaterThan(0);
      expect(colors.every(isStainlessSteel), `${part} should use the stainless-steel finish`).toBe(true);
    }
  }, 120_000);
});
