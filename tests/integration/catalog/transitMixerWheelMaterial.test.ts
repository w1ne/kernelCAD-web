// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/construction-equipment/transit-mixer-truck.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('construction-equipment/transit-mixer-truck wheel materials', () => {
  it('keeps the six steel wheel rims on the structural-steel control', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    const rimNames = [
      'front-wheel-left-rim',
      'front-wheel-right-rim',
      'rear-wheel-left-0-rim',
      'rear-wheel-left-1-rim',
      'rear-wheel-right-0-rim',
      'rear-wheel-right-1-rim',
    ];

    expect(asset.stats.triangles).toBe(4296);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [8.269668, 3.6, 2.72].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'cabGlassColor', 'equipmentPaintColor', 'drumPaintColor', 'tireRubberColor', 'structuralSteelColor',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    for (const preset of Object.values(asset.presets)) {
      expect(preset).toHaveProperty('structuralSteelColor');
    }

    const steelParts = asset.palette.find((zone) => zone.name === 'structuralSteelColor')?.parts;
    const paintParts = asset.palette.find((zone) => zone.name === 'equipmentPaintColor')?.parts;
    expect(steelParts).toEqual(expect.arrayContaining(rimNames));
    for (const name of rimNames) expect(paintParts).not.toContain(name);

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
    const structuralSteel = [0x89 / 255, 0x96 / 255, 0x9a / 255];
    const matchesStructuralSteel = (color: number[]) => structuralSteel.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const name of rimNames) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matchesStructuralSteel), `${name} should use structural steel`).toBe(true);
    }
  }, 120_000);
});
