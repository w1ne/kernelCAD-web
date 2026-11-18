// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/grounding-bar.kcad.ts';
const terminals = Array.from({ length: 6 }, (_, index) => `terminal-${index}`);

const parseHex = (hex: string): number[] => [0, 1, 2].map((index) =>
  Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255,
);

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/grounding-bar materials', () => {
  it('colours the busbar as copper and the terminal studs as stainless steel', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(300);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.map((param) => param.name)).not.toContain('galvanizedSteel');
    expect(asset.presets).toMatchObject({
      fieldSite: { copper: '#a96d37', stainlessSteel: '#b4bcbc' },
      highVisibility: { copper: '#c4823c', stainlessSteel: '#e2e8e9' },
    });

    const zone = (name: string) => asset.palette.find((entry) => entry.name === name)?.parts ?? [];
    expect(zone('copper')).toEqual(['rail']);
    expect([...zone('stainlessSteel')].sort()).toEqual(terminals);
    expect([...zone('polymer')].sort()).toEqual(['insulator-left', 'insulator-right']);

    const nodes = (await new NodeIO().readBinary(glb)).getRoot().listNodes();
    const colorsOf = (partName: string): number[][] => {
      const node = nodes.find((candidate) => candidate.getName() === partName);
      expect(node, `expected exported node ${partName}`).toBeDefined();
      return node?.getMesh()?.listPrimitives().flatMap((primitive) => {
        const vertexColors = primitive.getAttribute('COLOR_0');
        if (vertexColors !== null) {
          return Array.from({ length: vertexColors.getCount() }, (_, index) =>
            vertexColors.getElement(index, []).slice(0, 3).map((channel) =>
              channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055,
            ),
          );
        }
        const material = primitive.getMaterial();
        return material === null ? [] : [material.getBaseColorFactor().slice(0, 3)];
      }) ?? [];
    };
    const expectColor = (partName: string, hex: string) => {
      const expected = parseHex(hex);
      const colors = colorsOf(partName);
      expect(colors.length, `expected exported colors for ${partName}`).toBeGreaterThan(0);
      expect(
        colors.every((color) => expected.every((channel, index) => Math.abs(channel - color[index]!) < 0.015)),
        `${partName} should match ${hex}`,
      ).toBe(true);
    };

    expectColor('rail', '#c27836');
    for (const terminal of terminals) expectColor(terminal, '#d2dbdc');
  }, 120_000);
});
