// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/shipyard/hull-panel-turnover-cradle.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('shipyard/hull-panel-turnover-cradle materials', () => {
  it('keeps the matching end frames on the same yard-finish control', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBe(420);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [2.18, 1.76, 1.76].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'yardPaint', 'structuralSteel',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fresh-coat', 'weathered-yard']);
    for (const preset of Object.values(asset.presets)) {
      expect(preset).toHaveProperty('yardPaint');
      expect(preset).toHaveProperty('structuralSteel');
    }

    expect(asset.palette.find((zone) => zone.name === 'yardPaint')?.parts).toEqual(
      expect.arrayContaining(['end-frame-0', 'end-frame-1']),
    );
    expect(asset.palette.find((zone) => zone.name === 'structuralSteel')?.parts).not.toContain('end-frame-1');

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
    const yardFinish = [0x70 / 255, 0x83 / 255, 0x7d / 255];
    const matchesYardFinish = (color: number[]) => yardFinish.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const name of ['end-frame-0', 'end-frame-1']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matchesYardFinish), `${name} should use the yard finish`).toBe(true);
    }
  }, 120_000);
});
