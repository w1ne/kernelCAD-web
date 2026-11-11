// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/grid-substation/substation-transformer-conservator.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('grid-substation/substation-transformer-conservator top nozzle', () => {
  it('uses the vessel finish and meets the shell roof', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(244);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [1.918, 1.395, 0.792].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'galvanizedSteel', 'transformerEnamel', 'glass',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'maintenance']);
    expect(asset.presets.weathered).toMatchObject({ transformerEnamel: '#5a6c53' });

    const enamel = asset.palette.find((zone) => zone.name === 'transformerEnamel');
    expect(enamel?.parts).toEqual(expect.arrayContaining([
      'vessel-shell', 'end-cap-left', 'end-cap-right', 'nozzle-flange', 'top-nozzle',
    ]));
    expect(asset.palette.some((zone) => zone.parts.includes('top-nozzle') && zone.name !== 'transformerEnamel'))
      .toBe(false);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const bounds = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      const position = node?.getMesh()?.listPrimitives()[0]?.getAttribute('POSITION');
      expect(position, `expected exported geometry for ${name}`).toBeDefined();
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (let index = 0; index < position!.getCount(); index++) {
        const point = position!.getElement(index, []);
        point.forEach((coordinate, axis) => {
          min[axis] = Math.min(min[axis]!, coordinate);
          max[axis] = Math.max(max[axis]!, coordinate);
        });
      }
      return { min, max };
    };
    const shell = bounds('vessel-shell');
    const flange = bounds('nozzle-flange');
    const nozzle = bounds('top-nozzle');
    // The source geometry remains millimetres and Z-up in the GLB mesh data.
    // The flange overlaps the shell roof by 10 mm; the hollow neck overlaps
    // the flange and stays within the vessel footprint.
    expect(flange.min[2]).toBeCloseTo(shell.max[2] - 10, 5);
    expect(nozzle.min[2]).toBeLessThan(flange.max[2]);
    for (const part of [flange, nozzle]) {
      expect(part.min[0]).toBeGreaterThan(shell.min[0]);
      expect(part.max[0]).toBeLessThan(shell.max[0]);
      expect(part.min[1]).toBeGreaterThan(shell.min[1]);
      expect(part.max[1]).toBeLessThan(shell.max[1]);
    }

    const colorsFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      return node?.getMesh()?.listPrimitives().flatMap((primitive) => {
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
    const expected = [1, 3, 5].map((shift) => parseInt('#557052'.slice(shift, shift + 2), 16) / 255);
    for (const part of ['nozzle-flange', 'top-nozzle']) {
      const colors = colorsFor(part);
      expect(colors.length, `expected exported colors for ${part}`).toBeGreaterThan(0);
      expect(colors.every((color) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      )), `${part} should match transformer enamel`).toBe(true);
    }
  }, 120_000);
});
