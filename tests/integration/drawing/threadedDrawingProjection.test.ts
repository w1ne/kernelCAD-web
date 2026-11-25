// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/drawing/threadedDrawingProjection.test.ts
//
// Modelled helical threads in drawings (#1769). `threadedRod` and
// `threadedHole(..., { modeled: true })` build their flanks by sweeping the
// thread profile along a helix: a handful of B-spline patches of degree 3x11
// per groove, and 8 to 160 of them per part. Exact HLRBRep_Algo builds a
// silhouette curve on every span of every patch, which ran a 16 mm M6 rod past
// the 300 s job limit (`HTTP 504 job.time-limit`) on `pdf-drawing` and
// `order-pack`. Those shapes now go through the triangle projection in
// drawingMeshProjection.ts, which finishes both exports in seconds.
//
// The tests time the public export entry points, so they fail if the shape
// falls back to exact HLR, and they check that an ordinary spline part (a
// filleted spline extrusion: 3 B-spline faces) still takes the exact path.

import { beforeAll, describe, expect, it } from 'vitest';
import { buildModel } from '../../../src/composition/buildModel';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { readPdfPageVectors } from '../../../src/agent/drawing/pdfVectors';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { prepareShapeForDrawing } from '../../../src/kernel/backends/occt/drawingProjection';

const ROD = "return threadedRod({ spec: 'M6', length: 16, chamfer: true });";

const PLATE =
  "return box(40, 30, 10).threadedHole({ atZ: 10, byNormal: 'Z' }, { u: 0, v: 0, spec: 'M6', depth: 10, modeled: true });";

/** A spline part with fillets: 3 B-spline faces of degree 11, still exact. */
const SPLINED =
  "return path().moveTo(0, 0).spline([[0, 0], [10, 5], [20, 0], [30, 4]]).lineTo(30, -10).lineTo(0, -10).close().extrude(10).fillet(1);";

/**
 * One export must finish well inside this. The exact HLR path this issue is
 * about did not finish in 300 s; the triangle path takes about 8 s for the rod
 * and 2 s for the plate on a development machine, so this leaves room for a
 * slower CI host while still failing on a fallback to exact HLR.
 */
const BUDGET_MS = 60_000;

const DATE = '2026-11-25';

async function buildShape(code: string): Promise<OcctBackend> {
  const model = await buildModel({ code, fileName: 'threads.kcad.ts' });
  const errors = model.diagnostics.filter(d => d.severity === 'error');
  expect(errors, JSON.stringify(errors)).toEqual([]);
  return model.rootShape as OcctBackend;
}

async function exportDrawing(code: string, format: 'svg-drawing' | 'pdf-drawing') {
  const started = performance.now();
  const r = await runAndExport({
    code,
    fileName: 'threads.kcad.ts',
    format,
    options: { format, date: DATE },
  });
  const ms = Math.round(performance.now() - started);
  const errors = r.diagnostics.filter(d => d.severity === 'error');
  expect(errors, JSON.stringify(errors)).toEqual([]);
  expect(ms, `${format} took ${ms} ms, budget ${BUDGET_MS} ms`).toBeLessThan(BUDGET_MS);
  return r.bytes;
}

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('modelled threads in drawings', () => {
  it('projects a threaded rod and a modelled threaded hole on triangles', async () => {
    for (const [name, code] of [['threadedRod', ROD], ['modelled threadedHole', PLATE]] as const) {
      const shape = await buildShape(code);
      expect(prepareShapeForDrawing(shape.getReplicadShape()).mode, name).toBe('mesh');
    }
  }, 180_000);

  it('keeps exact HLR for a splined part with a few fillet patches', async () => {
    const shape = await buildShape(SPLINED);
    expect(prepareShapeForDrawing(shape.getReplicadShape()).mode).toBe('exact');
  }, 120_000);

  it('exports svg-drawing of a threaded rod in seconds', async () => {
    const svg = new TextDecoder().decode(await exportDrawing(ROD, 'svg-drawing'));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('data-kc-format="svg-drawing"');
    // Four views of the rod leave the thread flanks as their own edges.
    for (const view of ['view-front', 'view-top', 'view-left', 'view-iso']) {
      expect(svg, view).toContain(`id="${view}"`);
    }
    expect(svg.match(/<path /g)?.length ?? 0).toBeGreaterThan(500);
  }, 180_000);

  it('exports pdf-drawing of a threaded rod in seconds', async () => {
    const page = await readPdfPageVectors(await exportDrawing(ROD, 'pdf-drawing'));
    expect(page.pageCount).toBe(1);
    expect(page.texts.length).toBeGreaterThan(0);
    expect(page.paths.length).toBeGreaterThan(500);
  }, 180_000);

  it('exports svg-drawing and pdf-drawing of a plate with a modelled threaded hole in seconds', async () => {
    const svg = new TextDecoder().decode(await exportDrawing(PLATE, 'svg-drawing'));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.match(/<path /g)?.length ?? 0).toBeGreaterThan(50);
    const page = await readPdfPageVectors(await exportDrawing(PLATE, 'pdf-drawing'));
    expect(page.pageCount).toBe(1);
    expect(page.paths.length).toBeGreaterThan(50);
  }, 180_000);
});
