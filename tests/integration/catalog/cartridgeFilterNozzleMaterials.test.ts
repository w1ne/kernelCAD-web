// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/cartridge-filter-housing.kcad.ts';
const pressureParts = ['shell', 'top-nozzle', 'side-nozzle', 'side-flange'];
const paintedParts = ['roof-lip', 'stiffener-0', 'ladder-left-rail'];

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

const matches = (hex: string) => (color: number[]) => parseHex(hex).every((channel, index) =>
  Math.abs(channel - color[index]!) < 0.015,
);

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/cartridge-filter-housing materials', () => {
  it('keeps the inlet and outlet nozzles in the same steel as the shell and flange', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);

    const steelZone = asset.palette.find((zone) => zone.name === 'steel')?.parts ?? [];
    const paintZone = asset.palette.find((zone) => zone.name === 'safetyPaint')?.parts ?? [];
    for (const part of pressureParts) {
      expect(steelZone, part).toContain(part);
      expect(paintZone, part).not.toContain(part);
    }
    for (const part of paintedParts) expect(paintZone, part).toContain(part);

    const document = await new NodeIO().readBinary(glb);
    for (const [parts, hex] of [[pressureParts, '#71848a'], [paintedParts, '#e6b24f']] as const) {
      for (const part of parts) {
        const colors = readNodeColors(document, part);
        expect(colors.length, part).toBeGreaterThan(0);
        expect(colors.every(matches(hex)), part).toBe(true);
      }
    }
  }, 120_000);
});
