// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/mining/crusher-discharge-conveyor.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('mining/crusher-discharge-conveyor idler material roles', () => {
  it('uses frame steel for troughing and return rollers while keeping drive paint on equipment', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(3456);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'frameSteel', 'drivePaint', 'beltRubber', 'ore',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'coalHandling', 'highVisibility']);

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

    const idlers: string[] = [];
    for (let x = 500, index = 0; x <= 3000; x += 500, index++) {
      idlers.push(`impact-idler-${index}-centre`);
      idlers.push(`impact-idler-${index}-wing-0`, `impact-idler-${index}-wing-1`);
    }
    for (let x = 4200, index = 0; x <= 14_000 - 600; x += 1300, index++) {
      idlers.push(`carry-idler-${index}-centre`);
      idlers.push(`carry-idler-${index}-wing-0`, `carry-idler-${index}-wing-1`);
    }
    for (let x = 2000, index = 0; x <= 14_000 - 1000; x += 3000, index++) {
      idlers.push(`return-idler-${index}`);
    }
    expect(idlers).toHaveLength(46);

    for (const name of idlers) {
      const roller = colorsFor(name);
      expect(roller.length, `${name} should render`).toBeGreaterThan(0);
      expect(roller.every(matches('#58646c')), `${name} should use frame steel`).toBe(true);
    }

    for (const name of ['discharge-chute', 'gearbox', 'head-hood', 'belt-cover-0']) {
      const painted = colorsFor(name);
      expect(painted.length, `${name} should render`).toBeGreaterThan(0);
      expect(painted.every(matches('#2f6f4a')), `${name} should keep drive paint`).toBe(true);
    }
  }, 120_000);
});
