// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/palletizer-robot-cell.kcad.ts';
type Bounds = { min: number[]; max: number[] };

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/palletizer-robot-cell fidelity', () => {
  it('shows a guarded work cell with a robot, roller infeed and loaded pallet', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeGreaterThan(3000);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 5);
    const dimensions = [...asset.stats.sizeM].sort((a, b) => b - a);
    expect(dimensions[0]).toBeGreaterThan(4);
    expect(dimensions[1]).toBeGreaterThan(3.5);
    expect(dimensions[2]).toBeGreaterThan(1.8);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'concrete', 'steel', 'safetyPaint', 'carton',
    ]);
    expect(asset.presets.weathered).toMatchObject({ concrete: '#777a75' });
    expect(asset.presets.weathered.carton).toBe('#805239');
    expect(asset.presets.highVisibility).toMatchObject({ concrete: '#b5b8b3', safetyPaint: '#f5c640' });
    expect(asset.presets.highVisibility.carton).toBe('#c58a55');

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const boundsFor = (name: string): Bounds | undefined => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      const mesh = node?.getMesh();
      if (node === undefined || mesh === null || mesh === undefined) return undefined;
      const world = node.getWorldMatrix();
      const vertices = mesh.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION');
        if (position === null) return [];
        return Array.from({ length: position.getCount() }, (_, index) => {
          const point = position.getElement(index, []);
          return [0, 1, 2].map((axis) => 1000 * (
            world[axis]! * point[0]! + world[axis + 4]! * point[1]! + world[axis + 8]! * point[2]! + world[axis + 12]!
          ));
        });
      });
      return {
        min: [0, 1, 2].map((axis) => Math.min(...vertices.map((point) => point[axis]!))),
        max: [0, 1, 2].map((axis) => Math.max(...vertices.map((point) => point[axis]!))),
      };
    };
    const partNames = new Set(nodes.map((node) => node.getName()));
    for (const name of [
      'cell-floor', 'safety-fence-frame', 'access-gate', 'infeed-frame-left',
      'infeed-frame-right', 'infeed-foot-left-1', 'infeed-carton', 'pallet-frame',
      'pallet-timber-runner-1', 'pallet-timber-slat-1', 'robot-base', 'robot-arm',
    ]) {
      expect(partNames.has(name), `${name} should be a rendered component`).toBe(true);
    }
    const rollers = [...partNames].filter((name) => /^infeed-roller-\d+$/.test(name));
    expect(rollers).toHaveLength(11);
    expect([...partNames].filter((name) => /^infeed-foot-(left|right)-\d+$/.test(name))).toHaveLength(6);
    for (const name of rollers) {
      const bounds = boundsFor(name)!;
      expect(bounds.max[0]! - bounds.min[0]!, `${name} spans the conveyor width`).toBeCloseTo(1030, 0);
      expect(bounds.max[2]! - bounds.min[2]!, `${name} has a round roller section`).toBeGreaterThan(90);
    }
    const gateMesh = boundsFor('access-gate')!;
    expect(gateMesh.max[1]! - gateMesh.min[1]!, 'gate is open mesh, not a solid panel').toBeGreaterThan(1400);
    expect(gateMesh.max[0]! - gateMesh.min[0]!).toBeGreaterThan(800);
    expect([...partNames].filter((name) => /^pallet-carton-\d-\d-\d$/.test(name))).toHaveLength(8);
    expect([...partNames].filter((name) => /^pallet-timber-runner-\d$/.test(name))).toHaveLength(3);
    expect([...partNames].filter((name) => /^pallet-timber-slat-\d$/.test(name))).toHaveLength(7);
    const robotBounds = boundsFor('robot-arm')!;
    expect(robotBounds.max[0]! - robotBounds.min[0]!, 'robot has a posed articulated reach').toBeGreaterThan(1800);
    expect(robotBounds.max[1]! - robotBounds.min[1]!, 'robot arm has substantial height above its base').toBeGreaterThan(900);
    const robotBaseBounds = boundsFor('robot-base')!;
    expect(Math.max(robotBaseBounds.max[1]!, robotBounds.max[1]!) - Math.min(robotBaseBounds.min[1]!, robotBounds.min[1]!))
      .toBeGreaterThan(1600);
    const palletBounds = boundsFor('pallet-frame')!;
    expect(palletBounds.max[0]! - palletBounds.min[0]!).toBeGreaterThan(1300);
    expect(palletBounds.max[1]! - palletBounds.min[1]!, 'station has a raised deck and pallet structure').toBeGreaterThan(300);

    const toSrgb = (channel: number) =>
      channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
    const colorsFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      return node?.getMesh()?.listPrimitives().flatMap((primitive) => {
        const colors: number[][] = [];
        const vertexColors = primitive.getAttribute('COLOR_0');
        if (vertexColors !== null) {
          colors.push(...Array.from({ length: vertexColors.getCount() }, (_, index) => {
            const color = vertexColors.getElement(index, []);
            return color.slice(0, 3).map(toSrgb);
          }));
        }
        const material = primitive.getMaterial();
        if (material !== null) colors.push(material.getBaseColorFactor().slice(0, 3));
        return colors;
      }) ?? [];
    };
    const matches = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      );
    };

    for (const [part, expected] of [
      ['cell-floor', '#8a8e89'],
      ['safety-fence-frame', '#e9a43b'],
      ['infeed-carton', '#b47a4e'],
      ['robot-base', '#53636a'],
      ['robot-arm', '#e9a43b'],
      ['infeed-frame-left', '#53636a'],
      ['infeed-foot-left-1', '#e9a43b'],
      ['pallet-frame', '#53636a'],
      ['pallet-timber-runner-1', '#9d7446'],
      ['pallet-timber-slat-1', '#b28a55'],
    ]) {
      const colors = colorsFor(part);
      expect(colors.length, `${part} should render`).toBeGreaterThan(0);
      expect(colors.some(matches(expected)), `${part} should use ${expected}`).toBe(true);
    }
    const png = await renderTrianglesPng(await glbTriangles(glb), {
      label: `${asset.title} · ${asset.stats.triangles} tris`,
    });
    const previewPath = resolve(repoRoot, 'catalog/kits/industrial-plant/previews/palletizer-robot-cell.png');
    expect(Buffer.from(png).equals(readFileSync(previewPath)), 'committed preview matches rendered source').toBe(true);
    const evidenceDir = process.env.KCAD_PALLETIZER_EVIDENCE_DIR;
    if (evidenceDir !== undefined) {
      mkdirSync(evidenceDir, { recursive: true });
      writeFileSync(resolve(evidenceDir, 'palletizer-after.glb'), glb);
      writeFileSync(resolve(evidenceDir, 'palletizer-after.png'), png);
      writeFileSync(resolve(evidenceDir, 'asset-entry.json'), JSON.stringify(asset, null, 2));
    }
  }, 120_000);
});
