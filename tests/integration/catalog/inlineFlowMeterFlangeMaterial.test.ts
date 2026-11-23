// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/inline-flow-meter.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/inline-flow-meter flange material', () => {
  it('keeps both process flanges on the same steel finish as the pipe run', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'safetyPaint', 'gaugeGlass',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);

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
    const steel = [0x6e / 255, 0x7e / 255, 0x84 / 255];
    const matchesSteel = (color: number[]) => steel.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const name of ['flange--1', 'flange-1']) {
      const colors = colorsFor(name);
      expect(colors.length, `${name} should render`).toBeGreaterThan(0);
      expect(colors.every(matchesSteel), `${name} should use the steel finish`).toBe(true);
    }
  }, 120_000);
});
