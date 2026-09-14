// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/drawing/drawingToCad.test.ts
//
// Round trip: kernelCAD's svg-drawing exporter draws a known part, the sheet
// is converted to PDF (committed under tests/fixtures/drawing-pdf/, see
// tests/helpers/drawingPdf/), drawing_to_cad reads the PDF back, and the
// emitted script is evaluated here — independently of the pipeline's own
// fidelity check — and compared with the source model.

import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drawingToCad } from '../../../src/agent/drawing/index';
import { drawingToCadTool } from '../../../src/agent/mcp/tools/drawingToCad';
import { resolveAssumptionsTool } from '../../../src/agent/mcp/tools/resolveAssumptions';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { detectCylindricalHoles } from '../../../src/kernel/backends/occt/holeDetection';
import { runMcpScript } from '../../../src/agent/mcp/runMcpScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { resolveRootId } from '../../../src/modeling/buildModel';
import {
  L_BRACKET,
  PLATE_DIMENSION_DISAGREEMENT,
  PLATE_WITH_HOLES,
  TURNED_SHAFT,
  type DrawingFixtureModel,
} from '../../helpers/drawingPdf/fixtureModels';
import { minimalSvgToPdf } from '../../helpers/drawingPdf/svgToPdf';

const FIXTURES = join(__dirname, '../../fixtures/drawing-pdf');
const pdfOf = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, `${name}.pdf`)));

async function evaluate(script: string): Promise<{ extents: [number, number, number]; holes: number[] }> {
  const run = await runMcpScript({ code: script });
  if (!run.ok) throw new Error(run.error);
  const result = await new RecomputeEngine(createOcctLowerer(run.run.session)).run(run.run.records, { paramTable: run.run.paramTable });
  const errors = result.diagnostics.filter(d => d.severity === 'error');
  if (errors.length > 0) throw new Error(errors.map(d => d.message).join('; '));
  const tail = run.run.records[run.run.records.length - 1]?.id;
  const shape = result.shapes.get(resolveRootId(run.run.returnValue, tail)!);
  if (!(shape instanceof OcctBackend)) throw new Error('no solid returned');
  const bb = shape.boundingBox({ exact: true });
  return {
    extents: [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]],
    holes: detectCylindricalHoles(shape).map(h => h.diameterMm).sort((a, b) => a - b),
  };
}

function expectMatches(actual: { extents: [number, number, number]; holes: number[] }, model: DrawingFixtureModel): void {
  actual.extents.forEach((e, i) => expect(Math.abs(e - model.expected.extents[i]), `extent ${'xyz'[i]}: ${e}`).toBeLessThanOrEqual(0.1));
  expect(actual.holes).toHaveLength(model.expected.holeDiameters.length);
  actual.holes.forEach((d, i) => expect(Math.abs(d - model.expected.holeDiameters[i]), `hole ${i}: ${d}`).toBeLessThanOrEqual(0.1));
}

describe('drawing_to_cad round trip (svg-drawing sheet → PDF → .kcad.ts)', () => {
  beforeAll(async () => { await initOcct(); }, 120_000);

  it('rebuilds the plate with holes as a dimensioned extrusion with its holes', async () => {
    const r = await drawingToCad({ pdf: pdfOf(PLATE_WITH_HOLES.name), source: 'plate-with-holes.pdf' });
    expect(r.ok).toBe(true);
    expect(r.views.map(v => v.name).sort()).toEqual(['front', 'left', 'top']);
    expect(r.reconstruction).toMatchObject({ kind: 'extrude', profileView: 'top', axis: 'z', holeCount: 5 });
    expect(r.fidelity?.verdict).toBe('match');
    expectMatches(await evaluate(r.script!), PLATE_WITH_HOLES);

    const byId = new Map(r.ledger.facts.map(f => [f.id, f] as const));
    expect(byId.get('width')).toMatchObject({ kind: 'visible', value: 80, resolution: 'confirmed' });
    expect(byId.get('thickness')).toMatchObject({ kind: 'visible', value: 8 });
    // The centre hole is located by nothing but symmetry.
    expect(r.ledger.facts.some(f => f.kind === 'inferred' && f.evidence?.source === 'symmetry' && f.value === 40)).toBe(true);
    expect(r.params.map(p => p.name)).toEqual(expect.arrayContaining(['width', 'depth', 'thickness', 'hole1X', 'hole1Y']));
  }, 120_000);

  it('rebuilds the L-bracket from its front-view profile, depth from the top view', async () => {
    const r = await drawingToCad({ pdf: pdfOf(L_BRACKET.name), source: 'l-bracket.pdf' });
    expect(r.ok).toBe(true);
    expect(r.reconstruction).toMatchObject({ kind: 'extrude', profileView: 'front', axis: 'y', holeCount: 1 });
    expect(r.fidelity?.verdict).toBe('match');
    expectMatches(await evaluate(r.script!), L_BRACKET);
    expect(r.ledger.unresolvedCount).toBe(0);
  }, 120_000);

  it('rebuilds the turned shaft as a revolve sized by its ⌀ dimensions and callouts', async () => {
    const r = await drawingToCad({ pdf: pdfOf(TURNED_SHAFT.name), source: 'turned-shaft.pdf' });
    expect(r.ok).toBe(true);
    expect(r.sheet?.scale).toMatchObject({ text: '1:2', source: 'title-block' });
    expect(r.reconstruction).toMatchObject({ kind: 'revolve', axis: 'z' });
    expect(r.script).toContain('.revolve()');
    expect(r.fidelity?.verdict).toBe('match');
    expectMatches(await evaluate(r.script!), TURNED_SHAFT);
    const diameters = r.ledger.facts.filter(f => /^dia\d$/.test(f.id)).map(f => f.value).sort();
    expect(diameters).toEqual([10, 14, 20]);
  }, 120_000);

  it('lets the lettered dimension win over the linework and records the disagreement', async () => {
    const r = await drawingToCad({ pdf: pdfOf(PLATE_DIMENSION_DISAGREEMENT.name), source: 'plate-dimension-disagreement.pdf' });
    expect(r.ok).toBe(true);
    expectMatches(await evaluate(r.script!), PLATE_DIMENSION_DISAGREEMENT);
    const width = r.ledger.facts.find(f => f.id === 'width');
    expect(width).toMatchObject({
      kind: 'visible',
      value: 82,
      resolution: 'open',
      disagreement: { stated: 82, measured: 80, unit: 'mm' },
    });
    expect(r.diagnostics.map(d => d.code)).toContain('reference.assumptions.unresolved');
  }, 120_000);

  it('refuses a raster-only page and points at trace_from_image', async () => {
    const r = await drawingToCad({ pdf: pdfOf('raster-only'), source: 'raster-only.pdf' });
    expect(r.ok).toBe(false);
    const d = r.diagnostics.find(x => x.code === 'reference.drawing.raster-only');
    expect(d?.severity).toBe('error');
    expect(d?.hint).toContain('trace_from_image');
    expect(d?.nextAction).toMatchObject({ kind: 'call-tool', tool: 'trace_from_image' });
  }, 60_000);

  it('reads the same sheet written by an independent PDF producer', async () => {
    const svg = readFileSync(join(FIXTURES, `${L_BRACKET.name}.svg`), 'utf8');
    const r = await drawingToCad({ pdf: minimalSvgToPdf(svg), source: 'l-bracket (minimal writer)', verify: false });
    expect(r.ok).toBe(true);
    expectMatches(await evaluate(r.script!), L_BRACKET);
  }, 120_000);

  it('marks the depth missing, and the orphaned dimension unapplied, on a single-view sheet', async () => {
    const svg = readFileSync(join(FIXTURES, `${PLATE_WITH_HOLES.name}.svg`), 'utf8')
      .replace(/<g id="view-front"[\s\S]*?>FRONT<\/text><\/g>/, '')
      .replace(/<g id="view-left"[\s\S]*?>LEFT<\/text><\/g>/, '');
    const r = await drawingToCad({ pdf: minimalSvgToPdf(svg), source: 'plate top view only', verify: false });
    const codes = r.diagnostics.map(d => d.code);
    expect(codes).toContain('reference.drawing.depth-missing');
    expect(codes).toContain('reference.drawing.dimension-unassociated');
    expect(r.ledger.facts.find(f => f.id === 'thickness')).toMatchObject({ kind: 'missing', resolution: 'open' });
    expect(r.ledger.facts.some(f => f.id.startsWith('unapplied:') && f.value === 8)).toBe(true);
    // Still a buildable part with the stated plan dimensions.
    const built = await evaluate(r.script!);
    expect(built.extents[0]).toBeCloseTo(80, 1);
    expect(built.extents[1]).toBeCloseTo(50, 1);
  }, 120_000);
});

describe('drawing_to_cad MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 120_000);

  it('writes the script and a ledger that resolve_assumptions can act on', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kc-drawing-to-cad-'));
    try {
      const out = join(dir, 'plate.kcad.ts');
      const r = await drawingToCadTool({ path: join(FIXTURES, `${PLATE_DIMENSION_DISAGREEMENT.name}.pdf`), out, verify: false });
      expect(r.ok).toBe(true);
      expect(r.scriptPath).toBe(out);
      expect(readFileSync(out, 'utf8')).toContain('// Ledger: ./plate.ledger.json');
      const resolved = await resolveAssumptionsTool({ ledgerPath: r.ledgerPath!, resolutions: [{ id: 'width', value: 80 }] });
      expect(resolved.ok).toBe(true);
      expect(resolved.paramOverrides).toEqual({ width: 80 });
      expect(resolved.ledger!.facts.find(f => f.id === 'width')?.resolution).toBe('overridden');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);

  it('reports an unreadable path with the inline alternative', async () => {
    const r = await drawingToCadTool({ path: '/tmp/kernelcad-no-such-drawing.pdf' });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0].code).toBe('cli.file-read');
    expect(r.diagnostics[0].message).toContain('pdfBase64');
  });

  it('accepts the PDF inline as base64', async () => {
    const pdfBase64 = Buffer.from(pdfOf(L_BRACKET.name)).toString('base64');
    const r = await drawingToCadTool({ pdfBase64, verify: false });
    expect(r.ok).toBe(true);
    expect(r.reconstruction?.kind).toBe('extrude');
  }, 120_000);

  it('rejects both or neither input', async () => {
    expect((await drawingToCadTool({})).diagnostics[0].code).toBe('cli.invalid-args');
    expect((await drawingToCadTool({ path: 'a.pdf', pdfBase64: 'AAAA' })).diagnostics[0].code).toBe('cli.invalid-args');
  });
});
