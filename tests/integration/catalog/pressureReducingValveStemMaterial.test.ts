// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/water-treatment/pressure-reducing-valve-assembly.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('water-treatment/pressure-reducing-valve-assembly stem material', () => {
  it('draws a stainless adjusting stem on a body that lies on the pipe axis', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(532);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name).sort()).toEqual([
      'coatedSteel', 'stainlessSteel', 'warningAmber',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const nodeFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      expect(node, `${name} should export`).toBeDefined();
      return node!;
    };
    const colorsFor = (name: string) =>
      nodeFor(name).getMesh()?.listPrimitives().flatMap((primitive) => {
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

    // The adjusting stem turns through the actuator cover, so it is bare stainless, not painted.
    expectFinish(['stem', 'flange-left', 'flange-right'], '#b5c0c0', 'the stainless steel finish');
    expectFinish(['body', 'bonnet', 'actuator'], '#3d8589', 'the coated equipment steel finish');
    expectFinish(['handwheel'], '#e8a936', 'the safety amber finish');

    // GLB is Y up; the catalog X axis (the pipe run) stays the GLB X axis.
    const extent = (name: string) => {
      const { min, max } = getBounds(nodeFor(name));
      return {
        min,
        max,
        size: max.map((value, axis) => value - min[axis]!),
        center: max.map((value, axis) => (value + min[axis]!) / 2),
      };
    };
    const body = extent('body');
    const left = extent('flange-left');
    const right = extent('flange-right');
    const bonnet = extent('bonnet');

    // The body lies on the pipe run; before the fix it stood upright with one flange on the ground.
    expect(body.size[0]!, 'body should run 260 mm along the pipe axis').toBeCloseTo(0.26, 3);
    expect(body.size[1]!, 'body should show its full diameter in height').toBeCloseTo(0.3, 3);
    for (const [name, flange] of [['flange-left', left], ['flange-right', right]] as const) {
      expect(flange.size[0]!, `${name} should be a 40 mm disc on the pipe axis`).toBeCloseTo(0.04, 3);
      expect(flange.size[1]!, `${name} should stand on edge`).toBeCloseTo(0.38, 3);
      expect(flange.min[1]!, `${name} should rest on the ground`).toBeCloseTo(0, 6);
      expect(flange.center[1]!, `${name} should share the body axis`).toBeCloseTo(body.center[1]!, 6);
    }
    expect(left.max[0]!, 'flange-left should close the left body end').toBeCloseTo(body.min[0]!, 6);
    expect(right.min[0]!, 'flange-right should close the right body end').toBeCloseTo(body.max[0]!, 6);

    // The bonnet rises from the top of the body, between the flanges, not from a flange face.
    expect(bonnet.center[0]!, 'bonnet should be at mid-length').toBeCloseTo(0, 6);
    expect(bonnet.min[1]!, 'bonnet should start inside the body top').toBeLessThan(body.max[1]!);
    expect(bonnet.min[1]!, 'bonnet should not pass through the body').toBeGreaterThan(body.max[1]! - 0.03);
    expect(extent('actuator').min[1]!).toBeCloseTo(bonnet.max[1]!, 6);
    expect(extent('stem').min[1]!).toBeCloseTo(extent('actuator').max[1]!, 6);
    expect(extent('handwheel').min[1]!).toBeCloseTo(extent('stem').max[1]!, 6);

    const all = getBounds(document.getRoot().listScenes()[0]!);
    expect(all.max[0]! - all.min[0]!).toBeCloseTo(0.34, 3);
    expect(all.max[1]! - all.min[1]!).toBeCloseTo(0.735, 3);
    expect(all.max[2]! - all.min[2]!).toBeCloseTo(0.38, 3);
  }, 120_000);
});
