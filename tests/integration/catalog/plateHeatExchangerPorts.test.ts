// SPDX-License-Identifier: MIT
// Four connected, open fitting interfaces are a scene-identity requirement.
// These checks do not establish pressure, thermal or manufacturing acceptance.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';

type V = [number, number, number];
type Triangle = [V, V, V];
const root = resolve(import.meta.dirname, '../../..');
const source = readFileSync(resolve(root, 'catalog/kits/industrial-plant/plate-heat-exchanger.kcad.ts'), 'utf8');
const centers = [[-55, 130], [55, 130], [-55, 500], [55, 500]];

async function parts(code: string, scale = 1): Promise<Map<string, Triangle[]>> {
  const result = await runAndExport({ code, fileName: 'plate-heat-exchanger.kcad.ts',
    scriptDir: resolve(root, 'catalog/kits/industrial-plant'), format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 1400 } } });
  expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const doc = await new NodeIO().readBinary(result.bytes);
  const out = new Map<string, Triangle[]>();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    const triangles: Triangle[] = [];
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION')!;
      const indices = primitive.getIndices();
      const count = indices?.getCount() ?? positions.getCount();
      const point = (i: number): V => {
        const v = positions.getElement(indices?.getScalar(i) ?? i, []);
        const world = [0, 1, 2].map(k => 1000 / scale *
          (m[k]! * v[0]! + m[k + 4]! * v[1]! + m[k + 8]! * v[2]! + m[k + 12]!));
        return [world[0]!, -world[2]!, world[1]!];
      };
      for (let i = 0; i < count; i += 3) triangles.push([point(i), point(i + 1), point(i + 2)]);
    }
    // A fused fitting can retain several material zones with the same part name.
    out.set(node.getName(), [...(out.get(node.getName()) ?? []), ...triangles]);
  }
  return out;
}

function xRayHits(triangles: Triangle[], y: number, z: number): boolean {
  return triangles.some(([a, b, c]) => {
    const d = (b[2] - c[2]) * (a[1] - c[1]) + (c[1] - b[1]) * (a[2] - c[2]);
    if (Math.abs(d) < 1e-8) return false;
    const u = ((b[2] - c[2]) * (y - c[1]) + (c[1] - b[1]) * (z - c[2])) / d;
    const v = ((c[2] - a[2]) * (y - c[1]) + (a[1] - c[1]) * (z - c[2])) / d;
    return u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6;
  });
}

function accept(meshes: Map<string, Triangle[]>, endX = 184.8, height = 620, count = 9): void {
  const ports = [...meshes.keys()].filter(name => /^port-\d+$/.test(name));
  expect(ports).toHaveLength(4);
  expect([...meshes.keys()].filter(name => name.startsWith('heat-plate-'))).toHaveLength(count);
  const plate = meshes.get('fixed-end-plate')!;
  expect(Math.min(...plate.flat().map(v => v[2]))).toBeCloseTo(0, 2);
  expect(Math.max(...plate.flat().map(v => v[2]))).toBeCloseTo(height, 2);
  const plateXs = plate.flat().map(v => v[0]);
  expect(Math.min(...plateXs)).toBeCloseTo(-endX - 16, 2);
  expect(Math.max(...plateXs)).toBeCloseTo(-endX + 16, 2);
  for (const [i, [y, nominalZ]] of centers.entries()) {
    const z = nominalZ * height / 620;
    const port = meshes.get(`port-${i}`)!;
    expect(port, `connection ${i} exists`).toBeDefined();
    const points = port.flat();
    expect(Math.min(...points.map(v => v[0])), '62 mm outward projection').toBeCloseTo(-endX - 78, 2);
    expect(Math.max(...points.map(v => v[0])), 'fitting seats on fixed plate').toBeCloseTo(-endX - 16, 2);
    expect((Math.min(...points.map(v => v[1])) + Math.max(...points.map(v => v[1]))) / 2).toBeCloseTo(y, 2);
    expect((Math.min(...points.map(v => v[2])) + Math.max(...points.map(v => v[2]))) / 2).toBeCloseTo(z, 2);
    expect(xRayHits(port, y, z), 'fitting bore is open').toBe(false);
    expect(xRayHits(plate, y, z), 'plate has a matching through bore').toBe(false);
    expect(xRayHits(port, y, z + 20), 'annular pipe wall remains').toBe(true);
    expect(xRayHits(plate, y, z + 20), 'plate stock around bore remains').toBe(true);
  }
}

beforeAll(async () => { await initOcct(); }, 60_000);
describe('plate heat exchanger connection geometry', () => {
  for (const scale of [0.65, 1, 1.35]) {
    it(`retains four seated, open ports at scale ${scale}`, async () => {
      const code = source.replace("param('scale', 1,", `param('scale', ${scale},`);
      accept(await parts(code, scale));
    }, 60_000);
  }
  it('rebuilds useful plate count and height controls while preserving the four connections', async () => {
    for (const [count, height, endX] of [[5, 480, 118.3], [13, 800, 251.3]]) {
      const code = source.replace("param('plateCount', '9',", `param('plateCount', '${count}',`)
        .replace("param('plateHeight', 620,", `param('plateHeight', ${height},`);
      expect(code).not.toBe(source);
      accept(await parts(code), endX, height, count);
    }
  }, 60_000);
  it('rejects a two-port regression even when the geometry exports', async () => {
    const code = source.replace('portCenters.entries()', 'portCenters.slice(0, 2).entries()');
    expect(code).not.toBe(source);
    const awaitParts = await parts(code);
    expect(() => accept(awaitParts)).toThrow();
  }, 60_000);
  it('rejects capped fittings even when four named parts exist', async () => {
    const code = source.replaceAll(".hole('top', { u: 0, v: 0, diameter: boreDiameter, depth: 'through' })", '');
    expect(code).not.toBe(source);
    const meshes = await parts(code);
    expect(() => accept(meshes)).toThrow();
  }, 60_000);
});
