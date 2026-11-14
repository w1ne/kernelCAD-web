// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/construction-equipment/asphalt-distributor-truck.kcad.ts';
const sprayParts = ['spray-bar', ...Array.from({ length: 9 }, (_, index) => `spray-nozzle-${index}`)];

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('construction-equipment/asphalt-distributor-truck spray bar material', () => {
  it('keeps the rear spray bar and nozzles in bare steel, separate from the enamel tank and cab', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(1196);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'cabGlassColor', 'equipmentPaintColor', 'tireRubberColor', 'structuralSteelColor',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);

    const steel = asset.palette.find((zone) => zone.name === 'structuralSteelColor');
    const paint = asset.palette.find((zone) => zone.name === 'equipmentPaintColor');
    for (const name of sprayParts) {
      expect(steel?.parts, `${name} should be in the steel zone`).toContain(name);
      expect(paint?.parts, `${name} should not be in the enamel zone`).not.toContain(name);
    }
    expect(paint?.parts).toContain('tank');
    expect(paint?.parts).toContain('site-truck-cab');

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
    const matches = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      );
    };

    for (const name of sprayParts) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#89969a')), `${name} should use the structural steel`).toBe(true);
    }

    for (const name of ['tank', 'site-truck-cab']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#e1a31b')), `${name} should keep the equipment enamel`).toBe(true);
    }
  }, 120_000);
});
