// SPDX-License-Identifier: MIT
// Geometric continuity of static props, including original-source negatives.
import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { setParamValue } from '../../../src/modeling/edits/setParamValue';
import { checkConnectionParts, readConnectionParts } from './fiveConnectionsGeometry';
import { connectionCases } from './fiveConnectionsCases';

const root = resolve(import.meta.dirname, '../../..');
const index = JSON.parse(readFileSync(resolve(root, 'catalog/index.json'), 'utf8'));
beforeAll(async () => { await initOcct(); }, 60_000);

describe('catalog physical connections', () => {
  for (const test of connectionCases) it(test.id, async () => {
    let bytes: Uint8Array;
    if (test.canonicalDefault) {
      const { asset, glb } = await buildCatalogAssetWithGlb(root, test.file); bytes = glb;
      const existing = index.assets.find((row: { source: string }) => row.source === test.file);
      expect(existing).toBeDefined();
      expect(asset.params).toEqual(existing.params);
      expect(asset.presets).toEqual(existing.presets);
      expect(asset.triangleBudget).toBe(test.triangleBudget);
      expect(asset.stats.triangles).toBeLessThanOrEqual(test.triangleBudget);
    } else {
      const file = test.original ? 'tests/fixtures/catalog/fiveConnectionsOriginal/' + basename(test.file) : test.file;
      let code = readFileSync(resolve(root, file), 'utf8');
      for (const [name, value] of Object.entries(test.values)) {
        const edited = setParamValue(code, name, value);
        if (!edited.ok) throw new Error(edited.error); code = edited.new_code;
      }
      const exported = await runAndExport({ code, fileName: basename(test.file), scriptDir: dirname(resolve(root, test.file)), format: 'glb',
        options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: test.triangleBudget } } });
      expect(exported.diagnostics.filter(row => row.severity === 'error')).toEqual([]); bytes = exported.bytes;
    }
    const report = checkConnectionParts(test.model, await readConnectionParts(bytes), test.values);
    expect(report.triangleCount).toBeGreaterThan(0);
    expect(report.triangleCount).toBeLessThanOrEqual(test.triangleBudget);
    if (test.original) expect(report.failures).toEqual(expect.arrayContaining(test.expectedFailures));
    else expect(report.failures).toEqual([]);
  }, 60_000);
});
