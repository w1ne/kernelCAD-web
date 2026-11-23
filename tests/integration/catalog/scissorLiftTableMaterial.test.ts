// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/scissor-lift-table.kcad.ts';
const armNames = ['scissor-arm-a--1', 'scissor-arm-b--1', 'scissor-arm-a-1', 'scissor-arm-b-1'];

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/scissor-lift-table arm materials', () => {
  it('uses the structural-steel finish for all four scissor arms', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(196);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.palette.find((zone) => zone.name === 'steel')?.parts)
      .toEqual(expect.arrayContaining(armNames));
    const safetyPaintParts = asset.palette.find((zone) => zone.name === 'safetyPaint')?.parts ?? [];
    expect(armNames.filter((name) => safetyPaintParts.includes(name))).toEqual([]);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const expectedSteel = [0x6d, 0x7c, 0x82].map((channel) => channel / 255);
    const matchesSteel = (color: number[]) => expectedSteel.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const name of armNames) {
      const node = nodes.find((candidate) => candidate.getName() === name);
      expect(node, `${name} should be present in the exported GLB`).toBeDefined();
      const colors = node?.getMesh()?.listPrimitives().flatMap((primitive) => {
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

      expect(colors.length, `${name} should have exported color data`).toBeGreaterThan(0);
      expect(colors.every(matchesSteel), `${name} should use the #6d7c82 steel finish`).toBe(true);
    }
  }, 120_000);
});
