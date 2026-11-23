// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/conduit-riser-frame.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/conduit-riser-frame frame material', () => {
  it('makes both strut bridges galvanized and clamps each conduit to them with stainless pipe clamps', async () => {
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

    // The two strut bridges are the same part type on the same frame: one galvanized finish.
    const ids = ['bottom', 'top'];
    expectFinish(['bridge-top'], '#77868d', 'the galvanized finish of the bottom bridge');
    for (const name of ['stand-off-a', 'stand-off-b', 'cable-band-0']) expect(names).not.toContain(name);
    const conduits = [0, 1, 2];
    expectFinish(
      ['rail-left', 'rail-right', 'bridge-bottom', ...conduits.map((i) => `conduit-${i}`)],
      '#77868d',
      'the galvanized finish',
    );
    expectFinish(
      [
        ...['left', 'right'].flatMap((side) => [0, 1, 2].map((n) => `anchor-bolt-${side}-${n}`)),
        ...ids.flatMap((id) => [
          `frame-bolt-${id}-0`,
          `frame-bolt-${id}-1`,
          ...conduits.flatMap((i) => [`clamp-${id}-${i}`, `clamp-bolt-${id}-${i}-0`, `clamp-bolt-${id}-${i}-1`]),
        ]),
      ],
      '#d2dbdc',
      'stainless steel',
    );
    expectFinish(conduits.flatMap((i) => [`bushing-${i}`, `cable-${i}`]), '#22292d', 'the polymer bushing and cable jacket');

    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort()).toEqual(['galvanizedSteel', 'polymer', 'stainlessSteel']);

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
    // Y-up metres: index 0 = x, 1 = height, 2 = distance out from the wall.
    const near = (a: number, b: number) => Math.abs(a - b) < 0.002;
    for (const side of ['left', 'right']) {
      const rail = bounds(`rail-${side}`);
      expect(rail[1]![0], `rail-${side} should start at the ground line`).toBeCloseTo(0, 3);
      expect(rail[2]![0], `rail-${side} should sit on the wall face`).toBeCloseTo(0, 3);
    }
    const railFront = bounds('rail-left')[2]![1];
    for (const id of ids) {
      const bridge = bounds(`bridge-${id}`);
      // The bridge is bolted across the rail fronts and spans both rails.
      expect(near(bridge[2]![0], railFront), `bridge-${id} should bear on the rail fronts`).toBe(true);
      expect(bridge[0]![0]).toBeLessThan(bounds('rail-left')[0]![0]);
      expect(bridge[0]![1]).toBeGreaterThan(bounds('rail-right')[0]![1]);
      for (const i of conduits) {
        const conduit = bounds(`conduit-${i}`);
        const clamp = bounds(`clamp-${id}-${i}`);
        // The conduit bears on the bridge open face; the clamp wraps its front and its ears sit on the bridge face.
        expect(near(conduit[2]![0], bridge[2]![1]), `conduit-${i} should bear on bridge-${id}`).toBe(true);
        expect(near(clamp[2]![0], bridge[2]![1]), `clamp-${id}-${i} ears should sit on bridge-${id}`).toBe(true);
        expect(clamp[2]![1], `clamp-${id}-${i} should wrap conduit-${i}`).toBeGreaterThan(conduit[2]![1]);
        expect(clamp[0]![0], `clamp-${id}-${i} should wrap conduit-${i}`).toBeLessThan(conduit[0]![0]);
        expect(clamp[0]![1], `clamp-${id}-${i} should wrap conduit-${i}`).toBeGreaterThan(conduit[0]![1]);
        expect(clamp[1]![0], `clamp-${id}-${i} should sit within bridge-${id} height`).toBeGreaterThanOrEqual(bridge[1]![0]);
        expect(clamp[1]![1], `clamp-${id}-${i} should sit within bridge-${id} height`).toBeLessThanOrEqual(bridge[1]![1]);
      }
    }
    for (const i of conduits) {
      const conduit = bounds(`conduit-${i}`);
      const bushing = bounds(`bushing-${i}`);
      const cable = bounds(`cable-${i}`);
      expect(conduit[1]![0], `conduit-${i} should rise from the ground line`).toBeCloseTo(0, 3);
      expect(near(bushing[1]![0], conduit[1]![1]), `bushing-${i} should cap conduit-${i}`).toBe(true);
      expect(near(cable[1]![0], bushing[1]![1]), `cable-${i} should leave through bushing-${i}`).toBe(true);
    }

    expect(asset.description).toMatch(/stainless strut pipe clamps/i);
  }, 120_000);
});
