// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/railway/turnout-track.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('railway/turnout-track routes, switch and crossing', () => {
  it('gives both routes two running rails at one gauge, with blades, a frog, check rails and support', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(Object.keys(asset.presets)).toEqual(['weathered', 'freshService']);
    expect(asset.params.map((param) => param.name)).toEqual(['scale', 'ballast', 'railSteel', 'concrete', 'paintedSteel']);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

    const document = await new NodeIO().readBinary(glb);
    const meshNodes = document.getRoot().listNodes().filter((node) => node.getMesh() !== null);
    // World-space vertices in source millimetres, Z up (GLB is metres, Y up, -Z = +y).
    const vertices = (name: string) => {
      const node = meshNodes.find((candidate) => candidate.getName() === name);
      expect(node, `part ${name}`).toBeDefined();
      const m = node!.getWorldMatrix();
      return node!.getMesh()!.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION')!;
        return Array.from({ length: position.getCount() }, (_, index) => {
          const [x, y, z] = position.getElement(index, []) as [number, number, number];
          const world = [0, 1, 2].map((axis) => m[axis]! * x + m[4 + axis]! * y + m[8 + axis]! * z + m[12 + axis]!);
          return { x: world[0]! * 1000, y: -world[2]! * 1000, z: world[1]! * 1000 };
        });
      });
    };
    const range = (values: number[]) => [Math.min(...values), Math.max(...values)] as const;

    // Straight route: two parallel rails 180 mm apart on centre lines y = -90 and y = +90.
    const straightLow = vertices('stock-rail-straight');
    expect(range(straightLow.map((v) => v.y))).toEqual([expect.closeTo(-105, 3), expect.closeTo(-75, 3)]);
    for (const name of ['exit-rail-straight']) {
      expect(range(vertices(name).map((v) => v.y))).toEqual([expect.closeTo(75, 3), expect.closeTo(105, 3)]);
    }
    // Diverging route: the outer stock rail and the inner closure/exit rails are concentric
    // arcs about the route centre (-600, 3500), 90 mm either side of a 3500 mm centre line.
    const radius = (v: { x: number; y: number }) => Math.hypot(v.x + 600, v.y - 3500);
    const beyondToe = (vs: Array<{ x: number; y: number }>) => vs.filter((v) => v.x > -590);
    expect(range(beyondToe(vertices('stock-rail-diverging')).map(radius))).toEqual([expect.closeTo(3410 - 15, 1), expect.closeTo(3410 + 15, 1)]);
    expect(range(vertices('exit-rail-diverging').map(radius))).toEqual([expect.closeTo(3590 - 15, 1), expect.closeTo(3590 + 15, 1)]);
    const curvedClosureBeforeKnuckle = vertices('closure-rail-curved').filter((v) => v.x < 380);
    expect(range(curvedClosureBeforeKnuckle.map(radius))).toEqual([expect.closeTo(3590 - 15, 1), expect.closeTo(3590 + 15, 1)]);
    // The diverging route leaves the end at y > 300 with both rails, not one.
    const divergingEnd = vertices('stock-rail-diverging').filter((v) => v.x > 749);
    expect(Math.min(...divergingEnd.map((v) => v.y))).toBeGreaterThan(300);

    // Switch set for the straight route: the straight blade tip lies on the stock rail
    // face (y = 79); the curved blade tip stands at least 20 mm off the other stock rail face (y = -79).
    const tip = (name: string) => vertices(name).filter((v) => v.x < -570);
    expect(Math.max(...tip('switch-blade-straight').map((v) => v.y))).toBeCloseTo(79, 0);
    expect(Math.min(...tip('switch-blade-curved').map((v) => v.y))).toBeGreaterThan(-79 + 20);
    for (const name of ['stretcher-bar-1', 'stretcher-bar-2']) {
      const bar = range(vertices(name).map((v) => v.y));
      expect(bar[0] < -40 && bar[1] > 70, `${name} spans both blades`).toBe(true);
    }
    // The point machine stands outside the straight stock rail; its drive rod passes under that rail to the blades.
    const machine = range(vertices('point-machine').map((v) => v.y));
    expect(machine[1]).toBeLessThan(-105);
    const rod = vertices('drive-rod');
    expect(range(rod.map((v) => v.y))[0]).toBeLessThanOrEqual(machine[1] + 1);
    expect(range(rod.map((v) => v.y))[1]).toBeGreaterThan(-75);
    expect(range(rod.filter((v) => v.y > -110).map((v) => v.z))[1], 'rod passes under the rail foot').toBeLessThanOrEqual(52 + 0.01);

    // Frog: the nose tip lies where the straight rail line and the diverging arc gauge faces meet.
    const nose = vertices('frog-nose');
    expect(Math.min(...nose.map((v) => v.x))).toBeCloseTo(-600 + Math.sqrt(3579 ** 2 - 3421 ** 2), 0);
    // Wing rails (closure rail ends) and check rails flank it with 14 mm flangeways.
    const wingStraight = vertices('closure-rail-curved').filter((v) => v.x > 500 && v.z > 84 + 0.01);
    expect(range(wingStraight.map((v) => v.y))[1]).toBeCloseTo(79 - 14, 1);
    expect(range(vertices('check-rail-straight').filter((v) => v.z > 84 + 0.01).map((v) => v.y))[0]).toBeCloseTo(-79 + 14, 1);
    expect(range(vertices('check-rail-diverging').filter((v) => v.z > 84 + 0.01).map(radius))[1]).toBeCloseTo(3500 - 54 + 11, 0);

    // Support: every rail vertex lies over the nearest timber, 30 mm or more inside its ends.
    const timbers = Array.from({ length: 13 }, (_, i) => {
      const t = vertices(`timber-${i + 1}`);
      return { x: (Math.min(...t.map((v) => v.x)) + Math.max(...t.map((v) => v.x))) / 2, y: range(t.map((v) => v.y)) };
    });
    const railParts = meshNodes.map((node) => node.getName()).filter((name) => /rail|blade|frog/.test(name));
    expect(railParts.length).toBe(11);
    for (const name of railParts) {
      for (const v of vertices(name)) {
        const timber = timbers.reduce((best, t) => (Math.abs(t.x - v.x) < Math.abs(best.x - v.x) ? t : best));
        expect(v.y > timber.y[0] + 30 && v.y < timber.y[1] - 30, `${name} at x ${v.x.toFixed(0)} y ${v.y.toFixed(0)} is over a timber`).toBe(true);
      }
    }
    const bed = range(vertices('ballast-bed').map((v) => v.y));
    for (const t of timbers) expect(t.y[0] >= bed[0] && t.y[1] <= bed[1]).toBe(true);
  }, 120_000);
});
