// SPDX-License-Identifier: MIT
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { inspectPhMeterGlb, type Reading } from './phMeterGeometry';

const root = resolve(import.meta.dirname, '../../..');
const file = 'catalog/kits/hydroponics/handheld-ph-meter.kcad.ts';
const source = readFileSync(resolve(root, file), 'utf8');
const original = readFileSync(resolve(root, 'tests/fixtures/catalog/handheldPhMeterOriginal.kcad.ts'), 'utf8');
async function exportVariant(code: string) {
  const result = await runAndExport({ code, fileName: 'handheld-ph-meter.kcad.ts',
    scriptDir: resolve(root, 'catalog/kits/hydroponics'), format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 3600 } } });
  expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  return result.bytes;
}

beforeAll(async () => { await initOcct(); }, 60_000);
describe('handheld pH meter scene controls', () => {
  it('shows 6.9 and a connected, resolved coil within the existing catalog budget', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, file);
    expect(asset.stats.triangles).toBeLessThanOrEqual(3600);
    expect(asset.triangleBudget).toBe(3600);
    expect(asset.params.map(p => p.name)).toEqual(['scale', 'housing', 'bumper', 'display', 'solution', 'reading']);
    expect(asset.params.find(p => p.name === 'reading')).toMatchObject({ type: 'choice', default: 'neutral', choices: ['acidic', 'neutral', 'alkaline'] });
    expect(asset.params.find(p => p.name === 'scale')).toMatchObject({ type: 'number', default: 1, min: 0.7, max: 1.3 });
    expect((await inspectPhMeterGlb(glb, 'neutral')).failures).toEqual([]);
    // Negative verifier control: remove two exported interior pieces, with no
    // extra native evaluation and no change to the deliverable source/GLB.
    const io = new NodeIO(), broken = await io.readBinary(glb);
    for (const node of broken.getRoot().listNodes()) if (['cable-17', 'cable-18'].includes(node.getName())) node.dispose();
    const brokenResult = await inspectPhMeterGlb(await io.writeBinary(broken), 'neutral');
    expect(brokenResult.failures).toContain('cable segment sequence is incomplete');
  }, 60_000);
  for (const reading of ['acidic', 'alkaline'] as Reading[]) {
    it(`shows the distinct ${reading} digits without changing the cable`, async () => {
      const code = source.replace("param('reading', 'neutral',", `param('reading', '${reading}',`);
      expect(code).not.toBe(source);
      expect((await inspectPhMeterGlb(await exportVariant(code), reading)).failures).toEqual([]);
    }, 60_000);
  }
  for (const scale of [0.7, 1.3]) {
    it(`preserves the reading and end connections at scale ${scale}`, async () => {
      const code = source.replace("param('scale', 1,", `param('scale', ${scale},`);
      expect(code).not.toBe(source);
      expect((await inspectPhMeterGlb(await exportVariant(code), 'neutral', scale)).failures).toEqual([]);
    }, 60_000);
  }
  it('detects the original identical display and collapsed-coil defects in exported geometry', async () => {
    const result = await inspectPhMeterGlb(await exportVariant(original), 'neutral');
    expect(result.failures).toEqual(expect.arrayContaining([
      'display does not show the selected reading', 'cable does not retain nine resolved turns',
    ]));
  }, 60_000);
});
