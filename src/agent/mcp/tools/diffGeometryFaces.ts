// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/diffGeometryFaces.ts
//
// Face-level change lists for `diff_geometry`. The body verdict says THAT a
// body changed; this says WHICH faces changed: per matched body it lists the
// faces that appeared (added), vanished (removed) or survived with different
// geometry (modified: moved | resized | reshaped), plus how many are
// unchanged.
//
// Matching is three passes, most trustworthy first:
//   1. lineage — each face's HistoryMap entry names the feature that made it
//      and its role there (`box_1/top`, a sketch label, …). A key that occurs
//      exactly once on each side pairs the two faces outright, whatever their
//      geometry did. That is what makes a translated box report six MOVED
//      faces instead of six removed + six added.
//   2. exact geometry — for faces lineage could not pair (unlabelled fillet
//      faces, assembly parts whose world-frame clones dropped their lineage):
//      same surface type, centroid within tolerance, same area, parallel
//      normal/axis, same radius → unchanged.
//   3. near geometry — of what is still unpaired, same surface type with a
//      compatible normal/axis, paired greedily by nearest centroid inside a
//      body-sized proximity radius → modified.
// Whatever is left is added (revised side) or removed (baseline side).
// Every list is sorted deterministically and capped at FACE_LIST_CAP.
//
// Reuse: per-face geometry is the S1 `faceFingerprint` (surface type, area,
// centroid, plane normal or cylinder/cone axis, radius) and lineage is the
// shape's own HistoryMap, both read through the kernel's `faceInventory`.

import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { faceInventory, type FaceInventoryEntry } from '../../../kernel/backends/occt/faceInventory';
import { formatTopoRef } from '../../../kernel/naming';

type Vec3 = [number, number, number];

/** Maximum entries per list; the totals and `truncated` keep the rest honest. */
export const FACE_LIST_CAP = 50;

export type FaceSurfaceType = 'plane' | 'cylinder' | 'cone' | 'sphere' | 'torus' | 'bspline' | 'other';

export interface FaceGeometry {
  surfaceType: FaceSurfaceType;
  areaMm2: number;
  center: Vec3;
  /** Unit outward normal — planes only. */
  normal?: Vec3;
  /** Unit axis (sign-normalised) — cylinders and cones. */
  axis?: Vec3;
  /** Cylinder / sphere radius, cone reference radius, torus minor radius. */
  radiusMm?: number;
  /** Torus major radius. */
  majorRadiusMm?: number;
  /** Stable `@kc[...]` ref on the REVISED model, when the face has a lineage
   *  name there. Absent on removed faces and on unnamed faces. */
  ref?: string;
}

export type FaceChange = FaceGeometry;

export type FaceModificationKind = 'moved' | 'resized' | 'reshaped';

export interface FaceModification extends FaceGeometry {
  change: FaceModificationKind;
  /** How the pair was established. */
  matchedBy: 'lineage' | 'geometry';
  before: FaceGeometry;
  after: FaceGeometry;
  /** after.center − before.center (mm). */
  offsetMm: Vec3;
}

export interface BodyFaceChanges {
  added: FaceChange[];
  removed: FaceChange[];
  modified: FaceModification[];
  unchangedCount: number;
  /** Totals before the FACE_LIST_CAP cap. */
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  /** Pairs established by lineage (the rest matched by geometry). */
  matchedByLineage: number;
  /** True when any list was cut at FACE_LIST_CAP. */
  truncated: boolean;
}

interface FaceRecord {
  /** Lineage key `<producer>/<role>`; undefined when the face has no name. */
  key?: string;
  geom: FaceGeometry;
}

interface FacePair {
  base: FaceRecord;
  revised: FaceRecord;
  matchedBy: 'lineage' | 'geometry';
}

const REL_AREA_TOL = 1e-4;
const ABS_TOL = 1e-6;
const PARALLEL_TOL = 1e-6;

const round = (v: number): number => {
  const r = Math.round(v * 1e4) / 1e4;
  return Object.is(r, -0) ? 0 : r;
};
const roundVec = (v: readonly number[]): Vec3 => [round(v[0]), round(v[1]), round(v[2])];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function publicType(occt: string): FaceSurfaceType {
  switch (occt) {
    case 'PLANE': return 'plane';
    case 'CYLINDRE': return 'cylinder';
    case 'CONE': return 'cone';
    case 'SPHERE': return 'sphere';
    case 'TORUS': return 'torus';
    case 'BSPLINE': return 'bspline';
    default: return 'other';
  }
}

function lineageName(entry: FaceInventoryEntry): { producer: string; role: string } | undefined {
  const lineage = entry.lineage;
  if (lineage === undefined) return undefined;
  const role = lineage.labelName ?? lineage.canonicalName;
  if (role === undefined) return undefined;
  return { producer: lineage.featureId ?? lineage.rootFeatureId, role };
}

/** Raw (unrounded) geometry — matching compares these; output rounds them. */
function faceGeometry(entry: FaceInventoryEntry): FaceGeometry {
  const fp = entry.fingerprint;
  const surfaceType = publicType(fp.geomType);
  const geom: FaceGeometry = { surfaceType, areaMm2: fp.size, center: [...fp.centroid] as Vec3 };
  if (fp.direction !== undefined) {
    if (surfaceType === 'plane') geom.normal = [...fp.direction] as Vec3;
    else if (surfaceType === 'cylinder' || surfaceType === 'cone') geom.axis = [...fp.direction] as Vec3;
  }
  if (fp.radius !== undefined) geom.radiusMm = fp.radius;
  if (entry.torus !== undefined) {
    geom.radiusMm = entry.torus.minorRadius;
    geom.majorRadiusMm = entry.torus.majorRadius;
  }
  return geom;
}

/** Output form: 0.1 µm resolution, no `-0`, no ref unless asked. */
function publish(g: FaceGeometry, keepRef: boolean): FaceGeometry {
  const out: FaceGeometry = { surfaceType: g.surfaceType, areaMm2: round(g.areaMm2), center: roundVec(g.center) };
  if (g.normal !== undefined) out.normal = roundVec(g.normal);
  if (g.axis !== undefined) out.axis = roundVec(g.axis);
  if (g.radiusMm !== undefined) out.radiusMm = round(g.radiusMm);
  if (g.majorRadiusMm !== undefined) out.majorRadiusMm = round(g.majorRadiusMm);
  if (keepRef && g.ref !== undefined) out.ref = g.ref;
  return out;
}

/** Read every face of a body. `refOwner` (the revised model's root feature
 *  id) turns named faces into `@kc[<owner>/face/<name>]` refs. */
export function collectFaces(shape: OcctBackend, refOwner?: string): FaceRecord[] {
  return faceInventory(shape).map((entry) => {
    const geom = faceGeometry(entry);
    const name = lineageName(entry);
    if (name === undefined) return { geom };
    if (refOwner !== undefined) geom.ref = formatTopoRef({ owner: refOwner, kind: 'face', segments: [name.role] });
    return { key: `${name.producer}/${name.role}`, geom };
  });
}

// ----- Matching ---------------------------------------------------------------

function directionOf(g: FaceGeometry): Vec3 | undefined {
  return g.normal ?? g.axis;
}

/** Planes must face the same way; an axis has no sign. */
function directionsParallel(a: FaceGeometry, b: FaceGeometry, tol: number): boolean {
  const da = directionOf(a);
  const db = directionOf(b);
  if (da === undefined || db === undefined) return da === db;
  const d = dot(da, db);
  return (a.normal !== undefined ? d : Math.abs(d)) >= 1 - tol;
}

function sameScalar(a: number | undefined, b: number | undefined, tol: number): boolean {
  if (a === undefined || b === undefined) return a === b;
  return Math.abs(a - b) <= Math.max(tol, REL_AREA_TOL * Math.max(Math.abs(a), Math.abs(b)));
}

function sameArea(a: FaceGeometry, b: FaceGeometry): boolean {
  return sameScalar(a.areaMm2, b.areaMm2, ABS_TOL);
}

function sameSize(a: FaceGeometry, b: FaceGeometry, posTol: number): boolean {
  return sameArea(a, b) && sameScalar(a.radiusMm, b.radiusMm, posTol) && sameScalar(a.majorRadiusMm, b.majorRadiusMm, posTol);
}

function identicalGeometry(a: FaceGeometry, b: FaceGeometry, posTol: number): boolean {
  return a.surfaceType === b.surfaceType
    && norm(sub(a.center, b.center)) <= posTol
    && sameSize(a, b, posTol)
    && directionsParallel(a, b, PARALLEL_TOL);
}

function lineagePairs(base: FaceRecord[], revised: FaceRecord[]): FacePair[] {
  const count = (list: FaceRecord[]): Map<string, FaceRecord[]> => {
    const m = new Map<string, FaceRecord[]>();
    for (const f of list) if (f.key !== undefined) m.set(f.key, [...(m.get(f.key) ?? []), f]);
    return m;
  };
  const b = count(base);
  const r = count(revised);
  const pairs: FacePair[] = [];
  for (const [key, bs] of [...b.entries()].sort(([x], [y]) => x.localeCompare(y))) {
    const rs = r.get(key);
    if (bs.length === 1 && rs?.length === 1) pairs.push({ base: bs[0], revised: rs[0], matchedBy: 'lineage' });
  }
  return pairs;
}

interface Candidate { bi: number; ri: number; cost: number }

/** Greedy global assignment: cheapest candidate first, ties broken by index —
 *  deterministic for a given face order. */
function greedyAssign(
  base: FaceRecord[],
  revised: FaceRecord[],
  costOf: (b: FaceGeometry, r: FaceGeometry) => number | undefined,
): FacePair[] {
  const candidates: Candidate[] = [];
  base.forEach((b, bi) => revised.forEach((r, ri) => {
    const cost = costOf(b.geom, r.geom);
    if (cost !== undefined) candidates.push({ bi, ri, cost });
  }));
  candidates.sort((x, y) => x.cost - y.cost || x.bi - y.bi || x.ri - y.ri);
  const usedB = new Set<number>();
  const usedR = new Set<number>();
  const pairs: FacePair[] = [];
  for (const c of candidates) {
    if (usedB.has(c.bi) || usedR.has(c.ri)) continue;
    usedB.add(c.bi);
    usedR.add(c.ri);
    pairs.push({ base: base[c.bi], revised: revised[c.ri], matchedBy: 'geometry' });
  }
  return pairs;
}

function without(list: FaceRecord[], used: ReadonlySet<FaceRecord>): FaceRecord[] {
  return list.filter((f) => !used.has(f));
}

/** Pair the faces of one body across the two sides (see the header). */
export function matchFaces(
  base: FaceRecord[],
  revised: FaceRecord[],
  scaleMm: number,
): { pairs: FacePair[]; added: FaceRecord[]; removed: FaceRecord[] } {
  const posTol = Math.max(1e-4, 1e-6 * scaleMm);
  const nearMm = Math.max(1, 0.5 * scaleMm);
  const used = new Set<FaceRecord>();
  const take = (ps: FacePair[]): FacePair[] => {
    for (const p of ps) { used.add(p.base); used.add(p.revised); }
    return ps;
  };

  const pairs = take(lineagePairs(base, revised));
  pairs.push(...take(greedyAssign(without(base, used), without(revised, used), (b, r) => (
    identicalGeometry(b, r, posTol) ? norm(sub(b.center, r.center)) : undefined
  ))));
  pairs.push(...take(greedyAssign(without(base, used), without(revised, used), (b, r) => {
    if (b.surfaceType !== r.surfaceType || !directionsParallel(b, r, 1e-3)) return undefined;
    const d = norm(sub(b.center, r.center));
    if (d > nearMm) return undefined;
    const areaRatio = Math.abs(Math.log(Math.max(b.areaMm2, ABS_TOL) / Math.max(r.areaMm2, ABS_TOL)));
    return d / nearMm + 0.1 * areaRatio;
  })));
  return { pairs, added: without(revised, used), removed: without(base, used) };
}

// ----- Classification + assembly ---------------------------------------------

function classifyPair(p: FacePair, posTol: number): FaceModificationKind | 'unchanged' {
  const a = p.base.geom;
  const b = p.revised.geom;
  if (a.surfaceType !== b.surfaceType) return 'reshaped';
  if (!sameSize(a, b, posTol)) return 'resized';
  if (norm(sub(a.center, b.center)) > posTol || !directionsParallel(a, b, PARALLEL_TOL)) return 'moved';
  return 'unchanged';
}

/** Deterministic order: surface type, then centre x/y/z, then area. */
function compareGeom(a: FaceGeometry, b: FaceGeometry): number {
  return a.surfaceType.localeCompare(b.surfaceType)
    || a.center[0] - b.center[0] || a.center[1] - b.center[1] || a.center[2] - b.center[2]
    || a.areaMm2 - b.areaMm2;
}

const CHANGE_ORDER: Record<FaceModificationKind, number> = { reshaped: 0, resized: 1, moved: 2 };

/** Compare the faces of one matched body. `refOwner` is the revised side's
 *  root feature id, when the body has one. */
export function diffBodyFaces(
  base: OcctBackend,
  revised: OcctBackend,
  scaleMm: number,
  refOwner?: string,
): BodyFaceChanges {
  const posTol = Math.max(1e-4, 1e-6 * scaleMm);
  const { pairs, added, removed } = matchFaces(collectFaces(base), collectFaces(revised, refOwner), scaleMm);

  const modified: FaceModification[] = [];
  let unchangedCount = 0;
  for (const p of pairs) {
    const change = classifyPair(p, posTol);
    if (change === 'unchanged') { unchangedCount++; continue; }
    modified.push({
      ...publish(p.revised.geom, true),
      change,
      matchedBy: p.matchedBy,
      before: publish(p.base.geom, false),
      after: publish(p.revised.geom, false),
      offsetMm: roundVec(sub(p.revised.geom.center, p.base.geom.center)),
    });
  }
  modified.sort((a, b) => CHANGE_ORDER[a.change] - CHANGE_ORDER[b.change] || compareGeom(a.before, b.before));
  const addedGeom = added.map((f) => publish(f.geom, true)).sort(compareGeom);
  const removedGeom = removed.map((f) => publish(f.geom, false)).sort(compareGeom);

  return {
    added: addedGeom.slice(0, FACE_LIST_CAP),
    removed: removedGeom.slice(0, FACE_LIST_CAP),
    modified: modified.slice(0, FACE_LIST_CAP),
    unchangedCount,
    addedCount: addedGeom.length,
    removedCount: removedGeom.length,
    modifiedCount: modified.length,
    matchedByLineage: pairs.filter((p) => p.matchedBy === 'lineage').length,
    truncated: Math.max(addedGeom.length, removedGeom.length, modified.length) > FACE_LIST_CAP,
  };
}

// ----- Plain-language summary --------------------------------------------------

const EXAMPLES = 3;

const fmt = (v: number): string => String(Math.round(v * 100) / 100);
const fmtVec = (v: Vec3): string => `(${v.map(fmt).join(', ')})`;
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

function refName(g: FaceGeometry): string {
  const m = g.ref !== undefined ? /\/face\/([^\]#]+)/.exec(g.ref) : null;
  return m !== null ? ` '${m[1]}'` : '';
}

function faceLabel(g: FaceGeometry): string {
  const r = g.radiusMm !== undefined ? ` r=${fmt(g.radiusMm)}` : '';
  return `${g.surfaceType}${refName(g)}${r}`;
}

/** "3 mm in +Z" for an axis-aligned offset, "4.24 mm along (3, 3, 0)" otherwise. */
export function describeOffset(o: Vec3): string {
  const len = norm(o);
  const axes = [0, 1, 2].filter((i) => Math.abs(o[i]) > 1e-6 * Math.max(1, len));
  if (axes.length === 1) {
    const i = axes[0];
    return `${fmt(Math.abs(o[i]))} mm in ${o[i] > 0 ? '+' : '-'}${'XYZ'[i]}`;
  }
  return `${fmt(len)} mm along ${fmtVec(o)}`;
}

function describeModified(m: FaceModification): string {
  if (m.change === 'reshaped') return `${m.before.surfaceType} -> ${faceLabel(m)} at ${fmtVec(m.center)}`;
  if (m.change === 'moved') return `${faceLabel(m)} ${describeOffset(m.offsetMm)}`;
  const rb = m.before.radiusMm;
  const ra = m.after.radiusMm;
  const what = rb !== undefined && ra !== undefined && Math.abs(rb - ra) > 1e-4
    ? `r=${fmt(rb)} -> ${fmt(ra)}`
    : `area ${fmt(m.before.areaMm2)} -> ${fmt(m.after.areaMm2)} mm²`;
  return `${m.surfaceType}${refName(m)} ${what} at ${fmtVec(m.center)}`;
}

function examples<T>(items: T[], total: number, render: (t: T) => string): string {
  const shown = items.slice(0, EXAMPLES).map(render).join('; ');
  return total > EXAMPLES ? `${shown}; …${total - EXAMPLES} more` : shown;
}

function describeMoved(moved: FaceModification[]): string {
  const offsets = new Set(moved.map((m) => m.offsetMm.join(',')));
  if (offsets.size === 1) return `${plural(moved.length, 'face')} moved ${describeOffset(moved[0].offsetMm)}`;
  return `${plural(moved.length, 'face')} moved (${examples(moved, moved.length, describeModified)})`;
}

const placed = (g: FaceGeometry): string => `${faceLabel(g)} at ${fmtVec(g.center)}`;

/** One plain-language clause list for one body's face changes; undefined
 *  when every face is unchanged. Counts come from the totals, examples from
 *  the (capped) lists. */
export function describeFaceChanges(c: BodyFaceChanges): string | undefined {
  const parts: string[] = [];
  if (c.addedCount > 0) parts.push(`${plural(c.addedCount, 'face')} added (${examples(c.added, c.addedCount, placed)})`);
  if (c.removedCount > 0) parts.push(`${plural(c.removedCount, 'face')} removed (${examples(c.removed, c.removedCount, placed)})`);
  for (const kind of ['reshaped', 'resized'] as const) {
    const list = c.modified.filter((m) => m.change === kind);
    if (list.length > 0) parts.push(`${plural(list.length, 'face')} ${kind} (${examples(list, list.length, describeModified)})`);
  }
  const moved = c.modified.filter((m) => m.change === 'moved');
  if (moved.length > 0) parts.push(describeMoved(moved));
  if (parts.length === 0) return undefined;
  if (c.unchangedCount > 0) parts.push(`${c.unchangedCount} unchanged`);
  return parts.join(', ');
}
