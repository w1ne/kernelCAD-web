// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/farm-machinery/grain-cart.kcad.ts';

const auger = ['auger-base', 'auger-tube'];

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('farm-machinery/grain-cart materials', () => {
  it('paints the unloading auger with the cart, not the exposed-steel hub finish', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'paintedSteelColor', 'rubberColor', 'steelColor',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);

    const painted = asset.palette.find((zone) => zone.name === 'paintedSteelColor');
    const exposed = asset.palette.find((zone) => zone.name === 'steelColor');
    for (const part of auger) {
      expect(painted?.parts).toContain(part);
      expect(exposed?.parts).not.toContain(part);
    }
    expect(exposed?.parts).toContain('wagon-wheel-1-hub');

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

    for (const name of auger) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#397747')), `${name} should use the painted steel`).toBe(true);
    }

    const hub = colorsFor('wagon-wheel-1-hub');
    expect(hub.length).toBeGreaterThan(0);
    expect(hub.every(matches('#929b9b')), 'wheel hub should keep the exposed steel finish').toBe(true);
  }, 120_000);
});
