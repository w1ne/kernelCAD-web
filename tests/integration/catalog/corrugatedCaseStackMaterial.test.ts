// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/beverage-bottling-line/corrugated-case-stack.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('beverage-bottling-line/corrugated-case-stack materials', () => {
  it('renders the corrugated cases as board, not stainless steel', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'corrugatedBoard', 'edgeBoard', 'labelPaper',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['sanitaryLine', 'legacyPlant']);

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

    const cases = [0, 1, 2, 3, 4].flatMap((index) => [
      `case-${index}-body`, `case-${index}-flap-front`, `case-${index}-flap-back`,
    ]);
    for (const name of cases) {
      const part = colorsFor(name);
      expect(part.length).toBeGreaterThan(0);
      expect(part.every(matches('#b18a5d')), `${name} should be corrugated board`).toBe(true);
    }
    for (const name of ['corner-protector-left', 'corner-protector-right']) {
      const part = colorsFor(name);
      expect(part.length).toBeGreaterThan(0);
      expect(part.every(matches('#8a6a48')), `${name} should be paperboard`).toBe(true);
    }
    const label = colorsFor('stack-label');
    expect(label.length).toBeGreaterThan(0);
    expect(label.every(matches('#ece6d6')), 'stack-label should be paper').toBe(true);
  }, 120_000);
});
