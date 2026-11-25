// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The barcode tunnel scanner carries parcels on a rubber belt through the
// portal. Before the fix that belt used the painted-steel finish, so the belt
// rendered as a blue-grey steel floor and the asset had no rubber control. The
// other postal conveyor assets (package-induction-conveyor, parcel-belt-diverter,
// crossbelt-sorter-section) already use beltRubber for their belts.
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/postal-logistics/barcode-tunnel-scanner.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('postal-logistics/barcode-tunnel-scanner belt material', () => {
  it('renders the carrying belt in rubber and keeps the arch in painted steel', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'paintedSteel', 'structuralSteel', 'stainlessSteel', 'instrumentGlass', 'beltRubber',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    for (const preset of Object.values(asset.presets)) {
      expect(preset).toHaveProperty('beltRubber');
    }

    const beltRubber = asset.palette.find((zone) => zone.name === 'beltRubber');
    const paintedSteel = asset.palette.find((zone) => zone.name === 'paintedSteel');
    expect(beltRubber?.parts).toEqual(['belt']);
    expect(paintedSteel?.parts.slice().sort()).toEqual(['arch-left', 'arch-right', 'arch-top']);
    for (const arch of ['arch-left', 'arch-right', 'arch-top']) {
      expect(beltRubber?.parts).not.toContain(arch);
    }

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
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
    const matchesHex = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      );
    };

    for (const [name, expected] of [
      ['belt', '#2c3134'],
      ['arch-top', '#596e83'],
      ['arch-left', '#596e83'],
      ['left-leg-front', '#58656c'],
      ['side-window-left', '#57b4c3'],
    ] as const) {
      const colors = colorsFor(name);
      expect(colors.length, `${name} should render`).toBeGreaterThan(0);
      expect(colors.every(matchesHex(expected)), `${name} should use ${expected}`).toBe(true);
    }
  }, 120_000);
});
