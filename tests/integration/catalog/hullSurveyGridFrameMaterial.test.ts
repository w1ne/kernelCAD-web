// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The two sill rails of the hull survey grid frame stand on the dock and are a
// mirrored pair. One rail carried the yard finish while its twin was left as bare
// steel, so the frame rendered with one dark rail and one light rail. The yard
// finish belongs to both sill rails; the uprights, top rails and cross-reference
// bars stay structural steel.
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/shipyard/hull-survey-grid-frame.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('shipyard/hull-survey-grid-frame sill-rail finish', () => {
  it('gives both mirrored sill rails the yard finish and keeps the frame steel', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'yardPaint', 'structuralSteel',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fresh-coat', 'weathered-yard']);

    const yardPaint = asset.palette.find((zone) => zone.name === 'yardPaint');
    const structuralSteel = asset.palette.find((zone) => zone.name === 'structuralSteel');
    expect(yardPaint?.parts.slice().sort()).toEqual(['frame-rail-0', 'frame-rail-1']);
    expect(structuralSteel?.parts).toEqual(expect.arrayContaining([
      'frame-rail-2', 'frame-rail-3',
      'upright-0', 'upright-1', 'upright-2', 'upright-3',
      'cross-reference-0', 'cross-reference-1', 'cross-reference-2',
    ]));
    expect(structuralSteel?.parts).not.toContain('frame-rail-0');
    expect(structuralSteel?.parts).not.toContain('frame-rail-1');

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
      ['frame-rail-0', '#6e817a'],
      ['frame-rail-1', '#6e817a'],
      ['frame-rail-2', '#b6c1c4'],
      ['upright-3', '#b6c1c4'],
      ['cross-reference-1', '#b6c1c4'],
    ] as const) {
      const colors = colorsFor(name);
      expect(colors.length, `${name} should render`).toBeGreaterThan(0);
      expect(colors.every(matchesHex(expected)), `${name} should use ${expected}`).toBe(true);
    }
  }, 120_000);
});
