// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The surface preparation drying rack stands on four wide tray feet. The yard
// finish belongs to those four floor pads, as it does to the base members of the
// other shipyard stands; the uprights, cross bars and panel stops above them stay
// structural steel. Before the fix only one upright carried the yard finish, so
// the rack rendered with one dark upright and bare floor pads.
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/shipyard/surface-prep-drying-rack.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('shipyard/surface-prep-drying-rack floor-pad finish', () => {
  it('gives all four floor pads the yard finish and keeps the rack steel', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'yardPaint', 'structuralSteel',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fresh-coat', 'weathered-yard']);

    const yardPaint = asset.palette.find((zone) => zone.name === 'yardPaint');
    const structuralSteel = asset.palette.find((zone) => zone.name === 'structuralSteel');
    expect(yardPaint?.parts.slice().sort()).toEqual([
      'tray-foot-0', 'tray-foot-1', 'tray-foot-2', 'tray-foot-3',
    ]);
    expect(structuralSteel?.parts).toEqual(expect.arrayContaining([
      'upright-0', 'upright-1', 'upright-2', 'upright-3',
      'crossbar-0', 'crossbar-1', 'crossbar-2', 'crossbar-3',
      'panel-stop-0', 'panel-stop-1', 'panel-stop-2', 'panel-stop-3',
    ]));
    for (const foot of ['tray-foot-0', 'tray-foot-1', 'tray-foot-2', 'tray-foot-3']) {
      expect(structuralSteel?.parts).not.toContain(foot);
    }

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
    const matchesHex = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      );
    };

    for (const [name, expected] of [
      ['tray-foot-0', '#78847c'],
      ['tray-foot-3', '#78847c'],
      ['upright-0', '#b6c1c4'],
      ['upright-3', '#b6c1c4'],
      ['crossbar-1', '#b6c1c4'],
    ] as const) {
      const colors = colorsFor(name);
      expect(colors.length, `${name} should render`).toBeGreaterThan(0);
      expect(colors.every(matchesHex(expected)), `${name} should use ${expected}`).toBe(true);
    }
  }, 120_000);
});
