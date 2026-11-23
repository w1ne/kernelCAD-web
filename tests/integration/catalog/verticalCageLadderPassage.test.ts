// SPDX-License-Identifier: MIT
// Static CC0 visual identity and clear-corridor checks, not access-ladder certification.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';

type Vec = [number, number, number];
type Triangle = [Vec, Vec, Vec];
const root = resolve(import.meta.dirname, '../../..');
const file = 'catalog/kits/industrial-plant/vertical-cage-ladder.kcad.ts';
const source = readFileSync(resolve(root, file), 'utf8');
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

async function triangles(bytes: Uint8Array): Promise<Map<string, Triangle[]>> {
  const doc = await new NodeIO().readBinary(bytes);
  const result = new Map<string, Triangle[]>();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const matrix = node.getWorldMatrix(), body: Triangle[] = [];
    for (const primitive of mesh.listPrimitives()) {
      const position = primitive.getAttribute('POSITION')!, indices = primitive.getIndices();
      for (let i = 0; i < (indices?.getCount() ?? position.getCount()); i += 3) {
        body.push([0, 1, 2].map((j) => {
          const v = position.getElement(indices ? indices.getScalar(i + j) : i + j, []);
          const world = [0, 1, 2].map((axis) => 1000 * (matrix[axis]! * v[0]!
            + matrix[axis + 4]! * v[1]! + matrix[axis + 8]! * v[2]! + matrix[axis + 12]!));
          // GLB is Y-up/metres; all probes below use authored Z-up/mm coordinates.
          return [world[0]!, -world[2]!, world[1]!] as Vec;
        }) as Triangle);
      }
    }
    result.set(node.getName(), body);
  }
  return result;
}

function hit(tris: Triangle[], origin: Vec, direction: Vec, length: number): boolean {
  return tris.some(([a, b, c]) => {
    const e1 = sub(b, a), e2 = sub(c, a), h = cross(direction, e2), determinant = dot(e1, h);
    if (Math.abs(determinant) < 1e-8) return false;
    const f = 1 / determinant, q = sub(origin, a), u = f * dot(q, h), r = cross(q, e1);
    const v = f * dot(direction, r), distance = f * dot(e2, r);
    return u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7 && distance > 1e-6 && distance < length;
  });
}

function assertOpenCorridor(parts: Map<string, Triangle[]>, scale: number, sectionHeight = 1035): void {
  const railHeight = sectionHeight - 105;
  const all = [...parts.values()].flat();
  expect([...parts.keys()].filter((name) => /^rung-\d$/.test(name))).toHaveLength(8);
  expect([...parts.keys()].filter((name) => /^safety-hoop-\d$/.test(name))).toHaveLength(4);
  expect([...parts.keys()].filter((name) => /^cage-upright-\d$/.test(name))).toHaveLength(3);
  for (const x of [-40, 0, 40]) for (const y of [35, 65])
    expect(hit(all, [x * scale, y * scale, railHeight * 0.3 * scale], [0, 0, 1], railHeight * 0.55 * scale)).toBe(false);
  // Positive controls prevent an empty or deleted cage from passing the void probes.
  expect(hit(all, [0, 288 * scale, railHeight * 0.3 * scale], [0, 0, 1], railHeight * 0.55 * scale)).toBe(true);
  expect(hit(all, [-88.2 * scale, 0, -10 * scale], [0, 0, 1], (sectionHeight + 15) * scale)).toBe(true);
  for (const fraction of [0.35, 0.5, 0.65, 0.8]) {
    const z = railHeight * fraction;
    expect(hit(all, [0, 20 * scale, z * scale], [0, 1, 0], 240 * scale)).toBe(false);
    expect(hit(all, [0, 20 * scale, z * scale], [0, 1, 0], 290 * scale)).toBe(true);
  }
}

async function exportSource(code: string): Promise<Map<string, Triangle[]>> {
  const output = await runAndExport({ code, fileName: 'vertical-cage-ladder.kcad.ts',
    scriptDir: resolve(root, 'catalog/kits/industrial-plant'), format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 1400 } } });
  expect(output.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return triangles(output.bytes);
}

beforeAll(async () => { await initOcct(); }, 60_000);
describe('vertical cage ladder open passage', () => {
  it('keeps a clear climbing corridor through four real cage hoops', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, file);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM[1]).toBeCloseTo(1.035, 5);
    expect(asset.stats.minUpM).toBeCloseTo(0, 5);
    expect(asset.description).toContain('1035 mm');
    expect(asset.params.find((p) => p.name === 'sectionHeight')).toMatchObject({ type: 'number', default: 1035, min: 900, max: 1800, unit: 'mm' });
    assertOpenCorridor(await triangles(glb), 1);
  }, 60_000);

  it('detects the original solid cylinders blocking the same corridor', async () => {
    const old = readFileSync(resolve(root, 'tests/fixtures/catalog/verticalCageLadderOriginal.kcad.ts'), 'utf8');
    const all = [...(await exportSource(old)).values()].flat();
    for (const x of [-40, 0, 40]) for (const y of [35, 65])
      expect(hit(all, [x, y, 300], [0, 0, 1], 500)).toBe(true);
  }, 60_000);

  it('moves rungs and all cage straps when section height changes to either limit', async () => {
    for (const height of [900, 1800]) {
      const code = source.replace("param('sectionHeight', 1035,", `param('sectionHeight', ${height},`);
      expect(code).not.toBe(source);
      const parts = await exportSource(code);
      assertOpenCorridor(parts, 1, height);
      const points = [...parts.values()].flat(2);
      expect(Math.max(...points.map((p) => p[2]))).toBeCloseTo(height, 1);
      const rung = parts.get('rung-7')!.flat();
      expect(Math.min(...rung.map((p) => p[2]))).toBeCloseTo(height - 149, 1);
    }
  }, 60_000);

  it('keeps the opening and surrounding guard geometry at both scale limits', async () => {
    for (const scale of [0.65, 1.35]) {
      const code = source.replace("param('scale', 1,", `param('scale', ${scale},`);
      expect(code).not.toBe(source);
      assertOpenCorridor(await exportSource(code), scale);
    }
  }, 60_000);
});
