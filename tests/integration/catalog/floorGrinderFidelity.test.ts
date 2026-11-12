// SPDX-License-Identifier: MIT
// Regression for #1331: the source promised a circular grinder but exported a
// four-wheel cart with a rectangular shroud and a disc 100 mm above the floor.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const sourcePath = 'catalog/kits/construction-equipment/portable-floor-grinder.kcad.ts';
const file = resolve(root, sourcePath);
type Point = [number, number, number];

async function verifyGeometry(glb: Uint8Array, scale: number) {
  // Individual mesh positions remain in source millimetres; the scene root
  // supplies the metre scale and Z-up -> Y-up transform for GLB consumers.
  const doc = await new NodeIO().readBinary(glb);
  const parts = new Map<string, Point[]>();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const points: Point[] = [];
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION')!;
      for (let i = 0; i < positions.getCount(); i++) {
        points.push(positions.getElement(i, []) as Point);
      }
    }
    parts.set(node.getName(), points);
  }
  const range = (name: string, axis: number, low: number, high: number) => {
    expect(parts.has(name), name).toBe(true);
    const points = parts.get(name)!;
    expect(Math.min(...points.map(p => p[axis])), name).toBeCloseTo(low * scale, 2);
    expect(Math.max(...points.map(p => p[axis])), name).toBeCloseTo(high * scale, 2);
  };
  // Separate disc and open-bottom circular cup, not one opaque rectangular box.
  range('grinding-head', 0, -79, 259);
  range('grinding-head', 1, -169, 169);
  range('grinding-head', 2, 0, 12);
  range('dust-shroud', 0, -100, 280);
  range('dust-shroud', 1, -190, 190);
  range('dust-shroud', 2, 14, 84);
  const cup = parts.get('dust-shroud')!;
  const lowerRing = cup.filter(p => Math.abs(p[2] / scale - 14) < 0.01);
  expect(lowerRing.length).toBeGreaterThan(12);
  const radii = lowerRing.map(p => Math.hypot(p[0] / scale - 90, p[1] / scale));
  expect(Math.min(...radii)).toBeCloseTo(178, 2);
  expect(Math.max(...radii)).toBeCloseTo(190, 2);
  // Every lower-edge vertex belongs to a true circular inner/outer wall.
  for (const radius of radii) expect(Math.min(Math.abs(radius - 178), Math.abs(radius - 190))).toBeLessThan(0.01);
  // The cavity rises to Z=80 and leaves a 4 mm roof, independently of its label.
  expect(cup.some(p => Math.abs(p[2] / scale - 80) < 0.01)).toBe(true);

  expect([...parts.keys()].filter(name => /^rear-wheel-/.test(name))).toHaveLength(2);
  for (const side of [-1, 1]) {
    range(`rear-wheel-${side}`, 0, -322, -138);
    range(`rear-wheel-${side}`, 2, 0, 184);
    // Wheel front X=-138, shroud rear X=-100: 38 mm geometric clearance.
    const wheelMax = Math.max(...parts.get(`rear-wheel-${side}`)!.map(p => p[0]));
    const deckMin = Math.min(...cup.map(p => p[0]));
    expect((deckMin - wheelMax) / scale).toBeCloseTo(38, 2);
    const post = parts.get(`handle-post-${side}`)!;
    expect(Math.min(...post.map(p => p[0])) / scale).toBeLessThan(-500);
    expect(Math.max(...post.map(p => p[2])) / scale).toBeGreaterThan(895);
    range(`handle-grip-${side}`, 2, 877, 915);
  }
  expect(parts.has('dust-outlet')).toBe(true);
  const triangles = await glbTriangles(glb);
  expect(triangles.length).toBeLessThanOrEqual(2200);
  expect(Math.min(...triangles.flatMap(t => t.v.map(p => p[1])))).toBeCloseTo(0, 6);
  // Reject nonfinite or zero-area exported faces, not just a nonblank PNG.
  for (const { v: [a, b, c] } of triangles) {
    for (const point of [a, b, c]) expect(point.every(Number.isFinite)).toBe(true);
    const u = b.map((x, i) => x - a[i]);
    const v = c.map((x, i) => x - a[i]);
    expect(Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])).toBeGreaterThan(1e-12);
  }
}

beforeAll(async () => { await initOcct(); }, 30000);
describe('portable floor grinder scene fidelity', () => {
  it('exports a circular open-bottom shroud, floor-contact disc and two rear wheels', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, sourcePath);
    expect(asset.license).toBe('CC0-1.0');
    expect(asset.category).toBe('prop');
    expect(asset.description).toMatch(/not a manufacturing drawing/i);
    expect(asset.params.find(p => p.name === 'scale')).toMatchObject({ default: 1, min: 0.7, max: 1.3 });
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    await verifyGeometry(glb, 1);
  }, 40000);
  it('retains floor contact, cavity, handle and wheel clearance at both scale limits', async () => {
    const source = readFileSync(file, 'utf8');
    for (const scale of [0.7, 1.3]) {
      const code = source.replace("param('scale', 1", `param('scale', ${scale}`);
      expect(code).not.toBe(source);
      const exported = await runAndExport({ code, fileName: 'portable-floor-grinder.kcad.ts', scriptDir: resolve(file, '..'),
        format: 'glb', options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 2200 } } });
      expect(exported.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      await verifyGeometry(exported.bytes, scale);
    }
  }, 80000);
});
