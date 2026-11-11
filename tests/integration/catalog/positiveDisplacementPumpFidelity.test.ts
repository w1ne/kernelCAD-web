// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/positive-displacement-pump.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/positive-displacement-pump', () => {
  it('exports a recognizable gear-pump package with both ports, service cover and relief bypass', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 5);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'motorPaint', 'safetyPaint',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(asset.palette.find((zone) => zone.name === 'motorPaint')?.parts).toEqual(
      expect.arrayContaining(['motor-frame', 'motor-fan-cowl', 'motor-terminal-box']),
    );

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const node = (name: string) => nodes.find((candidate) => candidate.getName() === name);
    const bounds = (name: string): { min: number[]; max: number[] } => {
      const candidate = node(name);
      const mesh = candidate?.getMesh();
      if (candidate === undefined || mesh === null || mesh === undefined) {
        throw new Error(`Missing exported catalog part: ${name}`);
      }
      const world = candidate.getWorldMatrix();
      const points = mesh.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION');
        if (position === null) return [];
        return Array.from({ length: position.getCount() }, (_, index) => {
          const point = position.getElement(index, []);
          return [
            world[0]! * point[0]! + world[4]! * point[1]! + world[8]! * point[2]! + world[12]!,
            world[1]! * point[0]! + world[5]! * point[1]! + world[9]! * point[2]! + world[13]!,
            world[2]! * point[0]! + world[6]! * point[1]! + world[10]! * point[2]! + world[14]!,
          ];
        });
      });
      return {
        min: [0, 1, 2].map((axis) => Math.min(...points.map((point) => point[axis]!))),
        max: [0, 1, 2].map((axis) => Math.max(...points.map((point) => point[axis]!))),
      };
    };
    const dimensions = (name: string) => {
      const box = bounds(name);
      return [0, 1, 2].map((axis) => box.max[axis]! - box.min[axis]!).sort((a, b) => a - b);
    };

    for (const name of [
      'motor-frame', 'coupling-guard', 'gear-pump-case', 'pump-service-cover',
      'suction-nozzle', 'suction-flange', 'discharge-nozzle', 'discharge-flange',
      'pressure-relief-valve', 'pressure-relief-cap', 'relief-branch', 'bypass-return-drop',
    ]) {
      expect(node(name)?.getMesh(), `expected exported mesh for ${name}`).toBeDefined();
    }
    expect(nodes.filter((candidate) => /^cover-bolt-\d$/.test(candidate.getName()))).toHaveLength(8);

    // GLB is metres and Y-up: the cover is a thin, broad service plate; both
    // nozzles rise vertically from the head and terminate in wider flanges.
    const cover = dimensions('pump-service-cover');
    expect(cover[0]).toBeLessThan(0.025);
    expect(cover[1]).toBeGreaterThan(0.17);
    expect(cover[2]).toBeGreaterThan(0.17);
    for (const name of ['suction-nozzle', 'discharge-nozzle']) {
      const nozzle = dimensions(name);
      expect(nozzle[0]).toBeGreaterThan(0.05);
      expect(nozzle[0]).toBeLessThan(0.07);
      expect(nozzle[1]).toBeLessThan(0.08);
      expect(nozzle[2]).toBeLessThan(0.08);
    }
    for (const name of ['suction-flange', 'discharge-flange']) {
      const flange = dimensions(name);
      expect(flange[0]).toBeGreaterThan(0.012);
      expect(flange[1]).toBeGreaterThan(0.09);
      expect(flange[2]).toBeGreaterThan(0.09);
    }
  }, 120_000);
});
