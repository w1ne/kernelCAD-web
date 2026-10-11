// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/mech40/checks.ts
//
// Shared checker for the mech40 mechanical agent eval (eval/tasks/mech40/*).
// A task harness declares its parts and a set of measurable checks; this
// module builds the script ONCE in-process (eval/usecaseChecks.ts), gates on
// a clean build with the named parts as closed solids, runs the checks, and
// re-imports a STEP export. Every check reads geometry the kernel built —
// bbox, volume, kernel hole detection, material in probe boxes — or the
// recorded feature intent (thread pitch, sheet-metal bends, mates). Probe
// coordinates are LOCAL: relative to the min corner of the checked shape's
// bbox, so a correct part placed anywhere passes.

import type { HarnessResult } from '../types';
import { OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { flattenPattern } from '../../src/kernel/backends/occt/flattenPattern';
import { Scene } from '../../src/modeling/validation/scene';
import {
  bbox, buildUsecase, emptyIn, exportAs, fullIn, hasHoles, holesOf, isClosedSolid, materialIn, near, reimportStep,
  type HoleSpec, type UsecaseBuild, type Vec3,
} from '../usecaseChecks';

export type { Vec3 };

/** A shape seen from its own bbox min corner. */
export interface LocalShape {
  shape: OcctBackend;
  /** World position of the bbox min corner. */
  min: Vec3;
  size: Vec3;
  volume: number;
  /** World point of a local point. */
  at(p: Vec3): Vec3;
  /** No material in the local box [a, b]. */
  empty(a: Vec3, b: Vec3): boolean;
  /** The local box [a, b] is solid material. */
  full(a: Vec3, b: Vec3): boolean;
  /** Every spec (local `at`) matches a distinct detected cylindrical hole. */
  holes(specs: readonly HoleSpec[], tol?: number): boolean;
  /** Detected cylindrical holes of diameter `d` (± tol). */
  holeCount(d: number, tol?: number): number;
}

export function local(shape: OcctBackend): LocalShape {
  const bb = bbox(shape);
  const o = bb.min;
  const at = (p: Vec3): Vec3 => [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
  return {
    shape,
    min: o,
    size: bb.size,
    volume: shape.volume(),
    at,
    empty: (a, b) => emptyIn(shape, at(a), at(b)),
    full: (a, b) => fullIn(shape, at(a), at(b)),
    holes: (specs, tol) => hasHoles(shape, specs.map((s) => ({ ...s, at: at(s.at) })), tol),
    holeCount: (d, tol = 0.05) => holesOf(shape).filter((h) => near(h.diameterMm, d, tol)).length,
  };
}

/** Bbox size equals `size` per axis (± tol). */
export function sizeNear(l: LocalShape, size: Vec3, tol = 0.1): boolean {
  return l.size.every((v, i) => near(v, size[i], tol));
}

/** Volume within [lo, hi] mm³. */
export function volumeIn(l: LocalShape, lo: number, hi: number): boolean {
  return l.volume >= lo && l.volume <= hi;
}

/**
 * Diameter tolerance of every mech40 hole spec (mm). Kernel hole detection
 * reads the exact B-rep cylinder radius, so this is about the spec, not the
 * measurement: the shared 0.1 mm position tolerance let a Ø4.4 hole pass a
 * Ø4.5 clearance spec.
 */
export const HOLE_DIAMETER_TOL = 0.05;
/** Diameter tolerance where the fit is the point (press seats, running and
 *  pin clearances, nut-trap bolts): see `fit`. */
export const FIT_DIAMETER_TOL = 0.02;

/** Shorthand hole spec along an axis at a local point. */
export function hole(diameter: number, at: Vec3, axis: Vec3 = [0, 0, 1], kind?: 'through' | 'blind', depth?: number): HoleSpec {
  return { diameter, at, axis, diameterTol: HOLE_DIAMETER_TOL, ...(kind ? { kind } : {}), ...(depth !== undefined ? { depth } : {}) };
}

/** The hole spec with a fit-grade diameter tolerance. */
export function fit(spec: HoleSpec, diameterTol: number = FIT_DIAMETER_TOL): HoleSpec {
  return { ...spec, diameterTol };
}

/** ISO 68-1 minor diameter (the tap drill a threaded hole drills). */
export function threadMinor(nominal: number, pitch: number): number {
  return nominal - 1.0825 * pitch;
}

interface RecordLike {
  id?: string;
  kind?: string;
  params?: Record<string, { evaluated?: number } | undefined>;
}

function records(b: UsecaseBuild): RecordLike[] {
  return (b.model?.records ?? []) as unknown as RecordLike[];
}

/** Feature records of a kind (`hole`, `sheetMetal`, `sheetMetalBend`, `dfmSpec`, ...). */
export function recordsOf(b: UsecaseBuild, kind: string): RecordLike[] {
  return records(b).filter((r) => r.kind === kind);
}

/** Thread pitches recorded on hole features (one entry per threaded hole record). */
export function threadPitches(b: UsecaseBuild): number[] {
  return [...recordsOf(b, 'hole'), ...recordsOf(b, 'holes')]
    .map((r) => r.params?.threadPitch?.evaluated)
    .filter((p): p is number => typeof p === 'number' && p > 0);
}

/** Every pitch in `want` is recorded on some threaded hole (± 0.01). */
export function hasThreads(b: UsecaseBuild, want: readonly number[]): boolean {
  const got = threadPitches(b);
  return want.length > 0 && want.every((p) => got.some((g) => near(g, p, 0.01)));
}

export interface MateSummary {
  name: string;
  type: string;
  a: string;
  b: string;
  limitsDeg?: [number, number];
}

/** Mates the script's returned Scene declares. */
export function mates(b: UsecaseBuild): MateSummary[] {
  const rv = b.model?.returnValue;
  if (!(rv instanceof Scene)) return [];
  return (rv.mates ?? []).map((m) => {
    const lim = m.limitsDeg as unknown as [unknown, unknown] | undefined;
    const num = (v: unknown) => (typeof v === 'number' ? v : Number((v as { value?: unknown })?.value));
    return {
      name: m.name,
      type: m.type,
      a: m.a,
      b: m.b,
      ...(lim ? { limitsDeg: [num(lim[0]), num(lim[1])] as [number, number] } : {}),
    };
  });
}

/** A mate of `type` joins parts `p` and `q` (either order). */
export function mateBetween(b: UsecaseBuild, type: string, p: string, q: string): MateSummary | undefined {
  const part = (ref: string) => ref.split('.')[0];
  return mates(b).find((m) => m.type === type
    && ((part(m.a) === p && part(m.b) === q) || (part(m.a) === q && part(m.b) === p)));
}

/** The mate's limits span at least [lo, hi] degrees of travel (either sign convention). */
export function limitsCover(m: MateSummary | undefined, travelDeg: number): boolean {
  if (!m?.limitsDeg) return false;
  const [a, c] = m.limitsDeg;
  return Number.isFinite(a) && Number.isFinite(c) && Math.abs(c - a) >= travelDeg - 1e-6;
}

export interface SheetSummary {
  thickness: number;
  kFactor: number;
  /** Bends in chain order: angle (deg) and inner radius (mm). */
  bends: { angle: number; radius: number }[];
}

/** The sheet-metal intent recorded by `sheetMetal(...).bend(...)`, if any. */
export function sheetMetalOf(b: UsecaseBuild): SheetSummary | undefined {
  const sm = recordsOf(b, 'sheetMetal')[0];
  if (!sm) return undefined;
  const v = (r: RecordLike, k: string) => Number(r.params?.[k]?.evaluated);
  return {
    thickness: v(sm, 'thickness'),
    kFactor: v(sm, 'kFactor'),
    bends: recordsOf(b, 'sheetMetalBend').map((r) => ({ angle: v(r, 'angle'), radius: v(r, 'radius') })),
  };
}

export interface FlatSummary {
  /** Bbox of the flat blank outline. */
  size: [number, number];
  bends: number;
  /** Bend lines in blank coordinates. */
  lines: { start: [number, number]; end: [number, number] }[];
}

/** Flat pattern of the last sheet-metal bend chain, or undefined. */
export function flatPattern(b: UsecaseBuild): FlatSummary | undefined {
  const bends = recordsOf(b, 'sheetMetalBend');
  const last = bends[bends.length - 1];
  if (!last?.id || !b.model) return undefined;
  try {
    const region = flattenPattern(b.model.records, last.id);
    const xs = region.outer.map((p) => p[0]);
    const ys = region.outer.map((p) => p[1]);
    return {
      size: [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)],
      bends: region.bendLines.length,
      lines: region.bendLines.map((l) => ({ start: [l.start[0], l.start[1]], end: [l.end[0], l.end[1]] })),
    };
  } catch {
    return undefined;
  }
}

/** Developed length of one bend (K-factor approximation). */
export function bendAllowance(angleDeg: number, radius: number, thickness: number, kFactor: number): number {
  return (Math.PI * Math.abs(angleDeg) / 180) * (kFactor * thickness + radius);
}

type Seg = [number, number, number, number];

/** Edges of the mesh cross-section at height z (tessellation of the shape). */
function sectionSegments(shape: OcctBackend, z: number): Seg[] {
  const { positions: p, indices: ix } = shape.getMesh();
  const segs: Seg[] = [];
  for (let t = 0; t < ix.length; t += 3) {
    const pts: [number, number][] = [];
    for (let k = 0; k < 3; k++) {
      const a = ix[t + k] * 3;
      const b = ix[t + ((k + 1) % 3)] * 3;
      const za = p[a + 2] - z;
      const zb = p[b + 2] - z;
      if ((za < 0) === (zb < 0)) continue;
      const f = za / (za - zb);
      pts.push([p[a] + f * (p[b] - p[a]), p[a + 1] + f * (p[b + 1] - p[a + 1])]);
    }
    if (pts.length === 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
  }
  return segs;
}

/** Point-in-section test by ray crossing parity (+X ray). */
function insideSection(segs: readonly Seg[], x: number, y: number): boolean {
  let inside = false;
  for (const [x0, y0, x1, y1] of segs) {
    if ((y0 > y) === (y1 > y)) continue;
    const xc = x0 + ((y - y0) * (x1 - x0)) / (y1 - y0);
    if (xc > x) inside = !inside;
  }
  return inside;
}

/**
 * Teeth of a gear: count material runs on the circle of radius `r` (between
 * root and tip) around (cx, cy), in the cross-section at height z. Uses the
 * tessellated section — a boolean with a ring is minutes on an involute gear.
 */
export function toothCount(shape: OcctBackend, cx: number, cy: number, r: number, z: number): number {
  const segs = sectionSegments(shape, z);
  const n = 1440;
  const state = Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * (i + 0.5)) / n;
    return insideSection(segs, cx + r * Math.cos(a), cy + r * Math.sin(a));
  });
  let runs = 0;
  for (let i = 0; i < n; i++) if (state[i] && !state[(i + n - 1) % n]) runs += 1;
  return runs === 0 && state[0] ? 1 : runs;
}

/** Material volume shared by two parts (mm³). */
export function overlap(a: OcctBackend, b: OcctBackend): number {
  return a.intersectionVolume(b);
}

export { emptyIn, fullIn, materialIn, near };

/** STEP export re-imports with `solids` solids and the model's volume (0.5%). */
export async function stepExportOk(b: UsecaseBuild, solids: number): Promise<boolean> {
  const step = await exportAs(b, 'step');
  if (!step.ok) return false;
  const re = await reimportStep(step.bytes);
  if (!re) return false;
  const vol = b.parts.reduce((s, p) => s + p.shape.volume(), 0);
  const stepVol = re.solids.reduce((s, x) => s + x.volumeMm3, 0);
  return re.solidCount === solids && Math.abs(stepVol - vol) <= vol * 0.005;
}

export interface MechContext {
  build: UsecaseBuild;
  /** A named part (or the single body) seen from its bbox min corner. */
  part(name?: string): LocalShape;
}

export interface MechSpec {
  /** Assembly part names; omit for a single-body part. */
  parts?: readonly string[];
  /** Solids per part when a part is legitimately several solids (default 1). */
  solids?: Readonly<Record<string, number>>;
  /** Measurable properties: check name → pass. */
  checks(ctx: MechContext): Record<string, boolean> | Promise<Record<string, boolean>>;
  /**
   * Checks that fail today because of a known open kernel bug: check name →
   * finding. They are measured but reported under `metrics['open: <name>']`
   * instead of `scored`, so the task stays passable; the regression suite
   * runs each as `it.fails` and turns red the day the bug is fixed.
   */
  open?: Readonly<Record<string, string>>;
}

/** Move open-bug checks out of the scored set into metrics. */
function splitOpen(scored: Record<string, boolean>, open: Readonly<Record<string, string>> = {}) {
  const metrics: Record<string, boolean> = {};
  for (const name of Object.keys(open)) {
    if (name in scored) {
      metrics[`open: ${name}`] = scored[name];
      delete scored[name];
    }
  }
  return metrics;
}

function gatesFor(b: UsecaseBuild, spec: MechSpec): Record<string, boolean> {
  const names = b.parts.map((p) => p.name);
  const want = spec.parts ?? ['body'];
  return {
    'evaluates clean': b.clean,
    [`parts: ${want.join(', ')}`]: names.length === want.length && want.every((n) => names.includes(n)),
    'closed valid solid per part': b.parts.length > 0
      && b.parts.every((p) => isClosedSolid(p.shape, spec.solids?.[p.name] ?? 1)),
  };
}

function contextFor(b: UsecaseBuild): MechContext {
  const cache = new Map<string, LocalShape>();
  return {
    build: b,
    part(name = 'body') {
      const hit = cache.get(name);
      if (hit) return hit;
      const p = b.parts.find((x) => x.name === name);
      if (!p) throw new Error(`mech40: no part '${name}' (have ${b.parts.map((x) => x.name).join(', ')})`);
      const l = local(p.shape);
      cache.set(name, l);
      return l;
    },
  };
}

/** Run one check function; a throw is a failed check, never an infra error. */
async function runChecks(spec: MechSpec, ctx: MechContext): Promise<Record<string, boolean>> {
  try {
    return await spec.checks(ctx);
  } catch (err) {
    return { [`checks ran (${err instanceof Error ? err.message : String(err)})`]: false };
  }
}

/** Build a task harness: `export default mechHarness({ ... })`. */
export type MechHarness = ((scriptPath: string) => Promise<HarnessResult>) & {
  /** The task's open (known-bug) checks: name → finding. */
  open: Readonly<Record<string, string>>;
};

/** Build a task harness: `export default mechHarness({ ... })`. */
export function mechHarness(spec: MechSpec): MechHarness {
  const run = async (scriptPath: string): Promise<HarnessResult> => {
    let b: UsecaseBuild;
    try {
      b = await buildUsecase(scriptPath);
    } catch (err) {
      return { gates: { 'evaluates clean': false }, scored: {}, metrics: { error: String(err) } };
    }
    const gates = gatesFor(b, spec);
    if (!Object.values(gates).every(Boolean)) return { gates, scored: {} };
    const scored = await runChecks(spec, contextFor(b));
    const metrics = splitOpen(scored, spec.open);
    const solids = b.parts.reduce((s, p) => s + (spec.solids?.[p.name] ?? 1), 0);
    scored['STEP export re-imports'] = await stepExportOk(b, solids);
    return { gates, scored, ...(Object.keys(metrics).length > 0 ? { metrics } : {}) };
  };
  return Object.assign(run, { open: spec.open ?? {} });
}
