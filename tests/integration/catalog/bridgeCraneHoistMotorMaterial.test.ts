// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/bridge-crane.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/bridge-crane hoist motor material', () => {
  it('uses the hoist machinery control for the hoist motor', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(4104);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.palette.find((zone) => zone.name === 'hoist')?.parts).toContain('hoist-motor');
    expect(asset.palette.find((zone) => zone.name === 'girder')?.parts).not.toContain('hoist-motor');

    const document = await new NodeIO().readBinary(glb);
    const motor = document.getRoot().listNodes().find((node) => node.getName() === 'hoist-motor');
    const colors = motor?.getMesh()?.listPrimitives().flatMap((primitive) => {
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
    const expected = [0x34, 0x49, 0x5c].map((channel) => channel / 255);
    const matchesHoistFinish = (color: number[]) => expected.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    expect(colors.length, 'hoist-motor should be present in the exported GLB').toBeGreaterThan(0);
    expect(colors.every(matchesHoistFinish), 'hoist-motor should use the #34495c hoist finish').toBe(true);
  }, 120_000);
});
