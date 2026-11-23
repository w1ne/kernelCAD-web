// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/pedestal-fiber-terminal.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/pedestal-fiber-terminal body material', () => {
  it('makes the pedestal one powder-coated body and cover on a concrete pad with the door on the body front', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(Object.keys(asset.presets)).toEqual(['fieldSite', 'highVisibility']);
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

    // A fiber pedestal is one painted enclosure: no galvanized body under a painted door, cap and base.
    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort(), 'the pedestal should have no galvanized body finish').toEqual([
      'concrete',
      'polymer',
      'powderCoat',
      'stainlessSteel',
    ]);
    for (const name of ['pedestal', 'cap', 'base', 'conduit-a', 'conduit-b']) expect(names).not.toContain(name);
    const anchors = [0, 1, 2, 3];
    const sides = ['left', 'right'];
    expectFinish(['body', 'cover-skirt', 'cover-roof', 'door', 'base-flange'], '#4f6e57', 'the powder-coated body finish');
    expectFinish(['pad'], '#a9a69d', 'concrete');
    expectFinish(['hinge-0', 'hinge-1', 'lock', ...anchors.map((i) => `anchor-bolt-${i}`)], '#d2dbdc', 'stainless steel');
    expectFinish(
      ['door-seal', 'duct-0', 'duct-1', ...sides.flatMap((side) => [0, 1, 2, 3].map((s) => `vent-${side}-${s}`))],
      '#1d2326',
      'the polymer finish',
    );

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
    // Y-up metres: index 0 = x, 1 = height, 2 = distance out of the front face.
    const near = (a: number, b: number) => Math.abs(a - b) < 0.002;
    const pad = bounds('pad');
    const flange = bounds('base-flange');
    const body = bounds('body');
    const skirt = bounds('cover-skirt');
    const roof = bounds('cover-roof');
    expect(near(pad[1]![0], 0), 'the pad should sit on the ground').toBe(true);
    expect(near(flange[1]![0], pad[1]![1]), 'the base flange should sit on the pad').toBe(true);
    expect(near(body[1]![0], flange[1]![1]), 'the body should stand on the base flange').toBe(true);
    for (const i of anchors) {
      const bolt = bounds(`anchor-bolt-${i}`);
      expect(near(bolt[1]![0], flange[1]![1]), `anchor-bolt-${i} should sit on the flange`).toBe(true);
      const [x, z] = [(bolt[0]![0] + bolt[0]![1]) / 2, (bolt[2]![0] + bolt[2]![1]) / 2];
      const onFlange = x > flange[0]![0] && x < flange[0]![1] && z > flange[2]![0] && z < flange[2]![1];
      const outsideBody = x < body[0]![0] || x > body[0]![1] || z < body[2]![0] || z > body[2]![1];
      expect(onFlange && outsideBody, `anchor-bolt-${i} should be on the flange, outside the body`).toBe(true);
    }
    // The removable cover slides down over the body top, and its gable roof sits on the skirt.
    expect(skirt[1]![0], 'the cover skirt should overlap the body top').toBeLessThan(body[1]![1]);
    expect(skirt[1]![1], 'the cover skirt should rise above the body top').toBeGreaterThan(body[1]![1]);
    for (const axis of [0, 2]) {
      expect(skirt[axis]![0]).toBeLessThan(body[axis]![0]);
      expect(skirt[axis]![1]).toBeGreaterThan(body[axis]![1]);
      expect(near(roof[axis]![0], skirt[axis]![0]) && near(roof[axis]![1], skirt[axis]![1]), 'the roof should cover the skirt').toBe(true);
    }
    expect(near(roof[1]![0], skirt[1]![1]), 'the roof should sit on the skirt').toBe(true);
    expect(roof[1]![1] - roof[1]![0], 'the roof should be a raised gable, not a flat cap').toBeGreaterThan(0.04);
    // The service door is on the body front in its gasket seam, below the cover.
    const front = body[2]![1];
    const seal = bounds('door-seal');
    const door = bounds('door');
    expect(near(seal[2]![0], front), 'the door seal should sit on the body front').toBe(true);
    expect(near(door[2]![0], seal[2]![1]), 'the door should sit on its seal').toBe(true);
    for (const axis of [0, 1]) {
      expect(seal[axis]![0]).toBeLessThan(door[axis]![0]);
      expect(seal[axis]![1]).toBeGreaterThan(door[axis]![1]);
    }
    expect(door[1]![1]).toBeLessThan(skirt[1]![0]);
    for (const i of [0, 1]) {
      const hinge = bounds(`hinge-${i}`);
      expect(near(hinge[0]![1], door[0]![0] + 0.002), `hinge-${i} should sit on the door edge`).toBe(true);
      expect(hinge[1]![0] > door[1]![0] && hinge[1]![1] < door[1]![1], `hinge-${i} should be within the door height`).toBe(true);
    }
    const lock = bounds('lock');
    expect(near(lock[2]![0], door[2]![1]), 'the lock should stand on the door face').toBe(true);
    expect(lock[0]![0], 'the lock should be on the latch side').toBeGreaterThan((door[0]![0] + door[0]![1]) / 2);
    for (const side of sides) {
      for (const s of [0, 1, 2, 3]) {
        const vent = bounds(`vent-${side}-${s}`);
        const onSide = side === 'left' ? near(vent[0]![1], body[0]![0]) : near(vent[0]![0], body[0]![1]);
        expect(onSide, `vent-${side}-${s} should be on the body side`).toBe(true);
        expect(vent[1]![1]).toBeLessThan(skirt[1]![0]);
      }
    }
    // The ducts rise through the pad into the body, inside its footprint.
    for (const i of [0, 1]) {
      const duct = bounds(`duct-${i}`);
      expect(near(duct[1]![0], 0), `duct-${i} should come up from the ground`).toBe(true);
      expect(duct[1]![1], `duct-${i} should enter the body`).toBeGreaterThan(body[1]![0]);
      for (const axis of [0, 2]) {
        expect(duct[axis]![0]).toBeGreaterThan(body[axis]![0]);
        expect(duct[axis]![1]).toBeLessThan(body[axis]![1]);
      }
    }

    expect(asset.description).toMatch(/concrete pad/);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
  }, 120_000);
});
