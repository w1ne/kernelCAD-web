// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// STEP inspect views. Oracles are analytic box geometry and a hand-computed
// plate area, checked through evaluate_script volume and a separate
// importStepCached + resolveFaceQuery path. Pixel colours are literals.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { measureArea } from 'replicad';
import { callMcpTool } from '../mcp/toolRegistry';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import { faceUnitNormal, resolveFaceQuery } from '../../kernel/backends/occt/edgeQueries';
import { importStepCached } from '../../modeling/parts/stepParseCache';
import { cameraDir, viewBasis } from './stepViewMath';
import type { FaceEditRef, InspectFaceRow } from './stepInspectSelectors';
import type { InspectStepViewsResult, InspectViewImage } from './stepInspectViews';

const SOURCE_STEP = fileURLToPath(new URL('../../../docs/demos/step-to-features/source.step', import.meta.url));
const HIGHLIGHT = { r: 220, g: 20, b: 120 };
const LEGEND_BAND = 56;
const MODEL_W = 220;
const MODEL_H = 160;

interface SceneEval {
  ok: boolean;
  error?: string;
  diagnostics?: { code?: string; message?: string; hint?: string }[];
  sceneSummary: { volume: number | null; faceCount: number | null; size: [number, number, number] | null };
}

let tmpDir: string;
let boxPath: string;
let boxViews: InspectStepViewsResult;
let hiddenViews: InspectStepViewsResult;

function near(actual: number, expected: number, tol: number, label: string): void {
  expect(Math.abs(actual - expected), `${label}: ${actual} vs ${expected}`).toBeLessThan(tol);
}

function axisFace(faces: readonly InspectFaceRow[], normal: [number, number, number], area: number): InspectFaceRow {
  const hit = faces.find((face) => (
    Math.abs(face.normal[0] - normal[0]) < 1e-6
    && Math.abs(face.normal[1] - normal[1]) < 1e-6
    && Math.abs(face.normal[2] - normal[2]) < 1e-6
    && Math.abs(face.area - area) < 0.05
  ));
  expect(hit, `face normal ${normal.join(',')} area ${area}`).toBeDefined();
  return hit!;
}

function viewNamed(images: InspectViewImage[] | undefined, name: string): InspectViewImage {
  const image = images?.find((item) => item.name === name);
  expect(image, name).toBeDefined();
  return image!;
}

async function highlightCounts(path: string, modelHeight: number): Promise<{ all: number; legend: number; width: number; height: number }> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let all = 0;
  let legend = 0;
  const channels = info.channels;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const o = (y * info.width + x) * channels;
      if (data[o] !== HIGHLIGHT.r || data[o + 1] !== HIGHLIGHT.g || data[o + 2] !== HIGHLIGHT.b) continue;
      all += 1;
      if (y >= modelHeight) legend += 1;
    }
  }
  return { all, legend, width: info.width, height: info.height };
}

/** Fraction of the fullest highlight scanline that is the highlight colour. */
async function fullestHighlightRow(path: string, modelHeight: number): Promise<number> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let best = 0;
  for (let y = 0; y < modelHeight; y++) {
    let first = -1;
    let last = -1;
    let hits = 0;
    for (let x = 0; x < info.width; x++) {
      const o = (y * info.width + x) * channels;
      if (data[o] !== HIGHLIGHT.r || data[o + 1] !== HIGHLIGHT.g || data[o + 2] !== HIGHLIGHT.b) continue;
      if (first < 0) first = x;
      last = x;
      hits += 1;
    }
    if (first < 0 || last === first) continue;
    best = Math.max(best, hits / (last - first + 1));
  }
  return best;
}

async function sceneOf(code: string): Promise<SceneEval> {
  return callMcpTool('evaluate_script', { code }) as Promise<SceneEval>;
}

describe('inspect view cameras', () => {
  it('uses the documented Z-up engineering directions', () => {
    expect(cameraDir('front')).toEqual([0, -1, 0]);
    expect(cameraDir('right')).toEqual([1, 0, 0]);
    expect(cameraDir('top')).toEqual([0, 0, 1]);
    const iso = cameraDir('iso');
    const len = Math.hypot(0.7, -0.7, 0.5);
    near(iso[0], 0.7 / len, 1e-12, 'iso x');
    near(iso[1], -0.7 / len, 1e-12, 'iso y');
    near(iso[2], 0.5 / len, 1e-12, 'iso z');
    const signed = (v: readonly number[]) => v.map((n) => (Object.is(n, -0) ? 0 : n));
    expect(signed(viewBasis('front').right)).toEqual([1, 0, 0]);
    expect(signed(viewBasis('front').up)).toEqual([0, 0, 1]);
    expect(signed(viewBasis('top').right)).toEqual([1, 0, 0]);
    expect(signed(viewBasis('top').up)).toEqual([0, 1, 0]);
    expect(signed(viewBasis('right').right)).toEqual([0, 1, 0]);
    expect(signed(viewBasis('right').up)).toEqual([0, 0, 1]);
  });
});

describe('inspect_step_views on a 30×20×10 box', () => {
  beforeAll(async () => {
    await initOcct();
    tmpDir = mkdtempSync(join(tmpdir(), 'kcad-step-inspect-'));
    const box = OcctBackend.box(30, 20, 10, false);
    boxPath = join(tmpDir, 'box.step');
    writeFileSync(boxPath, await box.exportSTEPAsync());
    process.env.KERNELCAD_ARTIFACT_BASE_URL = 'https://artifacts.example/step';
    boxViews = await callMcpTool('inspect_step_views', {
      file: boxPath,
      target_face: JSON.stringify({ near: [15, 10, 10] }),
      out_dir: join(tmpDir, 'plus-z'),
      width: MODEL_W,
      height: MODEL_H,
      max_labels: 2,
      detail: true,
    }) as InspectStepViewsResult;
    const bottom = axisFace(boxViews.faces ?? [], [0, 0, -1], 600);
    hiddenViews = await callMcpTool('inspect_step_views', {
      file: boxPath,
      target_face: bottom.id,
      out_dir: join(tmpDir, 'minus-z'),
      width: MODEL_W,
      height: MODEL_H,
      max_labels: 2,
    }) as InspectStepViewsResult;
  });

  afterAll(() => {
    delete process.env.KERNELCAD_ARTIFACT_BASE_URL;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('lists analytic faces and edges for this import only', () => {
    expect(boxViews.ok, boxViews.error).toBe(true);
    expect(boxViews.owner).toBe('importedStep_1');
    expect(boxViews.importGeneration).toMatch(/^importedStep_1@[0-9a-f]{16}$/);
    expect(boxViews.refScope).toContain('do not survive');
    const faces = boxViews.faces ?? [];
    expect(faces).toHaveLength(6);
    const top = axisFace(faces, [0, 0, 1], 600);
    near(top.centroid[0], 15, 1e-4, 'top cx');
    near(top.centroid[1], 10, 1e-4, 'top cy');
    near(top.centroid[2], 10, 1e-4, 'top cz');
    expect(top.listRef).toMatch(/^@kc\[importedStep_1\/face\/f\d+\]$/);
    expect(top.ref).toEqual({
      near: [expect.any(Number), expect.any(Number), expect.any(Number)],
    });
    const query = top.ref as { near: [number, number, number] };
    near(query.near[0], 15, 1e-3, 'query x');
    near(query.near[1], 10, 1e-3, 'query y');
    near(query.near[2], 10, 1e-3, 'query z');
    expect(axisFace(faces, [0, 0, -1], 600)).toBeDefined();
    expect(axisFace(faces, [0, -1, 0], 300)).toBeDefined();
    expect(axisFace(faces, [0, 1, 0], 300)).toBeDefined();
    expect(axisFace(faces, [1, 0, 0], 200)).toBeDefined();
    expect(axisFace(faces, [-1, 0, 0], 200)).toBeDefined();
    const lengths = { 10: 0, 20: 0, 30: 0 };
    for (const edge of boxViews.edges ?? []) {
      expect(edge.ref).toMatch(/^@kc\[importedStep_1\/edge\/e\d+\]$/);
      const nominal = ([10, 20, 30] as const).find((value) => Math.abs(edge.length - value) < 0.05);
      expect(nominal, `${edge.id} length ${edge.length}`).toBeDefined();
      lengths[nominal!] += 1;
    }
    expect(lengths).toEqual({ 10: 4, 20: 4, 30: 4 });
    expect(boxViews.full?.placements.iso).toBeDefined();
    expect(boxViews.full?.edges.length).toBe(12);
  });

  it('highlights the +Z face where the camera can see it, and hides the legend band', async () => {
    const top = axisFace(boxViews.faces ?? [], [0, 0, 1], 600);
    expect(boxViews.target).toMatchObject({ ok: true, id: top.id });
    const thresholds: Record<string, number> = { front: 20, right: 20, top: 500, iso: 500 };
    for (const name of ['front', 'right', 'top', 'iso']) {
      const image = viewNamed(boxViews.images, name);
      expect(image.url).toBe(`https://artifacts.example/step/${name}.png`);
      const pixels = await highlightCounts(image.path, MODEL_H);
      expect(pixels.width).toBe(MODEL_W);
      expect(pixels.height).toBe(MODEL_H + LEGEND_BAND);
      expect(pixels.legend, name).toBe(0);
      expect(pixels.all, name).toBeGreaterThan(thresholds[name]);
      expect(pixels.all, name).toBeLessThanOrEqual(image.targetPixels);
      expect(image.targetVisible, name).toBe(true);
    }
    const iso = viewNamed(boxViews.images, 'iso');
    expect(iso.labeledFaceIds.length).toBeLessThanOrEqual(2);
    expect(iso.legendFaceIds.length).toBeGreaterThanOrEqual(1);
    const rowFill = await fullestHighlightRow(iso.path, MODEL_H);
    expect(rowFill).toBeGreaterThan(0.95);
  });

  it('draws no highlight for the occluded -Z face in the top view', async () => {
    expect(hiddenViews.ok, hiddenViews.error).toBe(true);
    const top = viewNamed(hiddenViews.images, 'top');
    const pixels = await highlightCounts(top.path, MODEL_H);
    expect(pixels.all).toBe(0);
    expect(top.targetPixels).toBe(0);
    expect(top.targetVisible).toBe(false);
  });

  it('resolves { near } on a separate import and offsets that face by its area', async () => {
    const listed = axisFace(boxViews.faces ?? [], [0, 0, 1], 600);
    const imported = await importStepCached(readFileSync(boxPath));
    const selected = resolveFaceQuery(imported, listed.ref as { near: [number, number, number] })[0];
    expect(selected, 'resolveFaceQuery').toBeDefined();
    near(measureArea(selected), 600, 0.05, 'independent area');
    const normal = faceUnitNormal(selected);
    expect(normal).not.toBeNull();
    near(normal![0], 0, 1e-6, 'nx');
    near(normal![1], 0, 1e-6, 'ny');
    near(normal![2], 1, 1e-6, 'nz');
    const base = await sceneOf(`return await lib.fromSTEP(${JSON.stringify(boxPath)});`);
    expect(base.ok, JSON.stringify(base.diagnostics)).toBe(true);
    near(base.sceneSummary.volume ?? NaN, 6000, 0.05, 'box volume');
    const grown = await sceneOf(
      `const part = await lib.fromSTEP(${JSON.stringify(boxPath)});\nreturn part.offsetFaces(${JSON.stringify(listed.ref)}, 1);`,
    );
    expect(grown.ok, JSON.stringify(grown.diagnostics)).toBe(true);
    near((grown.sceneSummary.volume ?? NaN) - (base.sceneSummary.volume ?? NaN), 600, 0.05, 'offset delta');
    const positional = await sceneOf(
      `const part = await lib.fromSTEP(${JSON.stringify(boxPath)});\nreturn part.offsetFaces(${JSON.stringify(listed.listRef)}, 1);`,
    );
    expect(positional.ok).toBe(false);
    const text = JSON.stringify(positional.diagnostics ?? positional.error);
    expect(text).toContain('positional face ids');
  });

  it('refuses a missing face without writing views, and retrieves the saved report', async () => {
    const absentDir = join(tmpDir, 'absent');
    const miss = await callMcpTool('inspect_step_views', {
      file: boxPath,
      target_face: 'not-a-face',
      out_dir: absentDir,
    }) as InspectStepViewsResult;
    expect(miss.ok).toBe(false);
    expect(miss.errorCode).toBe('feature.selection.no-match');
    expect(miss.images).toBeUndefined();
    expect(miss.faces?.length).toBe(6);
    expect(miss.edges?.length).toBe(12);
    const missing = await callMcpTool('inspect_step_views', {
      file: join(tmpDir, 'missing.step'),
    }) as InspectStepViewsResult;
    expect(missing.ok).toBe(false);
    expect(missing.errorCode).toBe('feature.invalid-args');
    const unknown = await callMcpTool('inspect_step_views', { report_id: 'no-such-report' }) as InspectStepViewsResult;
    expect(unknown.ok).toBe(false);
    expect(unknown.errorCode).toBe('feature.invalid-args');
    const compact = await callMcpTool('inspect_step_views', { report_id: boxViews.report_id }) as InspectStepViewsResult;
    expect(compact.ok).toBe(true);
    expect(compact.full).toBeUndefined();
    expect(compact.faces?.length).toBe(6);
    const detailed = await callMcpTool('inspect_step_views', {
      report_path: boxViews.report_path,
      detail: true,
    }) as InspectStepViewsResult;
    expect(detailed.full?.placements.front).toBeDefined();
    const fromFile = await callMcpTool('inspect_step_views', { report_path: boxViews.report_path }) as InspectStepViewsResult;
    expect(fromFile.full).toBeUndefined();
    expect(fromFile.images?.length).toBe(4);
  });
});

describe('inspect_step_views on the step-to-features plate', () => {
  it('selects the top face and a centre hole removes 2π mm³', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'kcad-step-inspect-plate-'));
    const views = await callMcpTool('inspect_step_views', {
      file: SOURCE_STEP,
      out_dir: outDir,
      width: MODEL_W,
      height: MODEL_H,
      max_labels: 8,
    }) as InspectStepViewsResult;
    expect(views.ok, views.error).toBe(true);
    const corner = 5 * 5 * (1 - Math.PI / 4);
    const bore = Math.PI * 3.3 * 3.3;
    const topArea = 80 * 50 - 4 * corner - 4 * bore;
    const tops = (views.faces ?? []).filter((face) => face.normal[2] > 0.999 && face.surfaceType === 'PLANE');
    const top = tops.sort((a, b) => b.area - a.area)[0];
    expect(top, 'top plane').toBeDefined();
    near(top.area, topArea, 2, 'plate top area');
    near(top.centroid[0], 40, 0.05, 'plate cx');
    near(top.centroid[1], 25, 0.05, 'plate cy');
    near(top.centroid[2], 10, 0.05, 'plate cz');
    expect(typeof top.ref).toBe('object');
    const imported = await importStepCached(readFileSync(SOURCE_STEP));
    const selected = resolveFaceQuery(imported, top.ref as Exclude<FaceEditRef, string>)[0];
    near(measureArea(selected), topArea, 2, 'independent plate area');
    const normal = faceUnitNormal(selected);
    near(normal?.[2] ?? 0, 1, 1e-3, 'plate nz');
    const highlighted = await callMcpTool('inspect_step_views', {
      file: SOURCE_STEP,
      target_face: top.id,
      out_dir: join(outDir, 'highlight'),
      width: MODEL_W,
      height: MODEL_H,
    }) as InspectStepViewsResult;
    expect(highlighted.ok, highlighted.error).toBe(true);
    for (const name of ['front', 'right', 'top', 'iso']) {
      const image = viewNamed(highlighted.images, name);
      const pixels = await highlightCounts(image.path, MODEL_H);
      expect(pixels.legend, name).toBe(0);
      const floor = name === 'top' || name === 'iso' ? 500 : 20;
      expect(pixels.all, name).toBeGreaterThan(floor);
    }
    const base = await sceneOf(`return await lib.fromSTEP(${JSON.stringify(SOURCE_STEP)});`);
    expect(base.ok, JSON.stringify(base.diagnostics)).toBe(true);
    near(base.sceneSummary.size?.[2] ?? NaN, 10, 0.05, 'plate height');
    const drilled = await sceneOf(
      `const part = await lib.fromSTEP(${JSON.stringify(SOURCE_STEP)});\nreturn part.hole(${JSON.stringify(top.ref)}, { u: 0, v: 0, diameter: 2, depth: 2 });`,
    );
    expect(drilled.ok, JSON.stringify(drilled.diagnostics)).toBe(true);
    near((base.sceneSummary.volume ?? NaN) - (drilled.sceneSummary.volume ?? NaN), 2 * Math.PI, 0.05, 'hole volume');
    near(drilled.sceneSummary.size?.[2] ?? NaN, 10, 0.05, 'height after blind hole');
    expect(drilled.sceneSummary.faceCount).toBe((base.sceneSummary.faceCount ?? 0) + 2);
  });
});
