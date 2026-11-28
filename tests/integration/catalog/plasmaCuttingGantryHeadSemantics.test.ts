// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

type Bounds = { min: number[]; max: number[] };
const root = resolve(import.meta.dirname, '../../..');
const file = 'catalog/kits/shipyard/plasma-cutting-gantry-head.kcad.ts';

async function namedBounds(bytes: Uint8Array): Promise<Map<string, Bounds>> {
  const doc = await new NodeIO().readBinary(bytes);
  const result = new Map<string, Bounds>();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const matrix = node.getWorldMatrix();
    const points = mesh.listPrimitives().flatMap((primitive) => {
      const position = primitive.getAttribute('POSITION');
      if (!position) return [];
      return Array.from({ length: position.getCount() }, (_, index) => {
        const point = position.getElement(index, []);
        return [0, 1, 2].map((axis) => 1000 * (matrix[axis]! * point[0]!
          + matrix[axis + 4]! * point[1]! + matrix[axis + 8]! * point[2]! + matrix[axis + 12]!));
      });
    });
    result.set(node.getName(), {
      min: [0, 1, 2].map((axis) => Math.min(...points.map((point) => point[axis]!))),
      max: [0, 1, 2].map((axis) => Math.max(...points.map((point) => point[axis]!))),
    });
  }
  return result;
}

function totalBounds(parts: Map<string, Bounds>): Bounds {
  const all = [...parts.values()];
  return {
    min: [0, 1, 2].map((axis) => Math.min(...all.map((part) => part.min[axis]!))),
    max: [0, 1, 2].map((axis) => Math.max(...all.map((part) => part.max[axis]!))),
  };
}

beforeAll(async () => { await initOcct(); }, 120_000);

describe('shipyard/plasma-cutting-gantry-head semantic scope', () => {
  it('exports the torch head on a short bridge segment, not a complete cutting machine', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, file);
    const parts = await namedBounds(glb);
    const names = [...parts.keys()];
    const all = totalBounds(parts);
    const size = [0, 1, 2].map((axis) => all.max[axis]! - all.min[axis]!);

    expect(asset.id).toBe('plasma-cutting-gantry-head');
    expect(asset.title).toBe('Plasma cutting gantry head');
    expect(asset.description).toContain('short local bridge section');
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.triangleBudget).toBe(1600);
    expect(size[0]).toBeGreaterThan(1300);
    expect(size[0]).toBeLessThan(1500);
    expect(size[1]).toBeGreaterThan(1150);
    expect(size[1]).toBeLessThan(1400);
    expect(size[2]).toBeGreaterThan(500);
    expect(size[2]).toBeLessThan(700);
    expect(all.min[1]).toBeCloseTo(0, 3);

    expect(names).toEqual(expect.arrayContaining([
      'bridge-section',
      'cross-slide-guide-980',
      'torch-carriage-plate',
      'lifter-column',
      'lifter-slide-plate',
      'torch-holder-front',
      'torch-body',
      'torch-shield-cup',
      'torch-nozzle',
      'carrier-link-0',
    ]));
    expect(names.some((name) => /^(table-|slat-|floor-rail|end-carriage|operator-|extraction-)/.test(name))).toBe(false);

    const torch = parts.get('torch-body')!;
    const nozzle = parts.get('torch-nozzle')!;
    expect(torch.max[0]! - torch.min[0]!).toBeLessThan(80);
    expect(torch.max[1]! - torch.min[1]!).toBeGreaterThan(250);
    expect(nozzle.max[1]!).toBeLessThan(torch.max[1]!);

    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name).sort()).toEqual([
      'cablePolymer', 'copperAlloy', 'machinedSteel', 'paintedSteel',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fresh-coat', 'weathered-yard', 'blue-machine']);
    expect(asset.palette.find((zone) => zone.name === 'copperAlloy')?.parts).toContain('torch-nozzle');
  }, 120_000);
});
