// SPDX-License-Identifier: MIT
// A scene prop still needs separate bar layers and closed ties, not a floating grid.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

type Bounds = { min: number[]; max: number[]; triangles: number[][][] };
const root = resolve(import.meta.dirname, '../../..');
const path = 'catalog/kits/construction-equipment/rebar-cage.kcad.ts';
const source = readFileSync(resolve(root, path), 'utf8');

async function parts(bytes: Uint8Array): Promise<Map<string, Bounds>> {
  const doc = await new NodeIO().readBinary(bytes);
  const out = new Map<string, Bounds>();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    const triangles: number[][][] = [];
    const vertices = mesh.listPrimitives().flatMap((primitive) => {
      const pos = primitive.getAttribute('POSITION')!;
      const points = Array.from({ length: pos.getCount() }, (_, i) => {
        const v = pos.getElement(i, []);
        return [0, 1, 2].map(k => 1000 * (m[k]! * v[0]! + m[k + 4]! * v[1]! + m[k + 8]! * v[2]! + m[k + 12]!));
      });
      const indices = primitive.getIndices();
      const count = indices?.getCount() ?? points.length;
      for (let i = 0; i < count; i += 3) {
        triangles.push([0, 1, 2].map(j => points[indices ? indices.getScalar(i + j) : i + j]!));
      }
      return points;
    });
    out.set(node.getName(), {
      min: [0, 1, 2].map(k => Math.min(...vertices.map(v => v[k]!))),
      max: [0, 1, 2].map(k => Math.max(...vertices.map(v => v[k]!))),
      triangles,
    });
  }
  return out;
}

// Intersect a line parallel to X with each triangle in the YZ projection.
function throughX(body: Bounds, y: number, z: number): boolean {
  return body.triangles.some(([a, b, c]) => {
    const dy1 = b![1]! - a![1]!, dz1 = b![2]! - a![2]!;
    const dy2 = c![1]! - a![1]!, dz2 = c![2]! - a![2]!;
    const det = dy1 * dz2 - dz1 * dy2;
    if (Math.abs(det) < 1e-8) return false;
    const u = ((y - a![1]!) * dz2 - (z - a![2]!) * dy2) / det;
    const v = (dy1 * (z - a![2]!) - dz1 * (y - a![1]!)) / det;
    return u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6;
  });
}

function assertCage(meshes: Map<string, Bounds>, scale: number): void {
  const bars = [...meshes].filter(([name]) => name.startsWith('longitudinal-bar-')).map(([, b]) => b);
  expect(bars).toHaveLength(12);
  const centers = bars.map(b => b.min.map((v, k) => (v + b.max[k]!) / (2 * scale)));
  expect(new Set(centers.map(c => c.map(v => v.toFixed(2)).join(','))).size, 'every longitudinal bar has a unique centre').toBe(12);
  const layers = centers.map(c => c[1]!).sort((a, b) => a - b);
  expect(layers[6]! - layers[5]!, 'top and bottom layers form a three-dimensional cage').toBeGreaterThan(150);
  expect(layers.slice(0, 6).every(v => Math.abs(v - layers[0]!) < 0.01)).toBe(true);
  expect(layers.slice(6).every(v => Math.abs(v - layers[6]!) < 0.01)).toBe(true);
  const ties = [...meshes].filter(([name]) => name.startsWith('tie-ring-')).map(([, b]) => b);
  expect(ties).toHaveLength(8);
  for (const tie of ties) {
    expect((tie.max[1]! - tie.min[1]!) / scale, 'ties enclose the bar layers').toBeGreaterThan(200);
    expect((tie.max[2]! - tie.min[2]!) / scale, 'ties enclose the cage width').toBeGreaterThan(480);
    // Rays through the centre pass through the window; rays through each side hit steel.
    const midY = (tie.min[1]! + tie.max[1]!) / 2;
    const midZ = (tie.min[2]! + tie.max[2]!) / 2;
    expect(throughX(tie, midY, midZ), 'tie window is open').toBe(false);
    expect(throughX(tie, tie.min[1]! + 8 * scale, midZ), 'bottom tie side survives').toBe(true);
    expect(throughX(tie, tie.max[1]! - 8 * scale, midZ), 'top tie side survives').toBe(true);
    expect(throughX(tie, midY, tie.min[2]! + 8 * scale), 'left tie side survives').toBe(true);
    expect(throughX(tie, midY, tie.max[2]! - 8 * scale), 'right tie side survives').toBe(true);
  }
  const supports = [...meshes].filter(([name]) => name.startsWith('support-saddle-')).map(([, b]) => b);
  expect(supports).toHaveLength(2);
  const lowestTie = Math.min(...ties.map(b => b.min[1]!));
  for (const support of supports) expect(support.max[1]! / scale).toBeCloseTo(lowestTie / scale, 2);
}

async function variant(code: string): Promise<Map<string, Bounds>> {
  const out = await runAndExport({ code, fileName: 'rebar-cage.kcad.ts', scriptDir: resolve(root, 'catalog/kits/construction-equipment'), format: 'glb', options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 2200 } } });
  expect(out.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  return parts(out.bytes);
}

beforeAll(async () => { await initOcct(); }, 60_000);
describe('reinforcing bar cage geometry', () => {
  it('exports unique upper/lower bars, eight closed ties and seated supports', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, path);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    assertCage(await parts(glb), 1);
    const png = await renderTrianglesPng(await glbTriangles(glb), { label: `${asset.title} · ${asset.stats.triangles} tris` });
    const preview = resolve(root, 'catalog/kits/construction-equipment/previews/rebar-cage.png');
    if (process.env.KCAD_UPDATE_PREVIEW === '1') writeFileSync(preview, png);
    expect(Buffer.from(png).equals(readFileSync(preview)), 'committed preview matches source').toBe(true);
    if (process.env.KCAD_REBAR_EVIDENCE_DIR) {
      writeFileSync(resolve(process.env.KCAD_REBAR_EVIDENCE_DIR, 'rebar-cage-after.glb'), glb);
      writeFileSync(resolve(process.env.KCAD_REBAR_EVIDENCE_DIR, 'rebar-cage-after.png'), png);
      writeFileSync(resolve(process.env.KCAD_REBAR_EVIDENCE_DIR, 'rebar-cage-asset-entry.json'), JSON.stringify(asset, null, 2));
    }
  }, 60_000);
  it('preserves cage topology at both scale limits', async () => {
    for (const scale of [0.7, 1.3]) {
      assertCage(await variant(source.replace("param('scale', 1,", `param('scale', ${scale},`)), scale);
    }
  }, 60_000);
});
