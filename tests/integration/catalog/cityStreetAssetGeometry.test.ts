// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const root = resolve(import.meta.dirname, '../../..');
type Point = [number, number, number];
async function geometry(id: string) {
  const { asset, glb } = await buildCatalogAssetWithGlb(root, 'catalog/kits/city-street/' + id + '.kcad.ts');
  expect(asset.stats.minUpM).toBeCloseTo(0, 6);
  expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
  const nodes = (await new NodeIO().readBinary(glb)).getRoot().listNodes();
  const vertices = (name: string): Point[] => {
    const node = nodes.find((n) => n.getName() === name);
    const mesh = node?.getMesh();
    if (!node || !mesh) throw new Error('Missing geometry ' + name);
    const world = node.getWorldMatrix();
    return mesh.listPrimitives().flatMap((primitive) => {
      const pos = primitive.getAttribute('POSITION');
      if (!pos) throw new Error('Missing vertices ' + name);
      return Array.from({ length: pos.getCount() }, (_, index): Point => {
        const p = pos.getElement(index, []);
        return [0, 1, 2].map((i) => world[i]! * p[0]! + world[i + 4]! * p[1]!
          + world[i + 8]! * p[2]! + world[i + 12]!) as Point;
      });
    });
  };
  const bounds = (name: string) => {
    const p = vertices(name);
    return [0, 1, 2].map((i) => ({ min: Math.min(...p.map((v) => v[i]!)), max: Math.max(...p.map((v) => v[i]!)) }));
  };
  return { vertices, bounds };
}

beforeAll(async () => { await initOcct(); }, 120_000);

describe('city-street scene geometry', () => {
  it('shows the default 10:10 clockwise on both clock faces', async () => {
    const { bounds } = await geometry('street-clock');
    const centerX = (name: string) => {
      const x = bounds(name)[0]!;
      return (x.min + x.max) / 2;
    };
    expect(centerX('minute-front')).toBeGreaterThan(0.08);
    expect(centerX('hour-front')).toBeLessThan(-0.04);
    expect(centerX('minute-back')).toBeLessThan(-0.08);
    expect(centerX('hour-back')).toBeGreaterThan(0.04);
  }, 120_000);

  it('angles utility braces upward toward the outer crossarm', async () => {
    const { vertices, bounds } = await geometry('utility-pole');
    for (const index of [1, 2]) {
      const arm = bounds('arm-' + index);
      for (const [side, sign] of [['l', -1], ['r', 1]] as const) {
        const name = 'brace-' + index + '-' + side;
        const points = vertices(name).sort((a, b) => a[1] - b[1]);
        const low = points[0]!;
        const high = points.at(-1)!;
        expect(sign * high[0]).toBeGreaterThan(0.6);
        expect(Math.abs(low[0])).toBeLessThan(0.06);
        expect(high[1]).toBeGreaterThan(arm[1]!.min);
        expect(bounds(name)[2]!.max).toBeGreaterThan(arm[2]!.min);
        expect(bounds(name)[2]!.min).toBeLessThan(arm[2]!.max);
      }
    }
  }, 120_000);

  it('brings each scaffold brace into the post plane and each toe board into its deck', async () => {
    const { bounds } = await geometry('scaffolding-section');
    const post = bounds('standard-2');
    for (const i of [1, 2]) {
      const brace = bounds('brace-' + i);
      expect(brace[2]!.max).toBeGreaterThan(post[2]!.min);
      expect(brace[2]!.min).toBeLessThan(post[2]!.max);
      const toe = bounds('toe-board-' + i);
      const plank = bounds('plank-' + i + '-1');
      expect(toe[2]!.max).toBeGreaterThan(plank[2]!.min);
      expect(toe[2]!.min).toBeLessThan(plank[2]!.max);
      expect(toe[1]!.min).toBeCloseTo(plank[1]!.min, 6);
    }
  }, 120_000);
});
