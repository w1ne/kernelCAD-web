// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/postal-logistics/postage-meter-workstation.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('postal-logistics/postage-meter-workstation materials', () => {
  it('draws the label tape roll as paper, not painted steel', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'paintedSteel', 'labelPaper', 'polymer', 'structuralSteel', 'stainlessSteel',
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
    const matches = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      );
    };

    const roll = colorsFor('paper-roll');
    expect(roll.length).toBeGreaterThan(0);
    expect(roll.every(matches('#ece7da')), 'paper-roll should be label tape paper').toBe(true);
    for (const name of ['countertop', 'display', 'scale-platform', 'lower-door']) {
      const part = colorsFor(name);
      expect(part.length).toBeGreaterThan(0);
      expect(part.every(matches('#617780')), `${name} should keep painted steel`).toBe(true);
    }
    for (const [name, hex] of [['cabinet', '#477c8e'], ['meter-base', '#58656c'], ['meter-head', '#bbc4c4']] as const) {
      const part = colorsFor(name);
      expect(part.length).toBeGreaterThan(0);
      expect(part.every(matches(hex)), `${name} should keep ${hex}`).toBe(true);
    }
  }, 120_000);
});
