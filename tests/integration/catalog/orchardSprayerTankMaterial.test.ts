// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/farm-machinery/orchard-air-blast-sprayer.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('farm-machinery/orchard-air-blast-sprayer tank material', () => {
  it('gives the polyethylene tank its own material control without changing geometry', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(400);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [0.9964, 1.68, 1.78].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'paintedSteelColor', 'tankPolymerColor', 'rubberColor', 'glassColor', 'steelColor',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    for (const preset of Object.values(asset.presets)) {
      expect(preset).toHaveProperty('tankPolymerColor');
    }

    expect(asset.palette.find((zone) => zone.name === 'tankPolymerColor')?.parts).toContain('chemical-tank');
    expect(asset.palette.find((zone) => zone.name === 'paintedSteelColor')?.parts).not.toContain('chemical-tank');
    expect(asset.palette.find((zone) => zone.name === 'paintedSteelColor')?.parts).toEqual(
      expect.arrayContaining(['sprayer-chassis', 'operator-cab']),
    );

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
    const tankPolymer = [0xe7 / 255, 0xea / 255, 0xdf / 255];
    const paintedSteel = [0x39 / 255, 0x77 / 255, 0x47 / 255];
    const matches = (expected: number[]) => (color: number[]) => expected.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const [name, expected] of [
      ['chemical-tank', tankPolymer],
      ['sprayer-chassis', paintedSteel],
    ] as const) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches(expected)), `${name} should keep its material color`).toBe(true);
    }
  }, 120_000);
});
