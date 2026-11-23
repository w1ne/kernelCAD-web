// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/guy-wire-mast-anchor.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/guy-wire-mast-anchor anchor material', () => {
  it('sets the guys in concrete deadman blocks on a concrete pier, not on steel slabs', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(Object.keys(asset.presets)).toEqual(['fieldSite', 'highVisibility']);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const names = nodes.map((node) => node.getName());
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
    const expectFinish = (partNames: string[], hex: string, finish: string) => {
      for (const name of partNames) {
        const colors = colorsFor(name);
        expect(colors.length, `${name} should render`).toBeGreaterThan(0);
        expect(colors.every(matches(hex)), `${name} should use ${finish}`).toBe(true);
      }
    };

    // Guy anchors and the mast footing are cast concrete, not loose steel slabs or painted steel.
    expect(names, 'no galvanized steel slab may stand in for a guy anchor').not.toContain('anchor-a');
    for (const name of ['anchor-b', 'anchor-c', 'base']) expect(names).not.toContain(name);
    const ids = ['a', 'b', 'c'];
    expectFinish(['pier', ...ids.map((id) => `deadman-${id}`)], '#a5a29a', 'the concrete finish');
    expectFinish(
      ['mast', 'base-plate', 'guy-band', ...ids.flatMap((id) => [`anchor-rod-${id}`, `turnbuckle-${id}`, `guy-${id}`])],
      '#77868d',
      'the galvanized finish',
    );
    expectFinish(ids.map((id) => `guy-guard-${id}`), '#e3b21b', 'the yellow guy guard');

    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort()).toEqual(['concrete', 'galvanizedSteel', 'guyGuard']);

    // World-space bounds in metres of a node's mesh (mm Z-up -> m Y-up).
    const bounds = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name)!;
      const m = node.getWorldMatrix();
      const points = node.getMesh()!.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION')!;
        return Array.from({ length: position.getCount() }, (_, index) => {
          const [x, y, z] = position.getElement(index, []) as [number, number, number];
          return [0, 1, 2].map((axis) => m[axis]! * x + m[4 + axis]! * y + m[8 + axis]! * z + m[12 + axis]!);
        });
      });
      return [0, 1, 2].map((axis) => {
        const values = points.map((point) => point[axis]!);
        return [Math.min(...values), Math.max(...values)];
      });
    };
    const pier = bounds('pier');
    expect(pier[1]![0], 'the pier should stand on the ground').toBeCloseTo(0, 3);
    expect(bounds('base-plate')[1]![0], 'the base plate should sit on the pier').toBeCloseTo(pier[1]![1], 3);
    const band = bounds('guy-band');
    for (const id of ids) {
      const block = bounds(`deadman-${id}`);
      const rod = bounds(`anchor-rod-${id}`);
      const guy = bounds(`guy-${id}`);
      // The anchor rod rises out of the deadman top; the guy reaches the mast-head band.
      expect(Math.abs(rod[1]![0] - block[1]![1]), `anchor-rod-${id} should start at the deadman top`).toBeLessThan(0.01);
      for (const axis of [0, 2]) {
        expect(rod[axis]![0], `anchor-rod-${id} should start over its deadman`).toBeGreaterThan(block[axis]![0]);
        expect(rod[axis]![1], `anchor-rod-${id} should start over its deadman`).toBeLessThan(block[axis]![1]);
      }
      expect(guy[1]![1], `guy-${id} should reach the mast-head band`).toBeGreaterThan(band[1]![0]);
      expect(guy[1]![1], `guy-${id} should reach the mast-head band`).toBeLessThan(band[1]![1] + 0.01);
      expect(bounds(`turnbuckle-${id}`)[1]![0], `turnbuckle-${id} should sit above the rod foot`).toBeGreaterThan(rod[1]![0]);
    }

    expect(asset.description).toMatch(/anchor rods set in concrete deadman blocks/i);
  }, 120_000);
});
