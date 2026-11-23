// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/ev-charging-infrastructure/parking-cable-protection-ramp.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('ev-charging-infrastructure/parking-cable-protection-ramp material', () => {
  it('draws a moulded rubber ramp with polymer lids and visible steel anchors', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort()).toEqual(['anchorSteel', 'coverPolymer', 'rampElastomer']);
    expect(colorParams.find((param) => param.name === 'rampElastomer')?.label).toBe('Moulded rubber');
    expect(colorParams.find((param) => param.name === 'coverPolymer')?.label).toBe('High-visibility polymer lid');
    expect(colorParams.find((param) => param.name === 'anchorSteel')?.label).toBe('Galvanized anchor steel');
    expect(Object.keys(asset.presets)).toEqual(['fleetReady', 'nightService']);
    expect(Object.keys(asset.presets.fleetReady!).sort()).toEqual(['anchorSteel', 'coverPolymer', 'rampElastomer']);
    expect(asset.description).not.toMatch(/stainless|powder/i);
    expect(asset.stats.triangles).toBe(240);
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
    const anchors = ['anchor-left', 'anchor-right', 'anchor-left-rear', 'anchor-right-rear'];
    expectFinish(['ramp-base', 'center-divider', 'end-slope-left', 'end-slope-right'], '#474b50', 'the moulded rubber finish');
    expectFinish(['cover-left', 'cover-right'], '#f2b824', 'the polymer lid finish');
    expectFinish(anchors, '#b5c0c2', 'the anchor steel finish');

    // GLB is Y up: X is the cable run, Y is height, Z is the driving direction.
    const vertices = (name: string) => {
      const node = nodeFor(name);
      const m = node.getWorldMatrix();
      return node.getMesh()!.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION')!;
        return Array.from({ length: position.getCount() }, (_, index) => {
          const [x, y, z] = position.getElement(index, []) as [number, number, number];
          return [
            m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
            m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
            m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
          ];
        });
      });
    };
    const halfDepthAt = (name: string, height: number) =>
      Math.max(...vertices(name).filter((v) => Math.abs(v[1]! - height) < 1e-4).map((v) => Math.abs(v[2]!)));

    // The base is a drive-over ramp: its two long flanks slope from the ground to the lid deck.
    expect(halfDepthAt('ramp-base', 0)).toBeCloseTo(0.25, 4);
    expect(halfDepthAt('ramp-base', 0.07)).toBeCloseTo(0.11, 4);
    const base = getBounds(nodeFor('ramp-base'));
    expect(base.min[0]).toBeCloseTo(-0.56, 4);
    expect(base.max[0]).toBeCloseTo(0.56, 4);

    // Each lid lies on the deck, a few millimetres proud, inside the deck width.
    for (const name of ['cover-left', 'cover-right']) {
      const cover = getBounds(nodeFor(name));
      expect(cover.max[1]! - base.max[1]!, `${name} should be a thin lid on the deck`).toBeGreaterThan(0.003);
      expect(cover.max[1]! - base.max[1]!, `${name} should be a thin lid on the deck`).toBeLessThanOrEqual(0.0081);
      expect(Math.max(Math.abs(cover.min[2]!), Math.abs(cover.max[2]!)), `${name} should stay on the deck`).toBeLessThan(0.11);
    }

    // Each end slope falls from deck height at the base end to the ground at the tip.
    for (const [name, sign] of [['end-slope-left', -1], ['end-slope-right', 1]] as const) {
      const points = vertices(name);
      const top = points.filter((v) => Math.abs(v[1]! - 0.07) < 1e-4);
      expect(top.length, `${name} should reach deck height`).toBeGreaterThan(0);
      expect(top.every((v) => Math.abs(v[0]! - sign * 0.56) < 1e-4), `${name} should peak at the base end`).toBe(true);
      expect(Math.max(...points.map((v) => sign * v[0]!)), `${name} tip`).toBeCloseTo(0.62, 4);
    }

    // Each anchor head stands above the flank surface, so it shows.
    for (const name of anchors) {
      const anchor = getBounds(nodeFor(name));
      const centreDepth = Math.abs((anchor.min[2]! + anchor.max[2]!) / 2);
      const flankHeight = (0.25 - centreDepth) * 0.5;
      expect(centreDepth, `${name} should sit on a flank`).toBeGreaterThan(0.11);
      expect(anchor.max[1]! - flankHeight, `${name} head should stand above the flank`).toBeGreaterThan(0.008);
      expect(anchor.min[1], `${name} should reach the ground`).toBeCloseTo(0, 5);
    }

    const all = getBounds(document.getRoot().listScenes()[0]!);
    expect(all.max[0]! - all.min[0]!).toBeCloseTo(1.24, 3);
    expect(all.max[1]! - all.min[1]!).toBeCloseTo(0.078, 3);
    expect(all.max[2]! - all.min[2]!).toBeCloseTo(0.5, 3);
  }, 120_000);
});
