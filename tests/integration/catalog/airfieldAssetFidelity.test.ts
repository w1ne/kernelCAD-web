// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { sourceWithParamValues } from '../../../scripts/buildCatalogDownloads';

const repoRoot = resolve(import.meta.dirname, '../../..');
const cases = [
  { id: 'aircraft-fuel-truck', size: [7.81, 2.87, 2.74], features: ['tanker', 'hose-reel', 'cab-windscreen', 'axle--2720', 'wheel-2420-1'] },
  { id: 'aircraft-hangar', size: [22.249152, 10.18, 18.8], features: ['rear-gable', 'left-roof', 'right-roof', 'door-header', 'column-1--8800'] },
  { id: 'aircraft-maintenance-lift', size: [4.3, 4.805, 2.5], features: ['upper-platform', 'scissor-ascending--1', 'scissor-descending-1', 'end-pivot-3540-1500', 'side-rail-1-4770'] },
] as const;

beforeAll(async () => { await initOcct(); }, 120_000);

function glbMetadata(bytes: Uint8Array): { stats: { minUpM: number; triangles: number; sizeM: number[] }; palette: Array<{ color: string; parts: string[] }> } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true)))).asset.extras.kernelcad;
}

describe('airfield assets retain real-scale geometry and working controls', () => {
  it.each(cases)('$id: default, STEP, scale limits and both palettes', async ({ id, size, features }) => {
    const source = 'catalog/kits/airfield/' + id + '.kcad.ts';
    const fullPath = resolve(repoRoot, source);
    const code = readFileSync(fullPath, 'utf8');
    const { asset } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.stats.materials).toBe(1);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    asset.stats.sizeM.forEach((value, i) => expect(value).toBeCloseTo(size[i]!, 3));
    expect(asset.palette.flatMap((zone) => zone.parts)).toEqual(expect.arrayContaining([...features]));
    const script = { fileName: basename(fullPath), scriptDir: dirname(fullPath) };
    const step = await runAndExport({ ...script, code, format: 'step' });
    expect(step.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(new TextDecoder().decode(step.bytes.subarray(0, 15))).toContain('ISO-10303-21');
    for (const scale of [0.65, 1.35]) {
      const result = await runAndExport({
        ...script, code: sourceWithParamValues(code, { scale }, fullPath), format: 'glb',
        options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
      });
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const stats = glbMetadata(result.bytes).stats;
      expect(stats.minUpM).toBeCloseTo(0, 6);
      expect(stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
      for (let i = 0; i < 3; i++) expect(stats.sizeM[i]).toBeCloseTo(size[i]! * scale, 3);
    }
    for (const [name, values] of Object.entries(asset.presets)) {
      const result = await runAndExport({
        ...script, code: sourceWithParamValues(code, values, fullPath), format: 'glb',
        options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: asset.triangleBudget } },
      });
      expect(result.diagnostics.filter((d) => d.severity === 'error'), name).toEqual([]);
      const meta = glbMetadata(result.bytes);
      expect(meta.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
      expect(meta.stats.minUpM).toBeCloseTo(0, 6);
      for (const zone of asset.palette) {
        const expectedColor = String(values[zone.name]).toLowerCase();
        for (const part of zone.parts) {
          const rendered = meta.palette.find((candidate) => candidate.parts.includes(part));
          expect(rendered?.color.toLowerCase(), part).toBe(expectedColor);
        }
      }
    }
  }, 120_000);
});
