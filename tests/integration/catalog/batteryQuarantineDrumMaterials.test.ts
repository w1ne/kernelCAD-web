// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/recycling-facility/battery-quarantine-drum.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('recycling-facility/battery-quarantine-drum materials', () => {
  it('keeps the vermiculite sack kraft beige and separate from the alarm paint', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'drum', 'ring', 'tray', 'alarm',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['lithiumBlue', 'leadAcidBlack', 'weathered']);

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
    const sackColors = colorsFor('sack');
    const sackTopColors = colorsFor('sack-top');
    const alarmColors = colorsFor('alarm-box');
    const kraftPaper = [0xb8 / 255, 0xa4 / 255, 0x7d / 255];
    const matches = (color: number[]) => kraftPaper.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.01,
    );

    expect(sackColors.length).toBeGreaterThan(0);
    expect(sackColors.every(matches)).toBe(true);
    expect(sackTopColors.length).toBeGreaterThan(0);
    expect(sackTopColors.every(matches)).toBe(true);
    expect(alarmColors.length).toBeGreaterThan(0);
    expect(alarmColors.every((color) => !matches(color))).toBe(true);
  }, 120_000);
});
