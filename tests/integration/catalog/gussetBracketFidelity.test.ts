// SPDX-License-Identifier: MIT
// Regression: the old scene had an upright, wall-plane triangular plate, not
// a web spanning wall to toe, and had no mounting bores. Test exported geometry.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, type SoftTriangle } from '../../../scripts/lib/glbSoftwareRender';

type Vec = [number, number, number];
const root = resolve(import.meta.dirname, '../../..');
const file = resolve(root, 'catalog/kits/standard-components/gusset-bracket.kcad.ts');
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// Two-sided Möller-Trumbore line/triangle intersection. A through-hole has
// no surface intersections along its centreline; adjacent plate material does.
function rayHit(tris: SoftTriangle[], start: Vec, direction: Vec): boolean {
  return tris.some(({ v }) => {
    const e1 = sub(v[1], v[0]);
    const e2 = sub(v[2], v[0]);
    const p = cross(direction, e2);
    const determinant = dot(e1, p);
    if (Math.abs(determinant) < 1e-10) return false;
    const inv = 1 / determinant;
    const t = sub(start, v[0]);
    const u = dot(t, p) * inv;
    if (u < 0 || u > 1) return false;
    const q = cross(t, e1);
    const w = dot(direction, q) * inv;
    if (w < 0 || u + w > 1) return false;
    const distance = dot(e2, q) * inv;
    return distance > 1e-7 && distance < 0.1;
  });
}

function verifyShape(tris: SoftTriangle[], scale: number): void {
  const vertices = tris.flatMap(t => t.v);
  for (const [axis, low, high] of [
    [0, -0.028, 0.028], [1, 0, 0.044], [2, -0.003, 0.043],
  ] as const) {
    expect(Math.min(...vertices.map(p => p[axis]))).toBeCloseTo(low * scale, 5);
    expect(Math.max(...vertices.map(p => p[axis]))).toBeCloseTo(high * scale, 5);
  }
  // A diagonal web occupies the narrow centre plane and reaches both the
  // toe and the upright. A flat triangle on the wall plane cannot pass this.
  for (const [up, depth] of [[0.006, 0.041], [0.006, 0.003], [0.038, 0.003]]) {
    expect(vertices.some(v => Math.abs(Math.abs(v[0]) - 0.0025 * scale) < 1e-6
      && Math.abs(v[1] - up * scale) < 1e-6
      && Math.abs(v[2] - depth * scale) < 1e-6)).toBe(true);
  }
  for (const sign of [-1, 1]) {
    // Wall: axis normal to wall = GLB Z; hole center X=+-18, up=31 mm.
    expect(rayHit(tris, [sign * 0.018 * scale, 0.031 * scale, -0.01 * scale], [0, 0, 1])).toBe(false);
    expect(rayHit(tris, [sign * 0.026 * scale, 0.031 * scale, -0.01 * scale], [0, 0, 1])).toBe(true);
    // Toe: axis normal to foot = GLB Y; hole center X=+-18, depth=30 mm.
    expect(rayHit(tris, [sign * 0.018 * scale, -0.01 * scale, 0.03 * scale], [0, 1, 0])).toBe(false);
    expect(rayHit(tris, [sign * 0.026 * scale, -0.01 * scale, 0.03 * scale], [0, 1, 0])).toBe(true);
  }
}

beforeAll(async () => { await initOcct(); }, 30000);

describe('CC0 gusset bracket visible construction and true mounting interfaces', () => {
  it('exports a connected-looking right-angle assembly with 4 real bores at the default size', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, 'catalog/kits/standard-components/gusset-bracket.kcad.ts');
    const tris = await glbTriangles(glb);
    expect(asset.license).toBe('CC0-1.0');
    expect(asset.description).toMatch(/not a load-rated fabrication drawing/i);
    expect(tris.length).toBeGreaterThan(200);
    expect(tris.length).toBeLessThanOrEqual(asset.triangleBudget);
    verifyShape(tris, 1);
  }, 40000);
  it('preserves bores and touching plate envelope at both declared size extremes', async () => {
    const source = readFileSync(file, 'utf8');
    for (const [size, scale] of [['compact', 0.75], ['large', 1.25]] as const) {
      const code = source.replace("param('size', 'standard'", `param('size', '${size}'`);
      expect(code).not.toBe(source);
      const exported = await runAndExport({ code,
        fileName: 'gusset-bracket.kcad.ts', scriptDir: resolve(file, '..'),
        format: 'glb', options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 380 } },
      });
      expect(exported.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      verifyShape(await glbTriangles(exported.bytes), scale);
    }
  }, 80000);
});
