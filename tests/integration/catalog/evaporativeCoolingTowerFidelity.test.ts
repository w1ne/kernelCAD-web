// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/evaporative-cooling-tower.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/evaporative-cooling-tower', () => {
  it('exports eight broad, separately named fan blades around the two top-deck hubs', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 5);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'safetyPaint', 'fanBlades',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(asset.presets.weathered).toHaveProperty('fanBlades');
    expect(asset.presets.highVisibility).toHaveProperty('fanBlades');
    expect(asset.palette.find((zone) => zone.name === 'fanBlades')?.parts).toEqual(
      expect.arrayContaining(['fan-blade-0-0', 'fan-blade-1-3']),
    );

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const bladeNodes = nodes.filter((node) => /^fan-blade-[01]-[0-3]$/.test(node.getName()));
    expect(bladeNodes).toHaveLength(8);
    expect(nodes.filter((node) => /^fan-hub-[01]$/.test(node.getName()))).toHaveLength(2);
    expect(nodes.filter((node) => /^fan-shroud-[01]$/.test(node.getName()))).toHaveLength(2);

    const positionsFor = (nodeName: string): [number, number, number][] => {
      const node = nodes.find((candidate) => candidate.getName() === nodeName);
      const mesh = node?.getMesh();
      if (node === undefined || mesh === null || mesh === undefined) {
        throw new Error(`Missing exported catalog part: ${nodeName}`);
      }
      const world = node.getWorldMatrix();
      return mesh.listPrimitives().flatMap((primitive) => {
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
    };

    // GLB coordinates are metres and Y-up. Each blade reaches near the fan
    // shroud's 106 mm inside radius and intersects the 986 mm hub top.
    for (let fan = 0; fan < 2; fan++) {
      const centerX = fan === 0 ? -0.121 : 0.121;
      const orientations = new Set<number>();
      for (let blade = 0; blade < 4; blade++) {
        const points = positionsFor(`fan-blade-${fan}-${blade}`);
        expect(points.length).toBeGreaterThan(0);
        const radius = Math.max(...points.map(([x, , z]) => Math.hypot(x - centerX, z)));
        expect(radius).toBeGreaterThan(0.097);
        expect(radius).toBeLessThan(0.108);
        const heights = points.map(([, y]) => y);
        expect(Math.min(...heights)).toBeCloseTo(0.979, 3);
        expect(Math.max(...heights)).toBeCloseTo(0.987, 3);
        const centroidX = points.reduce((sum, [x]) => sum + x, 0) / points.length;
        const centroidZ = points.reduce((sum, [, , z]) => sum + z, 0) / points.length;
        const quadrant = Math.round(Math.atan2(centroidZ, centroidX - centerX) / (Math.PI / 2));
        orientations.add(((quadrant % 4) + 4) % 4);
      }
      expect(orientations.size).toBe(4);
    }
  }, 120_000);
});
