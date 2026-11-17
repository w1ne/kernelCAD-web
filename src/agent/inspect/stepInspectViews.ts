// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Labeled front / right / top / iso views of one normalized STEP import.
// Selectors belong to this import generation only.

import { createHash, randomBytes } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import sharp from 'sharp';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { runMcpScript } from '../mcp/runMcpScript';
import { summarizeOcctEdges, type EdgeSummary } from '../mcp/tools/listEdges';
import { summarizeOcctFaces, type FaceSummary } from '../mcp/tools/listFaces';
import { faceBoundary, meshImportedShape } from './stepInspectMesh';
import { editFaceRef, matchListedFace, type FaceEditRef, type InspectFaceRow } from './stepInspectSelectors';
import { labelSvg, planViewLabels, type ViewLabelPlan } from './stepViewLabels';
import { INSPECT_VIEWS, project, type InspectViewName, type Vec3 } from './stepViewMath';
import { rasterInspectView, type ViewPixels } from './stepViewDraw';

const REPORT_CAP = 8;
const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 260;
const DEFAULT_LABELS = 8;

export interface InspectEdgeRow {
  id: string;
  ref: string;
  curveType: string;
  length: number;
  midpoint: [number, number, number];
}

export interface InspectViewImage {
  name: InspectViewName;
  path: string;
  url?: string;
  description: string;
  labeledFaceIds: string[];
  legendFaceIds: string[];
  labeledEdgeIds: string[];
  legendEdgeIds: string[];
  targetVisible: boolean;
  targetPixels: number;
}

export interface InspectTarget {
  requested?: string;
  ok: boolean;
  ref?: FaceEditRef;
  id?: string;
  visibleIn?: InspectViewName[];
  error?: string;
}

export interface InspectStepViewsResult {
  ok: boolean;
  importGeneration?: string;
  refScope?: string;
  owner?: string;
  images?: InspectViewImage[];
  faces?: InspectFaceRow[];
  edges?: InspectEdgeRow[];
  target?: InspectTarget;
  report_id?: string;
  report_path?: string;
  full?: InspectFullReport;
  error?: string;
  errorCode?: string;
  errorHint?: string;
}

export interface InspectFullReport {
  placements: Record<string, ViewLabelPlan>;
  edges: EdgeSummary[];
}

export interface InspectStepViewsInput {
  file?: string;
  target_face?: string;
  out_dir?: string;
  width?: number;
  height?: number;
  detail?: boolean;
  report_id?: string;
  report_path?: string;
  max_labels?: number;
}

interface ParsedInput {
  ok: true;
  file: string;
  targetFace?: string;
  outDir?: string;
  width: number;
  height: number;
  detail: boolean;
  maxLabels: number;
}

interface LoadedImport {
  shape: OcctBackend;
  owner: string;
  importGeneration: string;
  refScope: string;
  faces: InspectFaceRow[];
  edges: InspectEdgeRow[];
  edgeDetails: EdgeSummary[];
}

const VIEW_TEXT: Record<InspectViewName, string> = {
  front: 'Front view. Camera on -Y, looking toward +Y. kernelCAD is Z-up.',
  right: 'Right view. Camera on +X, looking toward -X. kernelCAD is Z-up.',
  top: 'Top view. Camera on +Z, looking down. Screen up is +Y.',
  iso: 'Isometric view from the +X, -Y, +Z octant. kernelCAD is Z-up.',
};

const memory = new Map<string, InspectStepViewsResult>();

function fail(error: string, errorCode: string, extra: Partial<InspectStepViewsResult> = {}): InspectStepViewsResult {
  return { ok: false, error, errorCode, ...extra };
}

function parseDim(value: unknown, fallback: number, name: string): number | string {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 64 || value > 1024) {
    return `${name} must be an integer from 64 to 1024.`;
  }
  return value;
}

function parseLabels(value: unknown): number | string {
  if (value === undefined) return DEFAULT_LABELS;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 32) {
    return 'max_labels must be an integer from 1 to 32.';
  }
  return value;
}

export function parseInspectInput(input: InspectStepViewsInput): ParsedInput | InspectStepViewsResult {
  if (typeof input.file !== 'string' || input.file.length === 0) {
    return fail('inspect_step_views: { file } is required.', 'feature.invalid-args');
  }
  if (input.target_face !== undefined && typeof input.target_face !== 'string') {
    return fail('inspect_step_views: target_face must be a string.', 'feature.invalid-args');
  }
  const width = parseDim(input.width, DEFAULT_WIDTH, 'width');
  if (typeof width === 'string') return fail(`inspect_step_views: ${width}`, 'feature.invalid-args');
  const height = parseDim(input.height, DEFAULT_HEIGHT, 'height');
  if (typeof height === 'string') return fail(`inspect_step_views: ${height}`, 'feature.invalid-args');
  const maxLabels = parseLabels(input.max_labels);
  if (typeof maxLabels === 'string') return fail(`inspect_step_views: ${maxLabels}`, 'feature.invalid-args');
  const targetFace = input.target_face && input.target_face.length > 0 ? input.target_face : undefined;
  return {
    ok: true,
    file: input.file,
    targetFace,
    outDir: input.out_dir,
    width,
    height,
    detail: input.detail === true,
    maxLabels,
  };
}

function refScopeFor(importGeneration: string): string {
  return `Selectors name faces and edges of import ${importGeneration}. They do not survive healing or a later edit.`;
}

function toFaceRow(face: FaceSummary): InspectFaceRow {
  return {
    id: face.id,
    ref: editFaceRef(face),
    listRef: face.ref,
    surfaceType: face.surfaceType,
    area: face.area,
    normal: face.normal,
    centroid: face.centroid,
  };
}

function toEdgeRow(edge: EdgeSummary): InspectEdgeRow {
  return {
    id: edge.id,
    ref: edge.ref,
    curveType: edge.curveType,
    length: edge.length,
    midpoint: [edge.midpoint[0], edge.midpoint[1], edge.midpoint[2]],
  };
}

async function fileDigest(file: string): Promise<string> {
  const bytes = await readFile(file);
  return createHash('sha256').update(bytes).digest('hex').slice(0, 16);
}

export async function loadImportedStep(file: string): Promise<LoadedImport | InspectStepViewsResult> {
  const abs = resolve(file);
  try {
    await access(abs);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return fail(`inspect_step_views: cannot read ${abs}. ${message}`, 'feature.invalid-args');
  }
  const script = await runMcpScript({
    code: `return await lib.fromSTEP(${JSON.stringify(abs)});`,
  });
  if (!script.ok) return fail(script.error, script.errorCode ?? 'feature.kernel-failed');
  if (script.run.records.length === 0) return fail('Script returned no features.', 'feature.kernel-failed');
  const engine = new RecomputeEngine(createOcctLowerer(script.run.session));
  const lowered = await engine.run(script.run.records, { paramTable: script.run.paramTable });
  const owner = script.run.records[script.run.records.length - 1].id;
  const shape = lowered.shapes.get(owner);
  if (!(shape instanceof OcctBackend)) {
    const fatal = lowered.diagnostics.find((d) => d.featureId === owner && d.severity === 'error');
    return fail(fatal?.message ?? `Feature '${owner}' has no lowered solid.`, fatal?.code ?? 'feature.kernel-failed');
  }
  const digest = await fileDigest(abs);
  const importGeneration = `${owner}@${digest}`;
  const listed = summarizeOcctFaces(shape, script.run.records, owner);
  const edgeDetails = summarizeOcctEdges(shape, owner);
  return {
    shape,
    owner,
    importGeneration,
    refScope: refScopeFor(importGeneration),
    faces: listed.map(toFaceRow),
    edges: edgeDetails.map(toEdgeRow),
    edgeDetails,
  };
}

function faceIndex(id: string): number {
  const n = Number(id.slice(1));
  return Number.isInteger(n) ? n : -1;
}

function edgeAnchors(
  edges: readonly InspectEdgeRow[],
  pixels: ViewPixels,
): { id: string; index: number; x: number; y: number }[] {
  return [...edges]
    .sort((a, b) => b.length - a.length)
    .map((edge) => {
      const screen = project(edge.midpoint, pixels.frame);
      return { id: edge.id, index: faceIndex(edge.id), x: screen.x, y: screen.y };
    });
}

function artifactUrl(filePath: string): string | undefined {
  const base = process.env.KERNELCAD_ARTIFACT_BASE_URL;
  if (!base) return undefined;
  return `${base.replace(/\/$/, '')}/${basename(filePath)}`;
}

async function writeViewPng(rgb: Uint8Array, width: number, height: number, svg: string, filePath: string): Promise<void> {
  await sharp(Buffer.from(rgb), { raw: { width, height, channels: 3 } })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(filePath);
}

const storedFull = new Map<string, InspectFullReport>();

function remember(report: InspectStepViewsResult, full: InspectFullReport): void {
  if (!report.report_id) return;
  memory.set(report.report_id, report);
  storedFull.set(report.report_id, full);
  while (memory.size > REPORT_CAP) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
    storedFull.delete(oldest);
  }
}

function withDetail(report: InspectStepViewsResult, detail: boolean): InspectStepViewsResult {
  if (!detail || !report.report_id) return report;
  const full = storedFull.get(report.report_id);
  return full ? { ...report, full } : report;
}

export async function retrieveInspectReport(input: InspectStepViewsInput): Promise<InspectStepViewsResult | undefined> {
  if (input.file) return undefined;
  if (input.report_id) {
    const hit = memory.get(input.report_id);
    if (!hit) return fail(`No inspect report '${input.report_id}'.`, 'feature.invalid-args');
    return withDetail(hit, input.detail === true);
  }
  if (!input.report_path) return undefined;
  try {
    const raw = JSON.parse(await readFile(input.report_path, 'utf8')) as InspectStepViewsResult;
    if (input.detail === true) return raw;
    const compact = { ...raw };
    delete compact.full;
    return compact;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return fail(`inspect_step_views: cannot read report ${input.report_path}. ${message}`, 'feature.invalid-args');
  }
}

async function renderOne(
  view: InspectViewName,
  parsed: ParsedInput,
  loaded: LoadedImport,
  mesh: ReturnType<typeof meshImportedShape>,
  targetIndex: number | undefined,
  loops: readonly Vec3[][],
  dir: string,
): Promise<{ image: InspectViewImage; plan: ViewLabelPlan }> {
  const pixels = rasterInspectView({
    view,
    width: parsed.width,
    modelHeight: parsed.height,
    points: mesh.points,
    triangles: mesh.triangles,
    edges: mesh.edges,
    targetFace: targetIndex,
    targetLoops: loops,
  });
  const facesByArea = [...loaded.faces]
    .sort((a, b) => b.area - a.area)
    .map((face) => ({ id: face.id, index: faceIndex(face.id) }));
  const plan = planViewLabels({
    pixels,
    width: parsed.width,
    modelHeight: parsed.height,
    maxLabels: parsed.maxLabels,
    faceIdsByArea: facesByArea,
    edgeAnchors: edgeAnchors(loaded.edges, pixels),
  });
  const filePath = join(dir, `${view}.png`);
  const svg = labelSvg({
    view,
    width: pixels.raster.width,
    height: pixels.raster.height,
    modelHeight: parsed.height,
    plan,
    generation: loaded.importGeneration,
  });
  await writeViewPng(pixels.raster.rgb, pixels.raster.width, pixels.raster.height, svg, filePath);
  const visible = targetIndex !== undefined && pixels.targetPixels > 0;
  return {
    plan,
    image: {
      name: view,
      path: filePath,
      url: artifactUrl(filePath),
      description: VIEW_TEXT[view],
      labeledFaceIds: plan.labeledFaceIds,
      legendFaceIds: plan.legendFaceIds,
      labeledEdgeIds: plan.labeledEdgeIds,
      legendEdgeIds: plan.legendEdgeIds,
      targetVisible: visible,
      targetPixels: pixels.targetPixels,
    },
  };
}

function outwardNormals(faces: readonly InspectFaceRow[]): Map<number, Vec3> {
  const map = new Map<number, Vec3>();
  for (const face of faces) map.set(faceIndex(face.id), face.normal);
  return map;
}

async function renderViews(
  parsed: ParsedInput,
  loaded: LoadedImport,
  target: InspectFaceRow | undefined,
  dir: string,
): Promise<{ images: InspectViewImage[]; placements: Record<string, ViewLabelPlan> }> {
  const mesh = meshImportedShape(loaded.shape, outwardNormals(loaded.faces));
  const targetIndex = target ? faceIndex(target.id) : undefined;
  const loops = targetIndex !== undefined && targetIndex >= 0 ? faceBoundary(loaded.shape, targetIndex) : [];
  const images: InspectViewImage[] = [];
  const placements: Record<string, ViewLabelPlan> = {};
  for (const view of INSPECT_VIEWS) {
    const rendered = await renderOne(view, parsed, loaded, mesh, targetIndex, loops, dir);
    images.push(rendered.image);
    placements[view] = rendered.plan;
  }
  return { images, placements };
}

function targetResult(requested: string | undefined, face: InspectFaceRow | undefined, images: InspectViewImage[]): InspectTarget {
  if (!requested || !face) return { ok: true };
  return {
    requested,
    ok: true,
    ref: face.ref,
    id: face.id,
    visibleIn: images.filter((image) => image.targetVisible).map((image) => image.name),
  };
}

async function writeReport(dir: string, report: InspectStepViewsResult, full: InspectFullReport): Promise<string> {
  const reportPath = join(dir, 'report.json');
  await writeFile(reportPath, JSON.stringify({ ...report, report_path: reportPath, full }, null, 2));
  return reportPath;
}

function isViewRender(value: unknown): value is { images: InspectViewImage[]; placements: Record<string, ViewLabelPlan> } {
  return typeof value === 'object' && value !== null && 'images' in value && 'placements' in value;
}

function renderError(value: unknown): InspectStepViewsResult {
  const message = value instanceof Error ? value.message : 'view render failed';
  return fail(`inspect_step_views: ${message}`, 'feature.kernel-failed');
}

function missTarget(loaded: LoadedImport, requested: string): InspectStepViewsResult {
  return fail(
    `No face on this import matches '${requested}'. Pass an id, listRef, or named ref from this response.`,
    'feature.selection.no-match',
    {
      importGeneration: loaded.importGeneration,
      refScope: loaded.refScope,
      owner: loaded.owner,
      faces: loaded.faces,
      edges: loaded.edges,
      target: { requested, ok: false, error: 'feature.selection.no-match' },
    },
  );
}

export async function inspectStepViews(input: InspectStepViewsInput): Promise<InspectStepViewsResult> {
  const retrieved = await retrieveInspectReport(input);
  if (retrieved) return retrieved;
  const parsed = parseInspectInput(input);
  if (!('width' in parsed)) return parsed;
  const loaded = await loadImportedStep(parsed.file);
  if (!('shape' in loaded)) return loaded;
  const face = parsed.targetFace ? matchListedFace(loaded.faces, parsed.targetFace) : undefined;
  if (parsed.targetFace && !face) return missTarget(loaded, parsed.targetFace);
  const dir = parsed.outDir ?? mkdtempSync(join(tmpdir(), 'kernelcad-step-inspect-'));
  await mkdir(dir, { recursive: true });
  const rendered = await renderViews(parsed, loaded, face, dir).catch((e: unknown) => e);
  if (!isViewRender(rendered)) return renderError(rendered);
  const reportId = randomBytes(4).toString('hex');
  const full: InspectFullReport = { placements: rendered.placements, edges: loaded.edgeDetails };
  const report: InspectStepViewsResult = {
    ok: true,
    importGeneration: loaded.importGeneration,
    refScope: loaded.refScope,
    owner: loaded.owner,
    images: rendered.images,
    faces: loaded.faces,
    edges: loaded.edges,
    target: targetResult(parsed.targetFace, face, rendered.images),
    report_id: reportId,
  };
  report.report_path = await writeReport(dir, report, full);
  remember(report, full);
  return parsed.detail ? { ...report, full } : report;
}

