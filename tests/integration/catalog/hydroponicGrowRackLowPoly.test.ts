// SPDX-License-Identifier: MIT
// Native geometry/export regression. Normal hosted loading is verified separately.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { setParamValue } from '../../../src/modeling/edits/setParamValue';
import { checkGrowRackParts, readGrowRackParts } from './hydroponicGrowRackGeometry';
import contract from '../../fixtures/catalog/hydroponicGrowRackContract.json';

const root = resolve(import.meta.dirname, '../../..');
const file = 'catalog/kits/hydroponics/hydroponic-grow-rack.kcad.ts';
const source = readFileSync(resolve(root, file), 'utf8');
const variants = ['lettuce', 'empty', 'microgreens'].flatMap(crop => [.7, 1, 1.3].map(scale => ({ crop, scale })));
beforeAll(async () => { await initOcct(); }, 60_000);

describe('hydroponic grow rack explicit low-poly geometry', () => {
  it('keeps the published six controls and four presets, named heads, extents and positive volumes', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, file);
    expect(asset.params).toEqual(contract.params);
    expect(asset.presets).toEqual(contract.presets);
    expect(asset.triangleBudget).toBe(8000);
    const parts = await readGrowRackParts(glb);
    expect(checkGrowRackParts(parts).failures).toEqual([]);
    const missing = new Map(parts); missing.delete('head-0');
    expect(checkGrowRackParts(missing).failures).toContain('head-0:missing');
    const displaced = new Map(parts), head = displaced.get('head-0')!;
    displaced.set('head-0', { ...head, min: [head.min[0] + 5, head.min[1], head.min[2]] });
    expect(checkGrowRackParts(displaced).failures).toContain('head-0:min-0');
    const degenerate = new Map(parts);
    degenerate.set('head-0', { ...head, triangles: [...head.triangles, [head.min, head.min, head.min]] });
    expect(checkGrowRackParts(degenerate).failures).toContain('degenerate-triangles');
  }, 90_000);

  it.each(variants)('preserves $crop geometry and the triangle budget at scale $scale', async values => {
    let code = source;
    for (const [name, value] of Object.entries(values)) {
      const result = setParamValue(code, name, value); expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error);
      code = result.new_code;
    }
    const result = await runAndExport({ code, fileName: 'hydroponic-grow-rack.kcad.ts', scriptDir: resolve(root, file, '..'),
      format: 'glb', options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 8000 } } });
    expect(result.diagnostics.filter(row => row.severity === 'error')).toEqual([]);
    expect(checkGrowRackParts(await readGrowRackParts(result.bytes), values).failures).toEqual([]);
  }, 90_000);
});
