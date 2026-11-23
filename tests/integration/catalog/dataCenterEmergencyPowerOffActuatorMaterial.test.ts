// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/data-center-infrastructure/emergency-power-off-station.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('data-center-infrastructure/emergency-power-off-station actuator material', () => {
  it('draws a red actuator that faces the operator on a yellow collar', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(136);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [0.32, 0.42, 0.2675].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'polymer', 'actuatorPolymer',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['facilityStandard', 'highVisibility']);
    for (const preset of Object.values(asset.presets)) {
      expect(Object.keys(preset)).toContain('actuatorPolymer');
    }

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

    expectFinish(['push-button'], '#d42a20', 'the red actuator polymer');
    expectFinish(['actuator-base', 'control-body'], '#f0c330', 'the yellow engineering polymer');
    expectFinish(['back-plate', 'guard-hood', 'label-panel'], '#b43b31', 'the painted steel finish');

    // GLB is Y up. The actuator axis must be horizontal: the button is a 45 mm deep,
    // 120 mm wide disc that stands proud of the collar, below the guard hood.
    const extent = (name: string) => {
      const { min, max } = getBounds(nodeFor(name));
      return { min, max, size: max.map((value, axis) => value - min[axis]!) };
    };
    const button = extent('push-button');
    const collar = extent('actuator-base');
    const body = extent('control-body');
    const hood = extent('guard-hood');
    const depthAxis = button.size.indexOf(Math.min(...button.size));
    expect(depthAxis, 'button axis should be horizontal, not vertical').not.toBe(1);
    expect(button.size[depthAxis]).toBeCloseTo(0.045, 4);
    expect(button.size[1]).toBeGreaterThan(0.11);
    expect(button.size[1]).toBeLessThanOrEqual(0.1201);
    expect(button.max[1], 'button should sit below the guard hood').toBeLessThanOrEqual(hood.min[1]! + 1e-6);
    expect(button.min[1], 'button should stay on the control body face').toBeGreaterThanOrEqual(body.min[1]! - 1e-6);
    expect(button.size[1], 'mushroom head should be wider than its collar').toBeGreaterThan(collar.size[1]!);

    // The collar starts on the control body face and the button continues outward from the collar.
    const front = (part: { min: number[]; max: number[] }) =>
      Math.abs(part.min[depthAxis]!) > Math.abs(part.max[depthAxis]!) ? part.min[depthAxis]! : part.max[depthAxis]!;
    const bodyFront = Math.abs(front(body));
    const collarFront = Math.abs(front(collar));
    const buttonFront = Math.abs(front(button));
    expect(collarFront - bodyFront).toBeCloseTo(0.04, 4);
    expect(buttonFront - collarFront).toBeCloseTo(0.045, 4);
  }, 120_000);
});
