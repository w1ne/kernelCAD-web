// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/mining/tailings-stack-conveyor.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('mining/tailings-stack-conveyor crawler track materials', () => {
  it('keeps steel track bodies and grousers on the crawler-steel palette', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    const trackParts = [
      'track-0', 'track-1',
      ...Array.from({ length: 9 }, (_, index) => `grouser-0-${index}`),
      ...Array.from({ length: 9 }, (_, index) => `grouser-1-${index}`),
    ];

    expect(asset.stats.triangles).toBe(3792);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [31.303732, 8.344869, 16.150847].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'boomPaint', 'crawlerSteel', 'beltRubber', 'tailings',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'ironTailings', 'coalReject']);

    const crawlerParts = asset.palette.find((zone) => zone.name === 'crawlerSteel')?.parts ?? [];
    expect(crawlerParts).toEqual(expect.arrayContaining(trackParts));
    const rubberParts = asset.palette.find((zone) => zone.name === 'beltRubber')?.parts ?? [];
    expect(rubberParts).toEqual(expect.arrayContaining(['belt-carry', 'head-pulley']));
    expect(rubberParts).not.toEqual(expect.arrayContaining(trackParts));

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
    const crawlerSteel = [0x3a / 255, 0x3f / 255, 0x44 / 255];
    const matchesCrawlerSteel = (color: number[]) => crawlerSteel.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const name of trackParts) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matchesCrawlerSteel), `${name} should use crawler steel`).toBe(true);
    }
  }, 120_000);
});
