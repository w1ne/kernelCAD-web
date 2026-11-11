// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { NodeIO } from '@gltf-transform/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles } from '../../../scripts/lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/grid-substation/substation-center-break-disconnector.kcad.ts';
const sourceFile = resolve(repoRoot, source);

beforeAll(async () => {
  await initOcct();
}, 120_000);

const partBounds = async (glb: Uint8Array, partName: string) => {
  const document = await new NodeIO().readBinary(glb);
  const node = document.getRoot().listNodes().find(candidate => candidate.getName() === partName);
  if (node?.getMesh() === null || node?.getMesh() === undefined) {
    throw new Error(`Missing exported catalog part: ${partName}`);
  }
  const world = node.getWorldMatrix();
  const points = node.getMesh().listPrimitives().flatMap(primitive => {
    const position = primitive.getAttribute('POSITION');
    if (position === null) return [];
    return Array.from({ length: position.getCount() }, (_, index) => {
      const point = position.getElement(index, []);
      return [
        world[0]! * point[0]! + world[4]! * point[1]! + world[8]! * point[2]! + world[12]!,
        world[1]! * point[0]! + world[5]! * point[1]! + world[9]! * point[2]! + world[13]!,
        world[2]! * point[0]! + world[6]! * point[1]! + world[10]! * point[2]! + world[14]!,
      ];
    });
  });
  return {
    min: [0, 1, 2].map(axis => Math.min(...points.map(point => point[axis]!))),
    max: [0, 1, 2].map(axis => Math.max(...points.map(point => point[axis]!))),
  };
};

const contactTipDistance = async (glb: Uint8Array) => {
  const a = await partBounds(glb, 'phase-2-contact-insert-a');
  const b = await partBounds(glb, 'phase-2-contact-insert-b');
  const center = (bounds: Awaited<ReturnType<typeof partBounds>>) =>
    [0, 1, 2].map(axis => (bounds.min[axis]! + bounds.max[axis]!) / 2);
  const aCenter = center(a);
  const bCenter = center(b);
  // GLB's X/Z plane corresponds to the source model's horizontal plane.
  return Math.hypot(aCenter[0]! - bCenter[0]!, aCenter[2]! - bCenter[2]!);
};

describe('grid-substation/substation-center-break-disconnector', () => {
  it('seats paired aluminum arms on porcelain supports and exposes a real open/closed center gap', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    const nodes = (await new NodeIO().readBinary(glb)).getRoot().listNodes();
    const names = nodes.map(node => node.getName());

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter(param => param.type === 'color').map(param => param.name)).toEqual([
      'galvanizedSteel', 'porcelain', 'aluminum', 'powderCoat',
    ]);
    expect(asset.palette.find(zone => zone.name === 'aluminum')?.parts).toEqual(
      expect.arrayContaining(['phase-2-blade-arm-a', 'phase-2-blade-arm-b', 'phase-2-blade-pivot-a']),
    );
    expect(names.filter(name => /^phase-\d-blade-arm-[ab]$/.test(name))).toHaveLength(6);
    expect(names.filter(name => /^phase-\d-contact-insert-[ab]$/.test(name))).toHaveLength(6);
    expect(names).not.toContain('phase-2-blade');

    const leftArm = await partBounds(glb, 'phase-2-blade-arm-a');
    const leftPivot = await partBounds(glb, 'phase-2-blade-pivot-a');
    expect([0, 1, 2].every(axis =>
      leftArm.min[axis]! <= leftPivot.max[axis]! + 0.001 &&
      leftPivot.min[axis]! <= leftArm.max[axis]! + 0.001,
    )).toBe(true);
    expect(await contactTipDistance(glb)).toBeGreaterThan(0.25);

    const sourceText = readFileSync(sourceFile, 'utf8');
    const closedCode = sourceText.replace('param("switchState", "open"', 'param("switchState", "closed"');
    expect(closedCode).not.toBe(sourceText);
    const closedExport = await runAndExport({
      code: closedCode,
      fileName: 'substation-center-break-disconnector.kcad.ts',
      scriptDir: resolve(sourceFile, '..'),
      format: 'glb',
      options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
    });
    expect(closedExport.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
    expect(await contactTipDistance(closedExport.bytes)).toBeLessThan(0.05);

    const triangles = await glbTriangles(glb);
    const aluminumColor = [185 / 255, 193 / 255, 197 / 255];
    const copperContactColor = [184 / 255, 117 / 255, 69 / 255];
    for (const color of [aluminumColor, copperContactColor]) {
      expect(triangles.some(triangle => triangle.color.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      ))).toBe(true);
    }
  }, 120_000);
});
