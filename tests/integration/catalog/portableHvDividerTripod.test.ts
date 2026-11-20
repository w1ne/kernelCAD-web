// SPDX-License-Identifier: MIT
// Scene-prop identity: actual three-point support and no floating column.
// This does not establish electrical, structural or manufacturing acceptance.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';

type V = [number, number, number];
const root = resolve(import.meta.dirname, '../../..');
const sourcePath = 'catalog/kits/grid-substation/substation-portable-hv-test-divider.kcad.ts';
const source = readFileSync(resolve(root, sourcePath), 'utf8');

async function meshes(code: string, scale = 1): Promise<Map<string, V[]>> {
  const exported = await runAndExport({
    code, fileName: 'substation-portable-hv-test-divider.kcad.ts',
    scriptDir: resolve(root, 'catalog/kits/grid-substation'), format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 1800 } },
  });
  expect(exported.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const doc = await new NodeIO().readBinary(exported.bytes);
  const parts = new Map<string, V[]>();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    const points: V[] = [];
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION')!;
      for (let i = 0; i < positions.getCount(); i++) {
        const v = positions.getElement(i, []);
        const world = [0, 1, 2].map(k => 1000 / scale * (
          m[k]! * v[0]! + m[k + 4]! * v[1]! + m[k + 8]! * v[2]! + m[k + 12]!
        ));
        // Export is metres/Y-up; recover authored millimetres/Z-up.
        points.push([world[0]!, -world[2]!, world[1]!]);
      }
    }
    parts.set(node.getName(), points);
  }
  return parts;
}

function accept(parts: Map<string, V[]>): void {
  const legs = [...parts.entries()].filter(([name]) => name.startsWith('tripod-leg-'));
  expect(legs).toHaveLength(3);
  expect(parts.size).toBe(6); // Three legs, hub, continuous ceramic body, terminal.
  const bounds = (points: V[]) => [
    Math.min(...points.map(p => p[2])), Math.max(...points.map(p => p[2])),
  ];
  const feet: V[] = [];
  for (const [name, points] of legs) {
    const [bottom, top] = bounds(points);
    expect(bottom, `${name} reaches the common floor`).toBeCloseTo(0, 2);
    expect(top, `${name} reaches the hub underside`).toBeCloseTo(930, 2);
    const average = (rows: V[]): V => [0, 1, 2].map(k => rows.reduce((n, p) => n + p[k]!, 0) / rows.length) as V;
    const foot = average(points.filter(p => Math.abs(p[2]) < .01));
    const head = average(points.filter(p => Math.abs(p[2] - 930) < .01));
    feet.push(foot);
    expect(Math.hypot(foot[0], foot[1])).toBeGreaterThan(600);
    expect(Math.hypot(head[0], head[1])).toBeLessThan(400);
  }
  // Non-collinear ground contacts surround the column; three coincident or
  // collinear named legs would fail even though the part count is correct.
  const angles = feet.map(p => (Math.atan2(p[1], p[0]) * 180 / Math.PI + 360) % 360).sort((a, b) => a - b);
  for (let i = 0; i < 3; i++) expect((angles[(i + 1) % 3]! - angles[i]! + 360) % 360).toBeCloseTo(120, 0);
  const area = Math.abs((feet[1]![0] - feet[0]![0]) * (feet[2]![1] - feet[0]![1]) -
    (feet[1]![1] - feet[0]![1]) * (feet[2]![0] - feet[0]![0])) / 2;
  expect(area).toBeGreaterThan(500_000);
  for (const [name, low, high] of [['tripod-hub', 930, 1173], ['divider-column', 1173, 2380], ['top-terminal', 2380, 2550]] as const) {
    const [bottom, top] = bounds(parts.get(name)!);
    expect(bottom, `${name} bottom`).toBeCloseTo(low, 2);
    expect(top, `${name} top`).toBeCloseTo(high, 2);
  }
  // A broad shed at each of the six visible levels survives native export.
  const ceramic = parts.get('divider-column')!;
  for (const z of [1275, 1458.6, 1642.2, 1825.8, 2009.4, 2193]) {
    const vertices = ceramic.filter(p => p[2] >= z - .01 && p[2] <= z + 95.01);
    expect(Math.max(...vertices.map(p => Math.hypot(p[0], p[1])))).toBeGreaterThan(490);
  }
}

beforeAll(async () => { await initOcct(); }, 60_000);
describe('portable HV divider tripod identity', () => {
  for (const scale of [0.65, 1, 1.35]) {
    it(`has three splayed ground contacts and supports the column at scale ${scale}`, async () => {
      const code = source.replace('param("scale", 1,', `param("scale", ${scale},`);
      accept(await meshes(code, scale));
    }, 120_000);
  }
  it('rejects a two-legged negative control even if its export succeeds', async () => {
    const missingLeg = source.replace('[0, 120, 240].entries()', '[0, 120].entries()');
    expect(missingLeg).not.toBe(source);
    const parts = await meshes(missingLeg);
    expect(() => accept(parts)).toThrow();
  }, 120_000);
});
