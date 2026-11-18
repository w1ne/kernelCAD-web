// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/horizontal-pressure-vessel.kcad.ts';
const pressureBoundaryParts = ['left-head', 'right-head', 'top-port-0', 'top-port-1'];

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

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/horizontal-pressure-vessel materials', () => {
  it('uses steel for the heads and carbon-steel nozzle necks', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(468);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);

    const steelParts = asset.palette.find((zone) => zone.name === 'steel')?.parts ?? [];
    const safetyPaintParts = asset.palette.find((zone) => zone.name === 'safetyPaint')?.parts ?? [];
    for (const part of pressureBoundaryParts) {
      expect(steelParts, part).toContain(part);
      expect(safetyPaintParts, part).not.toContain(part);
    }

    const document = await new NodeIO().readBinary(glb);
    const steel = parseHex('#607986');
    const matchesSteel = (color: number[]) => steel.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );
    for (const part of pressureBoundaryParts) {
      const colors = readNodeColors(document, part);
      expect(colors.length, part).toBeGreaterThan(0);
      expect(colors.every(matchesSteel), part).toBe(true);
    }
  }, 120_000);
});
