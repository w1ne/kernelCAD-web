// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/solar-energy/pad-mount-transformer.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('solar-energy/pad-mount-transformer materials', () => {
  it('paints the radiator fins with the tank powder coat and keeps stainless steel on the bushing hardware', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'concrete', 'powderCoat', 'stainlessSteel', 'ceramic',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fieldService', 'highVisibility']);

    const fins = Array.from({ length: 9 }, (_, index) => [
      `radiator-fin-front-${index}`, `radiator-fin-back-${index}`,
    ]).flat();
    const coat = asset.palette.find((zone) => zone.name === 'powderCoat');
    expect(coat?.parts).toContain('transformer-tank');
    expect(coat?.parts).toEqual(expect.arrayContaining(fins));
    const steel = asset.palette.find((zone) => zone.name === 'stainlessSteel');
    expect(steel?.parts.filter((part) => part.startsWith('radiator-fin'))).toEqual([]);
    expect(steel?.parts).toEqual(expect.arrayContaining(['bushing-base-0', 'bushing-cap-0', 'lifting-lug-left']));

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

    for (const name of ['transformer-tank', ...fins]) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#687c7c')), `${name} should use the tank powder coat`).toBe(true);
    }

    for (const name of ['bushing-base-0', 'bushing-cap-0', 'lifting-lug-left']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#c3caca')), `${name} should keep the stainless-steel finish`).toBe(true);
    }
  }, 120_000);
});
