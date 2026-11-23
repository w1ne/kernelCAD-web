// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/water-treatment/knife-gate-valve-assembly.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('water-treatment/knife-gate-valve-assembly stem material', () => {
  it('draws a stainless rising stem and horizontal pipe stubs on a seated body', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(356);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name).sort()).toEqual([
      'coatedSteel', 'stainlessSteel', 'structuralSteel', 'warningAmber',
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

    // The rising stem slides through the packing gland, so it is bare stainless, not painted.
    expectFinish(['stem', 'pipe-left', 'pipe-right'], '#b5c0c0', 'the stainless steel finish');
    expectFinish(['gate-body', 'bonnet'], '#3d8589', 'the coated equipment steel finish');
    expectFinish(['handwheel'], '#e8a936', 'the safety amber finish');
    expectFinish(['mount-foot'], '#68777b', 'the structural steel finish');

    // GLB is Y up; the catalog Y axis (the pipe run) maps to the GLB Z axis.
    const extent = (name: string) => {
      const { min, max } = getBounds(nodeFor(name));
      return {
        min,
        max,
        size: max.map((value, axis) => value - min[axis]!),
        center: max.map((value, axis) => (value + min[axis]!) / 2),
      };
    };
    const body = extent('gate-body');
    const foot = extent('mount-foot');

    // The body stands on the mount foot; before the fix it floated 20 mm above it.
    expect(body.min[1]!, 'gate body should stand on the mount foot').toBeCloseTo(foot.max[1]!, 6);

    // Each pipe stub is a round section on the pipe run axis; before the fix both stood upright.
    for (const name of ['pipe-left', 'pipe-right']) {
      const pipe = extent(name);
      expect(pipe.size[1]!, `${name} should show its full diameter in height`).toBeCloseTo(0.2, 3);
      expect(pipe.size[2]!, `${name} should run 180 mm along the pipe axis`).toBeCloseTo(0.18, 3);
      expect(pipe.center[0]!, `${name} should be on the valve centre line`).toBeCloseTo(0, 6);
      expect(pipe.center[1]!, `${name} should be at the body mid-height`).toBeCloseTo(body.center[1]!, 6);
      expect(pipe.min[1]!, `${name} should clear the mount foot`).toBeGreaterThan(foot.max[1]!);
      const inner = Math.min(Math.abs(pipe.min[2]!), Math.abs(pipe.max[2]!));
      const outer = Math.max(Math.abs(pipe.min[2]!), Math.abs(pipe.max[2]!));
      expect(inner, `${name} should start inside the body face`).toBeLessThan(body.max[2]!);
      expect(inner, `${name} should not pass through the body`).toBeGreaterThan(body.max[2]! - 0.02);
      expect(outer, `${name} should leave the body face`).toBeGreaterThan(body.max[2]! + 0.15);
    }
    expect(extent('pipe-left').center[2]!).toBeCloseTo(-extent('pipe-right').center[2]!, 6);

    const all = getBounds(document.getRoot().listScenes()[0]!);
    expect(all.max[0]! - all.min[0]!).toBeCloseTo(0.38, 3);
    expect(all.max[1]! - all.min[1]!).toBeCloseTo(0.685, 3);
    expect(all.max[2]! - all.min[2]!).toBeCloseTo(0.64, 3);
  }, 120_000);
});
