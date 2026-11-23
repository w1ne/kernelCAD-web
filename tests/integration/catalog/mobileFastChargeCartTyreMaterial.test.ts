// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/ev-charging-infrastructure/mobile-fast-charge-cart.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('ev-charging-infrastructure/mobile-fast-charge-cart tyre material', () => {
  it('rolls on four rubber-tyred wheels with painted hubs and carries the enclosure on the chassis', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort()).toEqual([
      'cableElastomer',
      'displayGlass',
      'powderCoat',
      'safetyPolymer',
      'tyreRubber',
    ]);
    expect(colorParams.find((param) => param.name === 'tyreRubber')?.label).toBe('Wheel tyre rubber');
    expect(Object.keys(asset.presets)).toEqual(['fleetReady', 'nightService']);
    expect(Object.keys(asset.presets.fleetReady!)).toContain('tyreRubber');
    expect(Object.keys(asset.presets.nightService!)).toContain('tyreRubber');
    expect(asset.description).toMatch(/wheel tyre rubber/i);
    expect(asset.description).not.toMatch(/casters/i);
    expect(asset.stats.triangles).toBe(672);
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
    const wheels = ['left-wheel', 'right-wheel', 'rear-left-wheel', 'rear-right-wheel'];
    const hubs = wheels.map((wheel) => `${wheel}-hub`);
    expectFinish(wheels, '#23282b', 'the wheel tyre rubber finish');
    expectFinish(
      [...hubs, 'cart-chassis', 'main-enclosure', 'top-cap', 'front-door', 'push-handle', 'handle-bracket-left',
        'handle-bracket-right', 'cable-reel'],
      '#397f90',
      'the powder-coat finish',
    );
    expectFinish(['status-button'], '#f0b13c', 'the safety polymer finish');
    expectFinish(['cable-tail'], '#1b2427', 'the cable elastomer finish');

    // GLB is Y up: X is the cart width (the wheel axle direction), Y is height, Z is the cart depth.
    const span = (bounds: { min: number[]; max: number[] }, axis: number) => bounds.max[axis]! - bounds.min[axis]!;
    const chassis = getBounds(nodeFor('cart-chassis'));
    const enclosure = getBounds(nodeFor('main-enclosure'));
    const door = getBounds(nodeFor('front-door'));
    const front = Math.sign((door.min[2]! + door.max[2]!) / 2);
    // Distance from the enclosure centre plane toward the operator; negative values are toward the handle.
    const toward = (bounds: { min: number[]; max: number[] }) =>
      [front * bounds.min[2]!, front * bounds.max[2]!].sort((a, b) => a - b) as [number, number];

    // Each wheel is an upright disc on a horizontal axle: it stands on the ground beside the chassis.
    for (const wheel of wheels) {
      const tyre = getBounds(nodeFor(wheel));
      const hub = getBounds(nodeFor(`${wheel}-hub`));
      expect(tyre.min[1], `${wheel} should stand on the ground`).toBeCloseTo(0, 6);
      expect(span(tyre, 1), `${wheel} diameter`).toBeCloseTo(0.2, 5);
      expect(span(tyre, 0), `${wheel} tread width`).toBeCloseTo(0.06, 5);
      expect(span(tyre, 0), `${wheel} axle should be horizontal`).toBeLessThan(span(tyre, 1) / 2);
      const outboard = Math.sign(tyre.min[0]! + tyre.max[0]!);
      const tyreSide = [outboard * tyre.min[0]!, outboard * tyre.max[0]!].sort((a, b) => a - b);
      const hubSide = [outboard * hub.min[0]!, outboard * hub.max[0]!].sort((a, b) => a - b);
      expect(tyreSide[0], `${wheel} should run against the chassis side`).toBeCloseTo(chassis.max[0]!, 5);
      expect(hubSide[1]! - tyreSide[1]!, `${wheel}-hub should stand proud of the tyre`).toBeCloseTo(0.008, 5);
      expect(span(hub, 1), `${wheel}-hub should be smaller than the tyre`).toBeLessThan(span(tyre, 1) / 2);
      expect((hub.min[1]! + hub.max[1]!) / 2, `${wheel}-hub should share the wheel axle`)
        .toBeCloseTo((tyre.min[1]! + tyre.max[1]!) / 2, 5);
      expect(chassis.min[1], `${wheel} axle should pass through the chassis`).toBeLessThan((tyre.min[1]! + tyre.max[1]!) / 2);
      expect(chassis.max[1], `${wheel} axle should pass through the chassis`).toBeGreaterThan((tyre.min[1]! + tyre.max[1]!) / 2);
    }

    // The chassis clears the ground and carries the enclosure.
    expect(chassis.min[1], 'cart-chassis ground clearance').toBeCloseTo(0.07, 5);
    expect(enclosure.min[1], 'main-enclosure should stand on the chassis').toBeCloseTo(chassis.max[1]!, 5);
    expect(door.min[1], 'front-door should stay on the enclosure').toBeGreaterThan(enclosure.min[1]!);

    // The handle is carried by two brackets on the enclosure rear wall.
    const handle = getBounds(nodeFor('push-handle'));
    for (const side of ['left', 'right']) {
      const bracket = getBounds(nodeFor(`handle-bracket-${side}`));
      expect(toward(bracket)[1], `handle-bracket-${side} should touch the rear wall`).toBeCloseTo(toward(enclosure)[0], 5);
      expect(toward(bracket)[0], `handle-bracket-${side} should reach the handle axis`)
        .toBeCloseTo((toward(handle)[0] + toward(handle)[1]) / 2, 5);
    }
    const reel = getBounds(nodeFor('cable-reel'));
    expect(toward(reel)[1], 'cable-reel should sit on the rear wall').toBeCloseTo(toward(enclosure)[0], 5);

    // The status button is a round face on the door, with its axis toward the operator.
    const button = getBounds(nodeFor('status-button'));
    expect(toward(button)[0], 'status-button should sit on the door face').toBeCloseTo(toward(door)[1], 5);
    expect(toward(button)[1] - toward(button)[0], 'status-button travel depth').toBeCloseTo(0.018, 5);

    const all = getBounds(document.getRoot().listScenes()[0]!);
    expect(span(all, 0)).toBeCloseTo(0.956, 3);
    expect(span(all, 1)).toBeCloseTo(1.182, 3);
    expect(span(all, 2)).toBeCloseTo(1.05, 3);
  }, 120_000);
});
