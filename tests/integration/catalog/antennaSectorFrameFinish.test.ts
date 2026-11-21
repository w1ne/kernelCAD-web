// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/antenna-sector-frame.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/antenna-sector-frame brace finish and triangular layout', () => {
  it('builds a galvanized triangular frame whose top and bottom braces share one finish', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(Object.keys(asset.presets)).toEqual(['fieldSite', 'highVisibility']);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const colorsFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      expect(node, `${name} should export`).toBeDefined();
      return node!.getMesh()?.listPrimitives().flatMap((primitive) => {
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
    const expectFinish = (names: string[], hex: string, finish: string) => {
      for (const name of names) {
        const colors = colorsFor(name);
        expect(colors.length, `${name} should render`).toBeGreaterThan(0);
        expect(colors.every(matches(hex)), `${name} should use ${finish}`).toBe(true);
      }
    };
    // Every brace at both levels is part of the one welded, hot-dip galvanized frame.
    const braces = nodes.map((node) => node.getName()).filter((name) => /^(top|bottom)/.test(name));
    expectFinish(braces, '#77868d', 'the galvanized finish');
    expect(braces.sort()).toEqual([
      'bottom-brace-ab', 'bottom-brace-bc', 'bottom-brace-ca',
      'top-brace-ab', 'top-brace-bc', 'top-brace-ca',
    ]);
    expectFinish(['rail-a', 'rail-b', 'rail-c', 'mid-brace-bc', 'mount-arm'], '#77868d', 'the galvanized finish');
    expectFinish(['pipe-cap-a', 'pipe-cap-b', 'pipe-cap-c'], '#22282b', 'the polymer cap colour');
    expectFinish(['clamp'], '#d2dbdc', 'the stainless clamp finish');

    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort()).toEqual(['galvanizedSteel', 'polymer', 'stainlessSteel']);

    // Horizontal centre in metres of a node's mesh after its world matrix (mm Z-up -> m Y-up).
    const planCentre = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name)!;
      const m = node.getWorldMatrix();
      const points = node.getMesh()!.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION')!;
        return Array.from({ length: position.getCount() }, (_, index) => {
          const [x, y, z] = position.getElement(index, []) as [number, number, number];
          return [m[0]! * x + m[4]! * y + m[8]! * z + m[12]!, m[2]! * x + m[6]! * y + m[10]! * z + m[14]!];
        });
      });
      const xs = points.map((point) => point[0]!);
      const zs = points.map((point) => point[1]!);
      return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
    };
    const [a, b, c] = ['rail-a', 'rail-b', 'rail-c'].map(planCentre) as [number[], number[], number[]];
    const side = (p: number[], q: number[]) => Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!);
    // Equilateral triangle on a 0.26 m circumradius: each side is 0.26 * sqrt(3) = 0.450 m.
    for (const length of [side(a, b), side(b, c), side(c, a)]) {
      expect(length, 'rails should stand at the corners of an equilateral triangle').toBeCloseTo(0.26 * Math.sqrt(3), 2);
    }

    expect(asset.stats.triangles).toBe(372);
    expect(asset.description).toMatch(/three galvanized mounting pipes at the corners of a triangle, joined by galvanized top and bottom braces/i);
  }, 120_000);
});
