// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/fiber-splice-closure.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/fiber-splice-closure materials', () => {
  it('renders the closure shell and lid as moulded thermoplastic, not powder-coated steel', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'closureShell', 'polymer', 'powderCoat',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fieldSite', 'highVisibility']);

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

    for (const name of ['shell', 'lid']) {
      const colors = colorsFor(name);
      expect(colors.length, name).toBeGreaterThan(0);
      expect(colors.every(matches('#4f585c')), `${name} should be thermoplastic closure shell`).toBe(true);
      expect(colors.some(matches('#318b96')), `${name} must not be powder-coated steel`).toBe(false);
    }
    const port = colorsFor('port-left');
    expect(port.length).toBeGreaterThan(0);
    expect(port.every(matches('#315267')), 'cable port should stay engineering polymer').toBe(true);
    const foot = colorsFor('mount-foot-left');
    expect(foot.length).toBeGreaterThan(0);
    expect(foot.every(matches('#318b96')), 'mounting foot should stay powder-coated steel').toBe(true);
  }, 120_000);
});
