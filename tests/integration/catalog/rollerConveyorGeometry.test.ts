// SPDX-License-Identifier: MIT
// Native geometry checks prevent transverse rollers becoming one longitudinal tube.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

type Bounds = { min: number[]; max: number[] };
const root = resolve(import.meta.dirname, '../../..');
const path = 'catalog/kits/industrial-plant/roller-conveyor-line.kcad.ts';
const source = readFileSync(resolve(root, path), 'utf8');

async function parts(bytes: Uint8Array): Promise<Map<string, Bounds>> {
  const doc = await new NodeIO().readBinary(bytes);
  const out = new Map<string, Bounds>();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    const vertices = mesh.listPrimitives().flatMap((primitive) => {
      const pos = primitive.getAttribute('POSITION')!;
      return Array.from({ length: pos.getCount() }, (_, i) => {
        const v = pos.getElement(i, []);
        return [0, 1, 2].map(k => 1000 * (m[k]! * v[0]! + m[k + 4]! * v[1]! + m[k + 8]! * v[2]! + m[k + 12]!));
      });
    });
    out.set(node.getName(), {
      min: [0, 1, 2].map(k => Math.min(...vertices.map(v => v[k]!))),
      max: [0, 1, 2].map(k => Math.max(...vertices.map(v => v[k]!))),
    });
  }
  return out;
}

function assertConveyor(meshes: Map<string, Bounds>, scale: number): void {
  const rollers = [...meshes].filter(([name]) => /^roller-\d+$/.test(name)).map(([, b]) => b);
  expect(rollers).toHaveLength(9);
  for (const roller of rollers) {
    expect((roller.max[2]! - roller.min[2]!) / scale, 'roller spans across travel, not along it').toBeCloseTo(300, 2);
    expect((roller.max[0]! - roller.min[0]!) / scale).toBeCloseTo(44, 2);
    expect((roller.min[2]! + roller.max[2]!) / scale).toBeCloseTo(0, 2);
  }
  rollers.sort((a, b) => a.min[0]! - b.min[0]!);
  for (let i = 1; i < rollers.length; i++) {
    expect((rollers[i]!.min[0]! - rollers[i - 1]!.max[0]!) / scale, 'adjacent rollers have an open gap').toBeGreaterThan(40);
  }
  const rails = [-1, 1].map(side => meshes.get(`side-frame-${side}`)!);
  for (const rail of rails) {
    expect(rail, 'both side frames exist').toBeDefined();
    expect(rail.min[0]! / scale).toBeLessThan(rollers[0]!.min[0]! / scale);
    expect(rail.max[0]! / scale).toBeGreaterThan(rollers[8]!.max[0]! / scale);
  }
  for (const side of [-1, 1]) {
    const rail = meshes.get(`side-frame-${side}`)!;
    for (let station = 0; station < 3; station++) {
      const support = meshes.get(`support-${side}-${station}`)!;
      const foot = meshes.get(`foot-${side}-${station}`)!;
      expect(support.max[1]! / scale, 'support reaches its rail').toBeCloseTo(rail.min[1]! / scale, 2);
      expect(support.min[1]! / scale, 'support rests on foot').toBeCloseTo(foot.max[1]! / scale, 2);
      expect(Math.min(support.max[2]!, rail.max[2]!) - Math.max(support.min[2]!, rail.min[2]!)).toBeGreaterThan(20 * scale);
    }
  }
  expect([...meshes.keys()].filter(name => name.startsWith('end-stop-'))).toHaveLength(2);
  expect(meshes.has('conveyor-deck'), 'open roller bed has no solid load-blocking deck').toBe(false);
}

async function variant(code: string): Promise<Map<string, Bounds>> {
  const out = await runAndExport({ code, fileName: 'roller-conveyor-line.kcad.ts', scriptDir: resolve(root, 'catalog/kits/industrial-plant'), format: 'glb', options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 1400 } } });
  expect(out.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  return parts(out.bytes);
}

beforeAll(async () => { await initOcct(); }, 60_000);
describe('roller conveyor geometry', () => {
  it('exports transverse separated rollers on connected supports', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, path);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    assertConveyor(await parts(glb), 1);
    const png = await renderTrianglesPng(await glbTriangles(glb), { label: `${asset.title} · ${asset.stats.triangles} tris` });
    const preview = resolve(root, 'catalog/kits/industrial-plant/previews/roller-conveyor-line.png');
    if (process.env.KCAD_UPDATE_PREVIEW === '1') writeFileSync(preview, png);
    expect(Buffer.from(png).equals(readFileSync(preview)), 'committed preview matches source').toBe(true);
    if (process.env.KCAD_CONVEYOR_EVIDENCE_DIR) {
      writeFileSync(resolve(process.env.KCAD_CONVEYOR_EVIDENCE_DIR, 'roller-conveyor-after.glb'), glb);
      writeFileSync(resolve(process.env.KCAD_CONVEYOR_EVIDENCE_DIR, 'roller-conveyor-after.png'), png);
      writeFileSync(resolve(process.env.KCAD_CONVEYOR_EVIDENCE_DIR, 'roller-conveyor-asset-entry.json'), JSON.stringify(asset, null, 2));
    }
  }, 60_000);
  it('keeps roller orientation and support contact at both scale limits', async () => {
    for (const scale of [0.65, 1.35]) {
      assertConveyor(await variant(source.replace("param('scale', 1,", `param('scale', ${scale},`)), scale);
    }
  }, 60_000);
});
