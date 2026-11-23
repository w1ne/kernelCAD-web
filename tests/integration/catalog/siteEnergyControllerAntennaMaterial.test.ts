// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/ev-charging-infrastructure/site-energy-management-controller.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('ev-charging-infrastructure/site-energy-management-controller antenna material', () => {
  it('draws polymer antennas on steel connectors, a rear wall plate and a seated status button', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort()).toEqual([
      'antennaPolymer',
      'displayGlass',
      'powderCoat',
      'safetyPolymer',
      'stainlessSteel',
    ]);
    expect(colorParams.find((param) => param.name === 'antennaPolymer')?.label).toBe('Antenna radome polymer');
    expect(Object.keys(asset.presets)).toEqual(['fleetReady', 'nightService']);
    expect(Object.keys(asset.presets.fleetReady!)).toContain('antennaPolymer');
    expect(Object.keys(asset.presets.nightService!)).toContain('antennaPolymer');
    expect(asset.description).toMatch(/antenna radome polymer/i);
    expect(asset.stats.triangles).toBe(328);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

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
    expectFinish(['antenna-left', 'antenna-right'], '#2b3236', 'the antenna radome polymer finish');
    expectFinish(
      ['antenna-mount-left', 'antenna-mount-right', 'mounting-plate', 'vent-slot-1', 'vent-slot-2'],
      '#b5c0c2',
      'the stainless steel finish',
    );
    expectFinish(['main-enclosure', 'top-cap', 'front-door', 'cable-gland-strip'], '#397f90', 'the powder-coat finish');
    expectFinish(['status-button'], '#f0b13c', 'the safety polymer finish');

    // GLB is Y up: X is the enclosure width, Y is height, Z is the wall-to-operator depth.
    const enclosure = getBounds(nodeFor('main-enclosure'));
    const door = getBounds(nodeFor('front-door'));
    const cap = getBounds(nodeFor('top-cap'));
    const front = Math.sign((door.min[2]! + door.max[2]!) / 2);
    // Distance from the enclosure centre plane toward the operator; negative values are toward the wall.
    const toward = (bounds: { min: number[]; max: number[] }) =>
      [front * bounds.min[2]!, front * bounds.max[2]!].sort((a, b) => a - b) as [number, number];

    // Each antenna is a slim whip on a steel connector that stands on the top cap.
    for (const side of ['left', 'right']) {
      const mount = getBounds(nodeFor(`antenna-mount-${side}`));
      const whip = getBounds(nodeFor(`antenna-${side}`));
      expect(mount.min[1], `antenna-mount-${side} should stand on the top cap`).toBeCloseTo(cap.max[1]!, 5);
      expect(whip.min[1], `antenna-${side} should stand on its connector`).toBeCloseTo(mount.max[1]!, 5);
      expect(whip.max[0]! - whip.min[0]!, `antenna-${side} should be slimmer than its connector`)
        .toBeLessThan(mount.max[0]! - mount.min[0]!);
      expect(whip.max[1]! - whip.min[1]!, `antenna-${side} whip length`).toBeCloseTo(0.3, 4);
      expect(toward(mount)[0], `antenna-mount-${side} should stay on the cap`).toBeGreaterThan(toward(cap)[0]);
      expect(toward(mount)[1], `antenna-mount-${side} should stay on the cap`).toBeLessThan(toward(cap)[1]);
    }

    // The wall plate lies behind the enclosure, not through its middle.
    const plate = getBounds(nodeFor('mounting-plate'));
    expect(toward(plate)[1], 'mounting-plate should touch the enclosure rear wall').toBeCloseTo(toward(enclosure)[0], 5);
    expect(toward(plate)[1] - toward(plate)[0], 'mounting-plate thickness').toBeCloseTo(0.03, 5);

    // The status button is a round face on the door, with its axis toward the operator.
    const button = getBounds(nodeFor('status-button'));
    expect(toward(button)[0], 'status-button should sit on the door face').toBeCloseTo(toward(door)[1], 5);
    expect(toward(button)[1] - toward(button)[0], 'status-button travel depth').toBeCloseTo(0.018, 5);
    expect(button.max[1]! - button.min[1]!, 'status-button face height').toBeGreaterThan(0.022);

    const all = getBounds(document.getRoot().listScenes()[0]!);
    expect(all.max[0]! - all.min[0]!).toBeCloseTo(0.56, 3);
    expect(all.max[1]! - all.min[1]!).toBeCloseTo(1.082, 3);
    expect(all.max[2]! - all.min[2]!).toBeCloseTo(0.3585, 3);
  }, 120_000);
});
