// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/water-treatment/vertical-turbine-pump.kcad.ts';
const motorParts = [
  'motor-housing',
  ...Array.from({ length: 6 }, (_, index) => `motor-cooling-rib-${index + 1}`),
  'motor-fan-cowl',
  'terminal-box',
];

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

describe('water-treatment/vertical-turbine-pump motor finish', () => {
  it('keeps the motor cooling ribs on the motor finish control', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(2276);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'coatedSteel', 'structuralSteel', 'stainlessSteel', 'motorFinish',
    ]);
    expect(asset.presets.highVisibility).toMatchObject({ motorFinish: '#386b87' });

    const motorFinish = asset.palette.find((zone) => zone.name === 'motorFinish')?.parts ?? [];
    const structuralSteel = asset.palette.find((zone) => zone.name === 'structuralSteel')?.parts ?? [];
    expect(motorFinish).toEqual(expect.arrayContaining(motorParts));
    expect(structuralSteel).not.toEqual(expect.arrayContaining(motorParts.slice(1, 7)));

    const document = await new NodeIO().readBinary(glb);
    for (const part of motorParts) {
      const colors = readNodeColors(document, part);
      expect(colors.length, `${part} should be exported`).toBeGreaterThan(0);
      expect(colors.every(matches('#477d9b')), `${part} should use motorFinish`).toBe(true);
    }
  }, 120_000);
});
