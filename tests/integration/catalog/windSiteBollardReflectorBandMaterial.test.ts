// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/wind-energy/wind-site-bollard.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('wind-energy/wind-site-bollard reflector band material', () => {
  it('draws the two reflector bands as reflective sheeting on the painted post', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name).sort()).toEqual([
      'concrete', 'reflectiveBand', 'safetyPaint',
    ]);
    expect(asset.params.find((param) => param.name === 'reflectiveBand')?.label).toBe('Reflective sheeting');
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(Object.keys(asset.presets.weathered!)).toContain('reflectiveBand');
    expect(asset.description).not.toMatch(/stainless/i);
    expect(asset.stats.triangles).toBe(188);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const nodeFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      expect(node, `${name} should export`).toBeDefined();
      return node!;
    };
    const colorsFor = (name: string) =>
      nodeFor(name).getMesh()?.listPrimitives().flatMap((primitive) => {
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
    const matches = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      );
    };
    const expectFinish = (names: string[], hex: string, finish: string) => {
      for (const name of names) {
        const colors = colorsFor(name);
        expect(colors.length, `${name} should render`).toBeGreaterThan(0);
        expect(colors.every(matches(hex)), `${name} should use ${finish}`).toBe(true);
      }
    };
    expectFinish(['foot'], '#8b8c84', 'the concrete finish');
    expectFinish(['post', 'cap'], '#efb532', 'the safety paint finish');
    expectFinish(['band-low', 'band-high'], '#d5322c', 'the reflective sheeting finish');

    // GLB is Y up; the post axis is the Y axis.
    const extent = (name: string) => {
      const { min, max } = getBounds(nodeFor(name));
      return { min, max, radius: (max[0]! - min[0]!) / 2 };
    };
    const post = extent('post');
    const cap = extent('cap');
    expect(post.radius).toBeCloseTo(0.055, 4);
    expect(post.max[1]).toBeCloseTo(0.75, 5);

    for (const [name, bottom] of [['band-low', 0.2], ['band-high', 0.51]] as const) {
      const band = extent(name);
      expect(band.min[1], `${name} bottom`).toBeCloseTo(bottom, 5);
      expect(band.max[1]! - band.min[1]!, `${name} should be an 80 mm sheeting band`).toBeCloseTo(0.08, 5);
      expect(band.radius, `${name} should wrap the post`).toBeGreaterThan(post.radius);
      expect(band.radius - post.radius, `${name} should be a thin wrap, not a steel collar`).toBeLessThanOrEqual(0.0031);
      expect(band.radius, `${name} should stay inside the cap`).toBeLessThan(cap.radius);
    }

    const all = getBounds(document.getRoot().listScenes()[0]!);
    expect(all.max[0]! - all.min[0]!).toBeCloseTo(0.22, 3);
    expect(all.max[1]! - all.min[1]!).toBeCloseTo(0.79, 3);
  }, 120_000);
});
