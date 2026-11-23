// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/remote-power-shelf.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/remote-power-shelf chassis material', () => {
  it('makes the shelf one powder-coated 19-inch chassis with rack ears and aluminium rectifier faces', async () => {
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

    // A rack power shelf is one painted chassis: no galvanized body under a painted band.
    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort(), 'the shelf should have no galvanized body finish').toEqual([
      'aluminium',
      'polymer',
      'powderCoat',
      'stainlessSteel',
    ]);
    for (const name of ['shelf', 'top', 'module-left', 'module-right']) expect(names).not.toContain(name);
    const sides = ['left', 'right'];
    const rectifiers = [0, 1, 2, 3];
    expectFinish(['chassis', ...sides.map((side) => `ear-${side}`)], '#353c41', 'the powder-coated chassis finish');
    expectFinish(['controller', ...rectifiers.map((i) => `rectifier-${i}`)], '#b4bcbf', 'the aluminium module face');
    expectFinish(sides.flatMap((side) => [0, 1].map((n) => `rack-screw-${side}-${n}`)), '#d2dbdc', 'stainless steel');
    expectFinish(
      [
        'display',
        'port-0',
        'port-1',
        'terminal-cover',
        ...rectifiers.flatMap((i) => [`handle-${i}`, ...[0, 1, 2, 3, 4].map((s) => `vent-${i}-${s}`)]),
      ],
      '#1c2124',
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
    const chassis = bounds('chassis');
    expect(chassis[0]![1] - chassis[0]![0], 'chassis should fit between 19-inch rack rails').toBeCloseTo(0.44, 3);
    expect(chassis[1]![1] - chassis[1]![0], 'chassis should be 3U tall').toBeCloseTo(0.133, 3);
    const front = chassis[2]![1];
    const left = bounds('ear-left');
    const right = bounds('ear-right');
    expect(right[0]![1] - left[0]![0], 'rack ears should span 483 mm').toBeCloseTo(0.483, 3);
    expect(near(left[0]![1], chassis[0]![0]) && near(right[0]![0], chassis[0]![1]), 'ears should bear on the chassis sides').toBe(true);
    for (const [side, ear] of [['left', left], ['right', right]] as const) {
      expect(near(ear[2]![1], front + 0.003), `ear-${side} flange should sit on the chassis front`).toBe(true);
      expect(ear[1]![1] - ear[1]![0], `ear-${side} should run the full chassis height`).toBeCloseTo(0.133, 3);
      for (const n of [0, 1]) {
        const screw = bounds(`rack-screw-${side}-${n}`);
        expect(near(screw[2]![0], ear[2]![1]), `rack-screw-${side}-${n} should sit on the ear flange`).toBe(true);
        const mid = (screw[0]![0] + screw[0]![1]) / 2;
        const outside = side === 'left' ? mid < chassis[0]![0] : mid > chassis[0]![1];
        expect(outside, `rack-screw-${side}-${n} should be on the ear, outside the chassis`).toBe(true);
      }
    }
    for (const i of rectifiers) {
      const face = bounds(`rectifier-${i}`);
      const grip = bounds(`handle-${i}`);
      expect(near(face[2]![0], front), `rectifier-${i} should sit on the chassis front`).toBe(true);
      expect(face[1]![1]).toBeLessThanOrEqual(chassis[1]![1]);
      expect(near(grip[2]![0], face[2]![1]), `handle-${i} should stand off its module face`).toBe(true);
      expect(grip[0]![0]).toBeGreaterThan(face[0]![0]);
      expect(grip[0]![1]).toBeLessThan(face[0]![1]);
      for (const s of [0, 1, 2, 3, 4]) {
        const vent = bounds(`vent-${i}-${s}`);
        expect(near(vent[2]![0], face[2]![1]), `vent-${i}-${s} should be on its module face`).toBe(true);
      }
    }

    expect(asset.description).toMatch(/19-inch 3U/);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
  }, 120_000);
});
