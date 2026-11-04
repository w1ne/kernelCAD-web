// SPDX-License-Identifier: MIT
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { dfmReviewTool } from '../../../src/agent/mcp/tools/dfmReview';
import { runAndExport, runAndExportParts } from '../../../src/agent/script-runtime/export';
import { decodeStlMesh } from '../../../src/kernel/backends/meshBackend';
import { verifyWatertight } from '../../../src/kernel/backends/occt/meshHeal';
import { strFromU8, unzipSync } from 'fflate';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';

const THREE_MF_CORE_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';

describe('printed electronics enclosure', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  it('builds a hollow base and separate fitted cover', async () => {
    const result = await evaluateScriptTool({ file: 'examples/manufacturing-showcase/electronics-enclosure.kcad.ts', skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.parts?.count).toBe(2);
    expect(result.sceneSummary?.size[0]).toBeCloseTo(100, 3);
    expect(result.sceneSummary?.size[1]).toBeCloseTo(70, 3);
    expect(result.sceneSummary?.volume).toBeLessThan(100 * 70 * 37.5 / 2);
    // The locating lip contributes material inside the box without changing
    // the outer envelope. A plain lid without the lip is below this bound.
    expect(result.sceneSummary?.volume).toBeGreaterThan(72_000);
  }, 120_000);
  it('keeps PCB posts clear of lid bosses at the combined minimum footprint and maximum wall', async () => {
    const code = (await readFile('examples/manufacturing-showcase/electronics-enclosure.kcad.ts', 'utf8'))
      .replace("param('length', 100", "param('length', 80")
      .replace("param('width', 70", "param('width', 60")
      .replace("param('height', 35", "param('height', 20")
      .replace("param('wall', 2.5", "param('wall', 5");
    expect(code).toContain("param('length', 80, { min: 80");
    expect(code).toContain("param('width', 60, { min: 60");
    const result = await evaluateScriptTool({ code, skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.sceneSummary?.size[0]).toBeCloseTo(80, 3);
    expect(result.sceneSummary?.size[1]).toBeCloseTo(60, 3);
    const review = await reviewCadTool({ code, includeInterference: true });
    expect(review.ok, JSON.stringify(review.diagnostics)).toBe(true);
    if (review.ok) expect(review.rawInterferencePairs).toEqual([]);
  }, 120_000);

  it('has a support-free FDM orientation for each printed part', async () => {
    const code = await readFile('examples/manufacturing-showcase/electronics-enclosure.kcad.ts', 'utf8');
    const upright = await dfmReviewTool({ code, processes: ['fdm'], build_direction: '+z' });
    const base = upright.fdm?.find(part => part.part === 'base')?.result;
    expect(base?.verdict).toBe('pass');
    expect(base?.orientation.overhangs.filter(region => region.status === 'unsupported')).toEqual([]);
    expect(base?.orientation.fitsBed).toBe(true);

    const inverted = await dfmReviewTool({ code, processes: ['fdm'], build_direction: '-z' });
    const lid = inverted.fdm?.find(part => part.part === 'lid')?.result;
    expect(lid?.verdict).toBe('pass');
    expect(lid?.orientation.overhangs.filter(region => region.status === 'unsupported')).toEqual([]);
    expect(lid?.orientation.bedContact.ratio).toBeGreaterThan(0.9);
    expect(lid?.orientation.fitsBed).toBe(true);
  }, 180_000);

  it('exports separate watertight binary STL meshes that reopen with the expected envelopes', async () => {
    const code = await readFile('examples/manufacturing-showcase/electronics-enclosure.kcad.ts', 'utf8');
    const result = await runAndExportParts({ code, fileName: 'electronics-enclosure.kcad.ts' });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(result.parts.map(part => part.name).sort()).toEqual(['base', 'lid']);

    for (const part of result.parts) {
      expect(part.report.ok, `${part.name}: ${JSON.stringify(part.report)}`).toBe(true);
      expect(part.triangleCount).toBeGreaterThan(0);
      expect(part.bytes.length).toBe(84 + part.triangleCount * 50);
      expect(new DataView(part.bytes.buffer, part.bytes.byteOffset, part.bytes.byteLength).getUint32(80, true))
        .toBe(part.triangleCount);

      const decoded = decodeStlMesh(part.bytes);
      const mesh = { vertices: Array.from(decoded.positions), triangles: Array.from(decoded.indices) };
      expect(verifyWatertight(mesh).ok, `${part.name} STL readback is open`).toBe(true);
      const spans = [0, 1, 2].map(axis => {
        const values = Array.from(decoded.positions).filter((_, i) => i % 3 === axis);
        return Math.max(...values) - Math.min(...values);
      });
      expect(spans[0]).toBeCloseTo(100, 3);
      expect(spans[1]).toBeCloseTo(70, 3);
      expect(spans[2]).toBeCloseTo(part.name === 'base' ? 35 : 4, 3);
    }
  }, 180_000);

  it('writes an oriented plate-layout 3MF with both parts inside the selected printer bed', async () => {
    const code = await readFile('examples/manufacturing-showcase/electronics-enclosure.kcad.ts', 'utf8');
    const result = await runAndExport({
      code,
      fileName: 'electronics-enclosure.kcad.ts',
      format: '3mf',
      options: { format: '3mf', arrange: 'plate', orient: true, printer: 'prusa-mini-plus' },
    });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);

    const entries = unzipSync(result.bytes);
    const xml = strFromU8(entries['3D/3dmodel.model']!);
    const doc = new JSDOM(xml, { contentType: 'application/xml' }).window.document;
    expect(doc.documentElement.namespaceURI).toBe(THREE_MF_CORE_NS);
    expect(doc.documentElement.getAttribute('unit')).toBe('millimeter');
    const objects = [...doc.getElementsByTagNameNS(THREE_MF_CORE_NS, 'object')];
    const byId = new Map(objects.map(object => [object.getAttribute('id')!, object]));
    expect(objects.map(object => object.getAttribute('name')).sort()).toEqual(['base', 'lid']);

    const items = [...doc.getElementsByTagNameNS(THREE_MF_CORE_NS, 'item')];
    expect(items).toHaveLength(2);
    const worldBounds = items.map(item => {
      const object = byId.get(item.getAttribute('objectid')!)!;
      const vertices = [...object.getElementsByTagNameNS(THREE_MF_CORE_NS, 'vertex')]
        .map(vertex => [Number(vertex.getAttribute('x')), Number(vertex.getAttribute('y')), Number(vertex.getAttribute('z'))]);
      const matrix = (item.getAttribute('transform') ?? '1 0 0 0 1 0 0 0 1 0 0 0').split(' ').map(Number);
      const translation = [matrix[9]!, matrix[10]!, matrix[11]!];
      const min = [0, 1, 2].map(axis => Math.min(...vertices.map(point => point[axis]! + translation[axis]!)));
      const max = [0, 1, 2].map(axis => Math.max(...vertices.map(point => point[axis]! + translation[axis]!)));
      expect(min[2]).toBeCloseTo(0, 5);
      expect(min[0]).toBeGreaterThanOrEqual(-1e-5);
      expect(min[1]).toBeGreaterThanOrEqual(-1e-5);
      expect(max[0]).toBeLessThanOrEqual(180 + 1e-5);
      expect(max[1]).toBeLessThanOrEqual(180 + 1e-5);
      expect(max[2]).toBeLessThanOrEqual(180 + 1e-5);
      expect(max[0] - min[0]).toBeCloseTo(100, 3);
      expect(max[1] - min[1]).toBeCloseTo(70, 3);
      expect(max[2] - min[2]).toBeCloseTo(object.getAttribute('name') === 'base' ? 35 : 4, 3);
      return { min, max };
    });
    const overlapX = Math.min(worldBounds[0]!.max[0]!, worldBounds[1]!.max[0]!)
      - Math.max(worldBounds[0]!.min[0]!, worldBounds[1]!.min[0]!);
    const overlapY = Math.min(worldBounds[0]!.max[1]!, worldBounds[1]!.max[1]!)
      - Math.max(worldBounds[0]!.min[1]!, worldBounds[1]!.min[1]!);
    expect(overlapX <= 0 || overlapY <= 0).toBe(true);
  }, 180_000);
});
