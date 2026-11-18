// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/pipe-rack-bay.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/pipe-rack-bay materials', () => {
  it('keeps the structural frame steel while retaining safety paint on the marked utility line', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(360);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'safetyPaint',
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

    for (const part of [
      'crossbeam--1', 'crossbeam-1', 'support-column--1', 'support-column-1',
      'baseplate--1', 'baseplate-1', 'brace--1', 'brace-1',
    ]) {
      const colors = colorsFor(part);
      expect(colors.length, `${part} should render`).toBeGreaterThan(0);
      expect(colors.every(matches('#707d84')), `${part} should use structural steel`).toBe(true);
    }

    for (const part of ['pipe-run-1', 'pipe-flange-1']) {
      const colors = colorsFor(part);
      expect(colors.length, `${part} should render`).toBeGreaterThan(0);
      expect(colors.every(matches('#e2a844')), `${part} should retain safety paint`).toBe(true);
    }
  }, 120_000);
});
