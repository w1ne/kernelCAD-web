// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Before this fix the water tank's shell, fill neck and skid shared the same
// yellow equipment-enamel color as the fuel pod, and there was no separate cap
// part. The preview read as a second fuel tank and the material zones could not
// be changed independently.
// The shell is now UV-stabilised polyethylene, the filler cap polypropylene and
// the skid galvanised steel.
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/construction-equipment/portable-site-water-tank.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('construction-equipment/portable-site-water-tank HDPE material', () => {
  it('renders the shell in polyethylene, the cap in polypropylene and the skid in steel', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'tankPolyethyleneColor', 'fillerCapColor', 'structuralSteelColor',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['potableBlue', 'weatheredHdpe']);
    for (const preset of Object.values(asset.presets)) {
      expect(Object.keys(preset).sort()).toEqual([
        'fillerCapColor', 'structuralSteelColor', 'tankPolyethyleneColor',
      ]);
    }

    const zone = (name: string) => asset.palette.find((candidate) => candidate.name === name);
    expect(zone('tankPolyethyleneColor')?.parts.slice().sort()).toEqual(['filler-neck', 'tank-body']);
    expect(zone('fillerCapColor')?.parts).toEqual(['filler-cap']);
    expect(zone('structuralSteelColor')?.parts.slice().sort()).toEqual([
      'outlet-valve', 'skid-base', 'tank-skid--1', 'tank-skid-1',
    ]);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const boundsFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      const mesh = node?.getMesh();
      expect(mesh, `${name} should have geometry`).toBeDefined();
      const matrix = node!.getWorldMatrix();
      const vertices = mesh!.listPrimitives().flatMap((primitive) => {
        const positions = primitive.getAttribute('POSITION')!;
        return Array.from({ length: positions.getCount() }, (_, index) => {
          const position = positions.getElement(index, []);
          return [0, 1, 2].map((axis) =>
            matrix[axis]! * position[0]! + matrix[axis + 4]! * position[1]! +
            matrix[axis + 8]! * position[2]! + matrix[axis + 12]!,
          );
        });
      });
      return {
        min: [0, 1, 2].map((axis) => Math.min(...vertices.map((vertex) => vertex[axis]!))),
        max: [0, 1, 2].map((axis) => Math.max(...vertices.map((vertex) => vertex[axis]!))),
      };
    };
    const tankBody = boundsFor('tank-body');
    const fillerNeck = boundsFor('filler-neck');
    const fillerCap = boundsFor('filler-cap');
    expect(fillerNeck.min[1]).toBeCloseTo(tankBody.max[1], 5);
    expect(fillerCap.min[1]).toBeGreaterThanOrEqual(fillerNeck.max[1]! - 0.0011);
    expect(fillerCap.max[1]! - fillerNeck.max[1]!).toBeGreaterThan(0.01);
    expect(fillerCap.min[0]).toBeLessThan(fillerNeck.min[0]!);
    expect(fillerCap.max[0]).toBeGreaterThan(fillerNeck.max[0]!);

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
      ['tank-body', '#e7ecee'],
      ['filler-neck', '#e7ecee'],
      ['filler-cap', '#20262a'],
      ['skid-base', '#89969a'],
      ['tank-skid-1', '#89969a'],
    ] as const) {
      const colors = colorsFor(name);
      expect(colors.length, `${name} should render`).toBeGreaterThan(0);
      expect(colors.every(matchesHex(expected)), `${name} should use ${expected}`).toBe(true);
    }

    const formerEnamel = matchesHex('#e1a31b');
    for (const name of ['tank-body', 'filler-neck', 'skid-base']) {
      expect(colorsFor(name).some(formerEnamel), `${name} must not stay equipment enamel`).toBe(false);
    }
  }, 120_000);
});
