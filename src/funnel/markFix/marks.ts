// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Mark wire protocol between the embed (inside a host-chat widget's iframe:
 * ChatGPT apps, MCP Apps hosts such as Claude) and the widget that hosts it.
 * Pure functions only: the paint tool and the channel build on these, and
 * the tests pin them.
 *
 * widget -> embed  `kernelcad.widget-hello`  { instanceId, features: [...] }
 * embed -> widget  `kernelcad.marks`         the current painted marks, on every change
 *
 * Marking in the embed is paint only: no note box, no Send. The widget puts
 * the marks into the host model's context (ui/update-model-context and
 * ChatGPT widgetState), the user types the change in the host chat's own
 * composer, and that turn knows where. An empty list clears them.
 *
 * The embed shows its Mark toggle only after a hello for its own instance
 * (any features), so a plain embed never gets a button that goes nowhere.
 */

export const MARKS_VERSION = 1;
/** Most strokes kept; a new stroke past this drops the oldest. */
export const MAX_STROKES = 5;
/** Points per stroke sent to the widget (the drawing keeps more). */
export const MAX_STROKE_POINTS = 24;
/** Distinct features listed per stroke. */
export const MAX_STROKE_FEATURES = 5;
/** Longest feature / part id kept; real ids are short script names. */
export const MAX_ID_CHARS = 120;
/** Base64 data-URL budget for the optional screenshot (~150 KB of JPEG). */
export const MAX_SCREENSHOT_CHARS = 200_000;

export type SurfaceKind = 'plane' | 'cylinder' | 'other';
export type Vec3 = [number, number, number];

/** One spot on the model under the brush. Points are world mm, normals unit length. */
export interface EditPick {
  featureId?: string;
  partName?: string;
  faceId?: number;
  surface: SurfaceKind;
  /** Cylinder radius in mm, when the face is a cylinder. */
  radiusMm?: number;
  point: Vec3;
  normal: Vec3;
}

/** Most touched faces listed in `regions`. */
export const MAX_REGIONS = 8;

/** One brush sample, as the paint tool records it (not sent as-is). */
export interface PaintHit extends EditPick {
  /** Viewport position, 0..1 from the top-left. */
  screen: [number, number];
  /** Brush width on the surface at this sample, mm. */
  brushMm: number;
  /** Index of the mesh in the viewer's geometry list (for face areas). */
  shapeIndex: number;
}

/** One painted stroke as sent: its path on the model and on screen, and the features it covers. */
export interface StrokeSummary {
  points: Vec3[];
  /** Viewport positions, 0..1 from the top-left. */
  screen: Array<[number, number]>;
  features: string[];
}

/** One face the paint touched. */
export interface PaintRegion {
  featureId?: string;
  partName?: string;
  faceId?: number;
  surface: SurfaceKind;
  radiusMm?: number;
  /** Share of all brush samples on this face, 0..1. */
  share: number;
  /** Rough painted fraction of the face's area, 0..1; null when its area is unknown. */
  coverage: number | null;
}

export interface MarksCamera {
  projection: 'perspective' | 'orthographic';
  position: Vec3;
  /** Unit view direction. */
  direction: Vec3;
  up: Vec3;
  fovDeg?: number;
}

/**
 * The current marks. `picks[i]` is stroke i's representative spot (the hit
 * nearest its centre); `strokes[i]` is that stroke's path; `regions` lists
 * the touched faces with coverage; `bbox` bounds all paint. `seq` only
 * grows, so the widget can drop a late copy.
 */
export interface MarksMessage {
  source: 'kernelcad-embed';
  type: 'kernelcad.marks';
  v: typeof MARKS_VERSION;
  seq: number;
  slug: string;
  revision: number | null;
  instanceId: string;
  picks: EditPick[];
  strokes: StrokeSummary[];
  regions: PaintRegion[];
  bbox: { min: Vec3; max: Vec3 } | null;
  camera?: MarksCamera;
  viewport?: { width: number; height: number };
  screenshot?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Strip control characters and collapse runs of whitespace. */
export function cleanText(value: string, max: number): string {
  // eslint-disable-next-line no-control-regex
  const flat = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max).trimEnd() : flat;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  const r = Math.round(n * f) / f;
  return Object.is(r, -0) ? 0 : r;
}

function finiteVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3
    && value.every((n) => typeof n === 'number' && Number.isFinite(n));
}

function roundVec(v: Vec3, digits: number): Vec3 {
  return [round(v[0], digits), round(v[1], digits), round(v[2], digits)];
}

/** Unit normal rounded to 3 decimals, or null for a zero / non-finite vector. */
function unitNormal(n: Vec3): Vec3 | null {
  const len = Math.hypot(n[0], n[1], n[2]);
  if (!Number.isFinite(len) || len < 1e-9) return null;
  return roundVec([n[0] / len, n[1] / len, n[2] / len], 3);
}

function optionalId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const id = cleanText(value, MAX_ID_CHARS);
  return id.length > 0 ? id : undefined;
}

/** A pick with finite numbers, rounded for a small payload; null when unusable. */
export function normalizePick(pick: EditPick): EditPick | null {
  if (!finiteVec3(pick.point) || !finiteVec3(pick.normal)) return null;
  const normal = unitNormal(pick.normal);
  if (!normal) return null;
  const out: EditPick = {
    surface: pick.surface === 'plane' || pick.surface === 'cylinder' ? pick.surface : 'other',
    point: roundVec(pick.point, 2),
    normal,
  };
  const featureId = optionalId(pick.featureId);
  const partName = optionalId(pick.partName);
  if (featureId) out.featureId = featureId;
  if (partName) out.partName = partName;
  if (typeof pick.faceId === 'number' && Number.isInteger(pick.faceId) && pick.faceId >= 0) out.faceId = pick.faceId;
  if (out.surface === 'cylinder' && typeof pick.radiusMm === 'number' && Number.isFinite(pick.radiusMm) && pick.radiusMm > 0) {
    out.radiusMm = round(pick.radiusMm, 2);
  }
  return out;
}

/** Add a stroke (its hits along the path); past MAX_STROKES the oldest goes. */
export function addStroke<T>(strokes: readonly T[], stroke: T): T[] {
  const next = [...strokes, stroke];
  return next.length > MAX_STROKES ? next.slice(next.length - MAX_STROKES) : next;
}

/** Evenly spaced subset of at most `max` items, always keeping the first and last. */
export function downsample<T>(items: readonly T[], max: number): T[] {
  if (items.length <= max) return [...items];
  if (max <= 1) return items.length > 0 ? [items[0]!] : [];
  const out: T[] = [];
  for (let i = 0; i < max; i += 1) out.push(items[Math.round((i * (items.length - 1)) / (max - 1))]!);
  return out;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** A stroke's hits -> its representative pick and its summary; null when no hit is usable. */
export function summarizeStroke(hits: readonly PaintHit[]): { pick: EditPick; summary: StrokeSummary } | null {
  const usable = hits.filter((h) => normalizePick(h) !== null);
  const clean = usable.map((h) => normalizePick(h)!);
  if (clean.length === 0) return null;
  const c = clean.reduce<Vec3>((acc, p) => [acc[0] + p.point[0], acc[1] + p.point[1], acc[2] + p.point[2]], [0, 0, 0])
    .map((n) => n / clean.length) as Vec3;
  let best = clean[0]!;
  let bestD = Infinity;
  for (const p of clean) {
    const d = Math.hypot(p.point[0] - c[0], p.point[1] - c[1], p.point[2] - c[2]);
    if (d < bestD) { best = p; bestD = d; }
  }
  const features: string[] = [];
  for (const p of clean) {
    const name = p.featureId ?? p.partName;
    if (name && !features.includes(name) && features.length < MAX_STROKE_FEATURES) features.push(name);
  }
  const points = downsample(clean.map((p) => roundVec(p.point, 1)), MAX_STROKE_POINTS);
  const screen = downsample(
    usable.map((h): [number, number] => [round(clamp01(h.screen[0]), 3), round(clamp01(h.screen[1]), 3)]),
    MAX_STROKE_POINTS,
  );
  return { pick: best, summary: { points, screen, features } };
}

/**
 * Touched faces, most-painted first. Coverage is a rough painted area
 * (brush width x path length on the face, a dot for a lone sample) over the
 * face's area from `faceArea`.
 */
export function paintRegions(
  strokes: readonly (readonly PaintHit[])[],
  faceArea: (shapeIndex: number, faceId: number) => number | null,
): PaintRegion[] {
  type Acc = { pick: EditPick; shapeIndex: number; samples: number; area: number };
  const byFace = new Map<string, Acc>();
  let total = 0;
  for (const stroke of strokes) {
    let prev: PaintHit | null = null;
    for (const hit of stroke) {
      const clean = normalizePick(hit);
      if (!clean || !(hit.brushMm >= 0)) { prev = null; continue; }
      const key = `${hit.shapeIndex}:${clean.faceId ?? clean.featureId ?? clean.partName ?? '?'}`;
      const acc = byFace.get(key) ?? { pick: clean, shapeIndex: hit.shapeIndex, samples: 0, area: 0 };
      const samePrev = prev && prev.shapeIndex === hit.shapeIndex && prev.faceId === hit.faceId;
      const step = samePrev
        ? Math.hypot(hit.point[0] - prev!.point[0], hit.point[1] - prev!.point[1], hit.point[2] - prev!.point[2])
        : hit.brushMm;
      acc.samples += 1;
      acc.area += step * hit.brushMm;
      byFace.set(key, acc);
      total += 1;
      prev = hit;
    }
  }
  return [...byFace.values()]
    .sort((x, y) => y.samples - x.samples)
    .slice(0, MAX_REGIONS)
    .map((acc) => {
      const rest: Omit<PaintRegion, 'share' | 'coverage'> = { surface: acc.pick.surface };
      if (acc.pick.featureId) rest.featureId = acc.pick.featureId;
      if (acc.pick.partName) rest.partName = acc.pick.partName;
      if (acc.pick.faceId !== undefined) rest.faceId = acc.pick.faceId;
      if (acc.pick.radiusMm !== undefined) rest.radiusMm = acc.pick.radiusMm;
      const area = acc.pick.faceId !== undefined ? faceArea(acc.shapeIndex, acc.pick.faceId) : null;
      const coverage = area && area > 0 ? round(clamp01(acc.area / area), 2) : null;
      return { ...rest, share: round(acc.samples / Math.max(1, total), 2), coverage };
    });
}

function paintBbox(strokes: readonly (readonly PaintHit[])[]): { min: Vec3; max: Vec3 } | null {
  const pts = strokes.flat().filter((h) => finiteVec3(h.point)).map((h) => h.point);
  if (pts.length === 0) return null;
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) {
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i]!, p[i]!);
      max[i] = Math.max(max[i]!, p[i]!);
    }
  }
  return { min: roundVec(min, 1), max: roundVec(max, 1) };
}

function cleanCamera(camera: MarksCamera | undefined): MarksCamera | undefined {
  if (!camera || !finiteVec3(camera.position) || !finiteVec3(camera.direction) || !finiteVec3(camera.up)) return undefined;
  const direction = unitNormal(camera.direction);
  const up = unitNormal(camera.up);
  if (!direction || !up) return undefined;
  const out: MarksCamera = { projection: camera.projection === 'orthographic' ? 'orthographic' : 'perspective', position: roundVec(camera.position, 1), direction, up };
  if (typeof camera.fovDeg === 'number' && Number.isFinite(camera.fovDeg) && camera.fovDeg > 0) out.fovDeg = round(camera.fovDeg, 1);
  return out;
}

/** A hello for this instance from the hosting widget: its feature list, or null. */
export function readWidgetHello(data: unknown, instanceId: string): string[] | null {
  if (!isRecord(data) || data.source !== 'kernelcad-widget' || data.type !== 'kernelcad.widget-hello') return null;
  if (data.instanceId !== instanceId || !Array.isArray(data.features)) return null;
  return data.features.filter((f): f is string => typeof f === 'string');
}

function cleanRevision(revision: number | null | undefined): number | null {
  return typeof revision === 'number' && Number.isInteger(revision) && revision > 0 ? revision : null;
}

function cleanScreenshot(shot: string | null | undefined): string | undefined {
  return typeof shot === 'string' && shot.startsWith('data:image/jpeg;base64,') && shot.length <= MAX_SCREENSHOT_CHARS
    ? shot
    : undefined;
}

function cleanViewport(vp: { width: number; height: number } | undefined): { width: number; height: number } | undefined {
  return vp && vp.width > 0 && vp.height > 0 ? { width: Math.round(vp.width), height: Math.round(vp.height) } : undefined;
}

/** The message posted to the widget. Clamps the strokes and the screenshot. */
export function buildMarksMessage(args: {
  seq: number;
  slug: string;
  revision: number | null | undefined;
  instanceId: string;
  /** Each stroke's brush samples, oldest stroke first. */
  strokes: readonly (readonly PaintHit[])[];
  faceArea?: (shapeIndex: number, faceId: number) => number | null;
  camera?: MarksCamera;
  viewport?: { width: number; height: number };
  screenshot?: string | null;
}): MarksMessage {
  const kept = args.strokes.slice(-MAX_STROKES);
  const summaries = kept
    .map(summarizeStroke)
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const message: MarksMessage = {
    source: 'kernelcad-embed',
    type: 'kernelcad.marks',
    v: MARKS_VERSION,
    seq: args.seq,
    slug: args.slug,
    revision: cleanRevision(args.revision),
    instanceId: args.instanceId,
    picks: summaries.map((s) => s.pick),
    strokes: summaries.map((s) => s.summary),
    regions: [],
    bbox: null,
  };
  if (summaries.length === 0) return message;
  message.regions = paintRegions(kept, args.faceArea ?? (() => null));
  message.bbox = paintBbox(kept);
  const extras = { camera: cleanCamera(args.camera), viewport: cleanViewport(args.viewport), screenshot: cleanScreenshot(args.screenshot) };
  for (const [key, value] of Object.entries(extras)) {
    if (value !== undefined) Object.assign(message, { [key]: value });
  }
  return message;
}
