// SPDX-License-Identifier: MIT
// Check actual exported geometry, not only PNG delivery: six rungs previously
// floated beyond the 3 m rails, creating a visually plausible but broken prop.
import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, type SoftTriangle } from '../../../scripts/lib/glbSoftwareRender';

const sourceFile = resolve(import.meta.dirname, '../../../catalog/kits/grid-substation/substation-cable-ladder-section.kcad.ts');
let tris: SoftTriangle[];
let asset: Awaited<ReturnType<typeof buildCatalogAssetWithGlb>>['asset'];

beforeAll(async () => {
  await initOcct();
  const built = await buildCatalogAssetWithGlb(resolve(import.meta.dirname, '../../..'),
    'catalog/kits/grid-substation/substation-cable-ladder-section.kcad.ts');
  asset = built.asset;
  tris = await glbTriangles(built.glb);
}, 30000);

describe('substation cable ladder CC0 low-poly geometry', () => {
  it('has a 3 m envelope, visible low side rails and a 13-rung deck', () => {
    expect(asset.category).toBe('prop');
    expect(asset.description).toMatch(/illustrative low-poly/i);
    expect(tris.length).toBeGreaterThan(200);
    expect(tris.length).toBeLessThanOrEqual(asset.triangleBudget);
    const vertices = tris.flatMap(t => t.v);
    const range = (i: 0 | 1 | 2) => [Math.min(...vertices.map(v => v[i])), Math.max(...vertices.map(v => v[i]))] as const;
    expect(range(0)[0]).toBeCloseTo(-1.5, 4);
    expect(range(0)[1]).toBeCloseTo(1.5, 4);
    expect(range(1)[0]).toBeCloseTo(0, 4);
    expect(range(1)[1]).toBeCloseTo(0.132, 4);
    // The rung top is 72 mm above the ground. Side rails and mounting pads
    // do not have vertices at that height, so the x coordinates identify all rungs.
    const rungEdges = [...new Set(vertices
      .filter(v => Math.abs(v[1] - 0.072) < 1e-5)
      .map(v => Math.round(v[0] * 1e6) / 1e6))].sort((a, b) => a - b);
    expect(rungEdges).toHaveLength(26);
    for (let i = 0; i < 13; i++) {
      const left = rungEdges[2 * i]!;
      const right = rungEdges[2 * i + 1]!;
      expect(right - left).toBeCloseTo(0.055, 5);
      expect((left + right) / 2).toBeCloseTo(-1.350 + i * 0.225, 5);
      expect(Math.max(Math.abs(left), Math.abs(right))).toBeLessThan(1.5);
    }
  }, 30000);
  it('preserves every rung and its rail envelope at both supported scale limits', async () => {
    const source = readFileSync(sourceFile, 'utf8');
    for (const scale of [0.65, 1.35]) {
      const code = source.replace('param("scale", 1', `param("scale", ${scale}`);
      expect(code).not.toBe(source);
      const exported = await runAndExport({
        code, fileName: 'substation-cable-ladder-section.kcad.ts',
        scriptDir: resolve(sourceFile, '..'),
        format: 'glb', options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 1800 } },
      });
      expect(exported.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      const vertices = (await glbTriangles(exported.bytes)).flatMap(t => t.v);
      const xs = vertices.map(v => v[0]);
      expect(Math.min(...xs)).toBeCloseTo(-1.5 * scale, 4);
      expect(Math.max(...xs)).toBeCloseTo(1.5 * scale, 4);
      const top = 0.072 * scale;
      const rungEdges = [...new Set(vertices
        .filter(v => Math.abs(v[1] - top) < 1e-5)
        .map(v => Math.round(v[0] * 1e6) / 1e6))].sort((a, b) => a - b);
      expect(rungEdges).toHaveLength(26);
      for (let i = 0; i < 13; i++) {
        const center = (rungEdges[2 * i]! + rungEdges[2 * i + 1]!) / 2;
        expect(center).toBeCloseTo((-1.35 + 0.225 * i) * scale, 5);
      }
    }
  }, 30000);
});
