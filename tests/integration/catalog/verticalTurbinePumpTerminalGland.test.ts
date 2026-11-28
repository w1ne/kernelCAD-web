// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

type Bounds = { min: number[]; max: number[] };
const root = resolve(import.meta.dirname, '../../..');
const file = 'catalog/kits/water-treatment/vertical-turbine-pump.kcad.ts';
const source = readFileSync(resolve(root, file), 'utf8');
const tolerance = 0.05; // GLB positions, in mm. Index 1 is up; 0 and 2 are plan axes.
const originalGland =
  "pump.part('terminal-gland', loftCylinder(36, 22, 8).rotateY(90).translate(280, 0, 1188).scale(scale).color(stainlessSteel));";

async function namedBounds(bytes: Uint8Array): Promise<Map<string, Bounds>> {
  const doc = await new NodeIO().readBinary(bytes);
  const result = new Map<string, Bounds>();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const matrix = node.getWorldMatrix();
    const points = mesh.listPrimitives().flatMap((primitive) => {
      const position = primitive.getAttribute('POSITION');
      if (!position) return [];
      return Array.from({ length: position.getCount() }, (_, index) => {
        const point = position.getElement(index, []);
        return [0, 1, 2].map((axis) => 1000 * (matrix[axis]! * point[0]!
          + matrix[axis + 4]! * point[1]! + matrix[axis + 8]! * point[2]! + matrix[axis + 12]!));
      });
    });
    result.set(node.getName(), {
      min: [0, 1, 2].map((axis) => Math.min(...points.map((point) => point[axis]!))),
      max: [0, 1, 2].map((axis) => Math.max(...points.map((point) => point[axis]!))),
    });
  }
  return result;
}

const overlaps = (a: Bounds, b: Bounds, axis: number) =>
  a.max[axis]! > b.min[axis]! + tolerance && b.max[axis]! > a.min[axis]! + tolerance;

/** The gland must hang from the terminal box underside, inside its footprint, clear of the motor. */
function glandFailures(parts: Map<string, Bounds>): string[] {
  const failures: string[] = [];
  const gland = parts.get('terminal-gland');
  const box = parts.get('terminal-box')!;
  if (!gland) return ['terminal-gland: missing'];
  if (Math.abs(gland.max[1]! - box.min[1]!) > tolerance) failures.push('terminal-gland: not seated on the box underside');
  if ([0, 2].some((axis) => gland.min[axis]! < box.min[axis]! - tolerance || gland.max[axis]! > box.max[axis]! + tolerance))
    failures.push('terminal-gland: outside the box footprint');
  for (const name of ['motor-housing', 'motor-cooling-rib-1', 'motor-pedestal']) {
    const other = parts.get(name)!;
    if ([0, 1, 2].every((axis) => overlaps(gland, other, axis))) failures.push(`terminal-gland: intersects ${name}`);
  }
  return failures;
}

async function variant(code: string): Promise<Map<string, Bounds>> {
  const output = await runAndExport({ code, fileName: 'vertical-turbine-pump.kcad.ts',
    scriptDir: resolve(root, file, '..'), format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 2800 } } });
  expect(output.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return namedBounds(output.bytes);
}

beforeAll(async () => { await initOcct(); }, 120_000);

describe('water-treatment/vertical-turbine-pump terminal gland', () => {
  it('seats the cable gland on the terminal box underside', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, file);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.palette.find((zone) => zone.name === 'stainlessSteel')?.parts).toContain('terminal-gland');
    expect(glandFailures(await namedBounds(glb))).toEqual([]);
  }, 120_000);

  it('rejects the original gland that floated beside the terminal cover', async () => {
    const code = source.replace(/^pump\.part\('terminal-gland'.*$/m, originalGland);
    expect(code).not.toBe(source);
    expect(glandFailures(await variant(code))).toEqual(expect.arrayContaining([
      'terminal-gland: not seated on the box underside',
      'terminal-gland: outside the box footprint',
    ]));
  }, 120_000);

  it('keeps the gland seated at both scale limits', async () => {
    for (const scale of [0.7, 1.3]) {
      const code = source.replace("param('scale', 1,", `param('scale', ${scale},`);
      expect(code).not.toBe(source);
      expect(glandFailures(await variant(code))).toEqual([]);
    }
  }, 120_000);
});
