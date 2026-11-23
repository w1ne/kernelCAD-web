// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/mining/trommel-screen.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('mining/trommel-screen spray pipework material', () => {
  it('makes the spray bar, nozzles and supply one galvanized pipe run fed from a valved riser', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility', 'gravelWash']);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
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

    // The "Screen panels" control drives the perforated panels only. The spray
    // bar, its drop nozzles and the supply are one galvanized water pipe run,
    // not screen panels and not pale-blue "water".
    const screenPanels = asset.params.find((param) => param.name === 'stainlessSteel');
    expect(screenPanels?.label).toBe('Screen panels');
    expectFinish(['screen-panels'], '#7c8589', 'the screen panel finish');
    const nozzles = [-2200, -1200, -200, 800, 1800, 2800].map((x) => `spray-nozzle-${x}`);
    const pipeRun = ['spray-bar', ...nozzles, 'spray-supply', 'spray-elbow', 'spray-riser', 'spray-riser-flange'];
    expectFinish(pipeRun, '#a7afb1', 'galvanized pipe');
    expectFinish(['spray-valve'], '#3c4144', 'the cast valve body');
    expectFinish(['spray-valve-handwheel'], '#c8322b', 'the red valve handwheel');

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
    // Y-up metres: index 0 = x, 1 = height, 2 = -y (back of the drum is -Z).
    const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) < tol;
    const bar = bounds('spray-bar');
    const supply = bounds('spray-supply');
    const riser = bounds('spray-riser');
    const flange = bounds('spray-riser-flange');
    const plinth = bounds('plinth-discharge');
    // The supply leaves the discharge end of the bar and runs level to the back.
    expect(supply[1]![0] > bar[1]![0] - 0.01 && supply[1]![1] < bar[1]![1] + 0.01, 'the supply should run at the bar height').toBe(true);
    expect(supply[0]![0], 'the supply should start at the bar end').toBeLessThan(bar[0]![1]);
    expect(supply[2]![0], 'the supply should run to the back of the drum').toBeLessThan(-1.5);
    // The riser drops from the supply to a flange on the discharge plinth, through the valve.
    const elbow = bounds('spray-elbow');
    expect(elbow[1]![0] <= supply[1]![0] && elbow[1]![1] >= supply[1]![1], 'the elbow should close the supply end').toBe(true);
    expect(near((elbow[2]![0] + elbow[2]![1]) / 2, supply[2]![0], 0.002), 'the elbow should be centred on the back end of the supply').toBe(true);
    expect(near(riser[1]![1], elbow[1]![0], 0.002), 'the riser should hang from the elbow').toBe(true);
    expect(near(flange[1]![0], plinth[1]![1], 0.002), 'the riser flange should sit on the plinth').toBe(true);
    expect(near(riser[1]![0], flange[1]![1], 0.002), 'the riser should stand on its flange').toBe(true);
    const valve = bounds('spray-valve');
    expect(valve[1]![0] > riser[1]![0] && valve[1]![1] < riser[1]![1], 'the valve should be on the riser').toBe(true);
    expect(valve[2]![0] < riser[2]![0] && valve[2]![1] > riser[2]![1], 'the valve body should surround the riser').toBe(true);

    expect(asset.description).toMatch(/valved riser/);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
  }, 120_000);
});
