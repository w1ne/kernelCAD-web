// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/roller-conveyor-line.kcad.ts';
const rollerNames = Array.from({ length: 11 }, (_, index) => `roller-${index}`);

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/roller-conveyor-line fidelity', () => {
  it('exports an open bed of crosswise steel rollers on supported side rails', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'rollerSteel', 'safetyPaint',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(asset.palette.find((zone) => zone.name === 'rollerSteel')?.parts).toEqual(rollerNames);
    expect(asset.palette.some((zone) => zone.parts.includes('conveyor-deck'))).toBe(false);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const boundsFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      expect(node, `${name} exists in the exported GLB`).toBeDefined();
      const matrix = node!.getWorldMatrix();
      const bounds = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]];
      for (const primitive of node!.getMesh()?.listPrimitives() ?? []) {
        const positions = primitive.getAttribute('POSITION');
        if (positions === null) continue;
        for (let index = 0; index < positions.getCount(); index++) {
          const point = positions.getElement(index, []);
          const world = [
            matrix[0]! * point[0]! + matrix[4]! * point[1]! + matrix[8]! * point[2]! + matrix[12]!,
            matrix[1]! * point[0]! + matrix[5]! * point[1]! + matrix[9]! * point[2]! + matrix[13]!,
            matrix[2]! * point[0]! + matrix[6]! * point[1]! + matrix[10]! * point[2]! + matrix[14]!,
          ];
          world.forEach((coordinate, axis) => {
            bounds[axis]![0] = Math.min(bounds[axis]![0], coordinate);
            bounds[axis]![1] = Math.max(bounds[axis]![1], coordinate);
          });
        }
      }
      return bounds;
    };
    const rollerBounds = rollerNames.map((name) => boundsFor(name));
    const centersX = rollerBounds.map((bounds) => (bounds[0]![0] + bounds[0]![1]) / 2).sort((a, b) => a - b);
    for (const bounds of rollerBounds) {
      expect(bounds[2]![1] - bounds[2]![0], 'roller axis spans the conveyor width').toBeGreaterThan(0.30);
      expect(bounds[0]![1] - bounds[0]![0], 'roller diameter is narrow along the conveyor').toBeLessThan(0.06);
      expect(bounds[1]![1] - bounds[1]![0], 'roller diameter is narrow vertically').toBeLessThan(0.06);
      expect((bounds[1]![0] + bounds[1]![1]) / 2).toBeCloseTo(0.323, 3);
    }
    for (let index = 1; index < centersX.length; index++) {
      expect(centersX[index]! - centersX[index - 1]!).toBeCloseTo(0.08, 3);
    }

    const steel = [0xb7, 0xc1, 0xc3].map((channel) => channel / 255);
    const rollerColors = rollerNames.flatMap((name) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      return node?.getMesh()?.listPrimitives().flatMap((primitive) => {
        const vertexColors = primitive.getAttribute('COLOR_0');
        if (vertexColors !== null) {
          return Array.from({ length: vertexColors.getCount() }, (_, index) =>
            vertexColors.getElement(index, []).slice(0, 3).map((channel) =>
              channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055,
            ),
          );
        }
        const material = primitive.getMaterial();
        return material === null ? [] : [material.getBaseColorFactor().slice(0, 3)];
      }) ?? [];
    });
    expect(rollerColors.length).toBeGreaterThan(0);
    expect(rollerColors.every((color) => steel.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    )), 'rollers use the steel control, not safety paint').toBe(true);
  }, 120_000);
});
