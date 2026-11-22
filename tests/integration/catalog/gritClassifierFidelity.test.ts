// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/water-treatment/grit-classifier.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('water-treatment/grit-classifier fidelity', () => {
  it('renders the inclined extraction screw between the trough and raised outlet', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'coatedSteel', 'structuralSteel', 'stainlessSteel',
    ]);

    const stainlessParts = asset.palette.find((zone) => zone.name === 'stainlessSteel')?.parts ?? [];
    expect(stainlessParts).toEqual(expect.arrayContaining([
      'classifier-screw-shaft', 'classifier-screw-flight', 'discharge-chute',
    ]));

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const triangleCount = nodes.flatMap((node) => node.getMesh()?.listPrimitives() ?? [])
      .reduce((total, primitive) => {
        const indices = primitive.getIndices();
        const positions = primitive.getAttribute('POSITION');
        return total + Math.floor((indices?.getCount() ?? positions?.getCount() ?? 0) / 3);
      }, 0);
    expect(triangleCount).toBeGreaterThan(300);
    expect(triangleCount).toBeLessThanOrEqual(asset.triangleBudget);

    const flight = nodes.find((node) => node.getName() === 'classifier-screw-flight');
    expect(flight?.getMesh()).toBeDefined();
    const positions = flight?.getMesh()?.listPrimitives().flatMap((primitive) => {
      const position = primitive.getAttribute('POSITION');
      if (position === null) return [];
      const world = flight.getWorldMatrix();
      return Array.from({ length: position.getCount() }, (_, index) => {
        const point = position.getElement(index, []);
        return [
          world[0]! * point[0]! + world[4]! * point[1]! + world[8]! * point[2]! + world[12]!,
          world[1]! * point[0]! + world[5]! * point[1]! + world[9]! * point[2]! + world[13]!,
          world[2]! * point[0]! + world[6]! * point[1]! + world[10]! * point[2]! + world[14]!,
        ];
      });
    }) ?? [];
    expect(positions.length).toBeGreaterThan(300);

    const span = (axis: number) => {
      const values = positions.map((point) => point[axis]!);
      return Math.max(...values) - Math.min(...values);
    };
    const screwDimensions = [span(0), span(1), span(2)].sort((a, b) => a - b);
    expect(screwDimensions[0]).toBeGreaterThan(0.07);
    expect(screwDimensions[1]).toBeGreaterThan(0.15);
    expect(screwDimensions[2]).toBeGreaterThan(0.3);
  }, 120_000);
});
