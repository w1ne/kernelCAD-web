// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/ev-charging-infrastructure/overhead-pantograph-head.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('ev-charging-infrastructure/overhead-pantograph-head contact material', () => {
  it('colours the current-carrying contact rail as copper, not engineering polymer', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(180);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.description).toContain('bare copper contact bar');
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'powderCoat', 'stainlessSteel', 'contactCopper',
    ]);
    expect(asset.presets.fleetReady?.contactCopper).toBe('#c27c48');
    expect(asset.presets.nightService?.contactCopper).toBe('#9a6440');

    const copper = asset.palette.find((zone) => zone.name === 'contactCopper');
    expect(copper?.color).toBe('#b87545');
    expect(copper?.parts).toEqual(['contact-rail']);
    expect(asset.palette.some((zone) => zone.name === 'engineeringPolymer')).toBe(false);

    const document = await new NodeIO().readBinary(glb);
    const rail = document.getRoot().listNodes().find((node) => node.getName() === 'contact-rail');
    const colors = rail?.getMesh()?.listPrimitives().flatMap((primitive) => {
      const vertexColors = primitive.getAttribute('COLOR_0');
      if (vertexColors !== null) {
        return Array.from({ length: vertexColors.getCount() }, (_, index) =>
          vertexColors.getElement(index, []).slice(0, 3).map((channel) =>
            channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055,
          ));
      }
      const material = primitive.getMaterial();
      return material === null ? [] : [material.getBaseColorFactor().slice(0, 3)];
    }) ?? [];
    const expected = [0xb8 / 255, 0x75 / 255, 0x45 / 255];
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every((color) => expected.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    ))).toBe(true);
  }, 120_000);
});
