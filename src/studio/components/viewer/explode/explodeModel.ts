// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Viewer side of the exploded view: read part boxes from the displayed
 * meshes, read mate / joint links from the feature records, and lay out
 * translated copies of the meshes. Viewport only: nothing here touches the
 * script, the params or the saved model.
 */
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { parseConnectorRef } from '../../../../modeling/mates/mate';
import {
  explodeLayout,
  type ExplodeLayout,
  type ExplodeLayoutLink,
  type ExplodeLayoutPart,
  type Vec3,
} from '../../../../modeling/animation/explodeLayout';

/** The explode key of a displayed mesh: its assembly part, else its feature. */
export function explodeKey(geometry: GeometryResult, index: number): string {
  return geometry.assemblyPartName ?? geometry.featureId ?? `#${index}`;
}

interface LocalBox { min: Vec3; max: Vec3 }

// Local (pre-transform) boxes are cached on the vertex arrays: the animation
// and pose paths copy GeometryResult objects but keep the same faces/mesh.
const localBoxCache = new WeakMap<object, LocalBox | null>();

function localBox(geometry: GeometryResult): LocalBox | null {
  const cacheKey: object = geometry.mesh ?? geometry.faces;
  const cached = localBoxCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const visit = (v: Float32Array): void => {
    for (let i = 0; i + 2 < v.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const c = v[i + k]!;
        if (c < min[k]!) min[k] = c;
        if (c > max[k]!) max[k] = c;
      }
    }
  };
  if (geometry.mesh) visit(geometry.mesh.positions);
  else for (const face of geometry.faces) visit(face.vertices);
  const box = Number.isFinite(min[0]) ? { min: min as unknown as Vec3, max: max as unknown as Vec3 } : null;
  localBoxCache.set(cacheKey, box);
  return box;
}

function isMatrix(m: number[] | undefined): m is number[] {
  return Array.isArray(m) && m.length === 16 && m.every(Number.isFinite);
}

function applyPoint(m: number[] | undefined, p: Vec3): Vec3 {
  if (!isMatrix(m)) return p;
  return [
    m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2] + m[12]!,
    m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2] + m[13]!,
    m[2]! * p[0] + m[6]! * p[1] + m[10]! * p[2] + m[14]!,
  ];
}

function applyDirection(m: number[] | undefined, d: Vec3): Vec3 {
  if (!isMatrix(m)) return d;
  return [
    m[0]! * d[0] + m[4]! * d[1] + m[8]! * d[2],
    m[1]! * d[0] + m[5]! * d[1] + m[9]! * d[2],
    m[2]! * d[0] + m[6]! * d[1] + m[10]! * d[2],
  ];
}

export interface ExplodeParts {
  parts: ExplodeLayoutPart[];
  /** Transform of the first mesh of each part (the part's frame). */
  matrices: Map<string, number[] | undefined>;
}

/** World boxes per explode key, in first-appearance order. Meshes with no
 *  vertices (virtual features) are left out. */
export function explodeParts(geometries: readonly GeometryResult[]): ExplodeParts {
  const acc = new Map<string, { min: number[]; max: number[] }>();
  const matrices = new Map<string, number[] | undefined>();
  geometries.forEach((g, i) => {
    const box = localBox(g);
    if (!box) return;
    const key = explodeKey(g, i);
    if (!matrices.has(key)) matrices.set(key, g.transform);
    const entry = acc.get(key) ?? { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (let c = 0; c < 8; c++) {
      const corner: Vec3 = [
        c & 1 ? box.max[0] : box.min[0],
        c & 2 ? box.max[1] : box.min[1],
        c & 4 ? box.max[2] : box.min[2],
      ];
      const w = applyPoint(g.transform, corner);
      for (let k = 0; k < 3; k++) {
        entry.min[k] = Math.min(entry.min[k]!, w[k]!);
        entry.max[k] = Math.max(entry.max[k]!, w[k]!);
      }
    }
    acc.set(key, entry);
  });
  const parts: ExplodeLayoutPart[] = [];
  for (const [key, { min, max }] of acc) {
    parts.push({
      key,
      center: [(min[0]! + max[0]!) / 2, (min[1]! + max[1]!) / 2, (min[2]! + max[2]!) / 2],
      size: [max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!],
    });
  }
  return { parts, matrices };
}

/** A captured vector in any of its encoded forms: `[x,y,z]`,
 *  `{ kind: 'vec3', value }`, or `{ x, y, z }` (numbers or Params). */
function readVec3(raw: unknown): Vec3 | undefined {
  if (Array.isArray(raw) && raw.length >= 3) {
    const v = raw.slice(0, 3).map(readNumber);
    return v.every((n): n is number => n !== undefined) ? (v as unknown as Vec3) : undefined;
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if ('value' in o) return readVec3(o.value);
    if ('x' in o && 'y' in o && 'z' in o) return readVec3([o.x, o.y, o.z]);
  }
  return undefined;
}

function readNumber(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object' && 'evaluated' in raw) return readNumber((raw as { evaluated: unknown }).evaluated);
  return undefined;
}

function safeRef(ref: unknown): { partName: string; connectorName: string } | undefined {
  if (typeof ref !== 'string') return undefined;
  try { return parseConnectorRef(ref); } catch { return undefined; }
}

interface EncodedConnector { name?: unknown; axis?: unknown; normal?: unknown }

function partNamesById(records: readonly FeatureRecord[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const rec of records) {
    if (rec.kind !== 'assemblyPart') continue;
    const name = (rec.metadata as { partName?: unknown } | undefined)?.partName;
    if (typeof name === 'string') out.set(rec.id, name);
  }
  return out;
}

function connectorAxes(
  meta: { connectorsByPartId?: Record<string, readonly EncodedConnector[]> },
  namesById: Map<string, string>,
): Map<string, Vec3> {
  const out = new Map<string, Vec3>();
  for (const [partId, list] of Object.entries(meta.connectorsByPartId ?? {})) {
    const partName = namesById.get(partId) ?? partId;
    for (const c of list ?? []) {
      if (typeof c?.name !== 'string') continue;
      const axis = readVec3(c.axis) ?? readVec3(c.normal);
      if (axis) out.set(`${partName}.${c.name}`, axis);
    }
  }
  return out;
}

function refName(ref: unknown, namesById: Map<string, string>): string | undefined {
  if (!ref || typeof ref !== 'object') return undefined;
  const r = ref as { kind?: unknown; id?: unknown };
  if (r.kind !== 'feature' || typeof r.id !== 'string') return undefined;
  return namesById.get(r.id) ?? r.id;
}

/** Mate, joint and placement links between assembly parts, with the world
 *  axis of the mate where the connector declares one. */
export function explodeLinks(
  records: readonly FeatureRecord[],
  matrices: ReadonlyMap<string, number[] | undefined>,
): ExplodeLayoutLink[] {
  const namesById = partNamesById(records);
  const links: ExplodeLayoutLink[] = [];
  const worldAxis = (partName: string, local: Vec3 | undefined): Vec3 | undefined =>
    local ? applyDirection(matrices.get(partName), local) : undefined;

  for (const rec of records) {
    const meta = (rec.metadata ?? {}) as Record<string, unknown>;
    if (rec.kind === 'solvedAssembly' || rec.kind === 'assemblyModel') {
      const mates = Array.isArray(meta.mates) ? (meta.mates as { a?: unknown; b?: unknown }[]) : [];
      const axes = connectorAxes(meta as { connectorsByPartId?: Record<string, readonly EncodedConnector[]> }, namesById);
      for (const m of mates) {
        const a = safeRef(m.a);
        const b = safeRef(m.b);
        if (!a || !b) continue;
        const axisA = axes.get(`${a.partName}.${a.connectorName}`);
        const axisB = axes.get(`${b.partName}.${b.connectorName}`);
        const axis = worldAxis(a.partName, axisA) ?? worldAxis(b.partName, axisB);
        links.push({ a: a.partName, b: b.partName, ...(axis ? { axis } : {}) });
      }
    } else if (rec.kind === 'assemblyJoint') {
      const a = refName(rec.inputs?.a, namesById);
      const b = refName(rec.inputs?.b, namesById);
      if (!a || !b) continue;
      const axis = worldAxis(a, readVec3(meta.axis));
      links.push({ a, b, ...(axis ? { axis } : {}) });
    } else if (rec.kind === 'assemblyConnect') {
      const a = (meta.a as { partName?: unknown } | undefined)?.partName;
      const b = (meta.b as { partName?: unknown } | undefined)?.partName;
      if (typeof a !== 'string' || typeof b !== 'string') continue;
      const axis = worldAxis(a, readVec3((meta.a as { axis?: unknown }).axis));
      links.push({ a, b, ...(axis ? { axis } : {}) });
    } else if (rec.kind === 'assemblyPart') {
      const self = typeof meta.partName === 'string' ? meta.partName : undefined;
      const to = (meta.placedBy as { to?: { partName?: unknown } } | undefined)?.to?.partName;
      if (self && typeof to === 'string') links.push({ a: to, b: self });
    }
  }
  return links;
}

export function layoutForView(
  geometries: readonly GeometryResult[],
  records: readonly FeatureRecord[],
): { layout: ExplodeLayout; partCount: number } {
  const { parts, matrices } = explodeParts(geometries);
  return { layout: explodeLayout(parts, explodeLinks(records, matrices)), partCount: parts.length };
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Copies of the meshes moved by the layout at `factor`. Meshes keep their
 *  vertex arrays; only `transform` changes (world translation, left-composed). */
export function explodedGeometries(
  geometries: readonly GeometryResult[],
  layout: ExplodeLayout,
  factor: number,
): GeometryResult[] {
  const f = Number.isFinite(factor) ? Math.max(0, factor) : 0;
  return geometries.map((g, i) => {
    const off = layout.offsets.get(explodeKey(g, i));
    if (!off || f === 0 || (off[0] === 0 && off[1] === 0 && off[2] === 0)) return g;
    const base = isMatrix(g.transform) ? g.transform : IDENTITY;
    const transform = [...base];
    // T(off) · M: the translation column gains the offset; w stays 1 for rigid M.
    transform[12] = base[12]! + off[0] * f;
    transform[13] = base[13]! + off[1] * f;
    transform[14] = base[14]! + off[2] * f;
    return { ...g, transform };
  });
}

const ids = new WeakMap<object, number>();
let nextId = 1;
function idOf(o: object): number {
  let id = ids.get(o);
  if (id === undefined) { id = nextId++; ids.set(o, id); }
  return id;
}

/** Changes when the displayed model changes: other meshes, or a part moved
 *  (animation playback, joint drag, param edit, code edit). */
export function poseSignature(geometries: readonly GeometryResult[]): string {
  return geometries
    .map((g) => `${idOf(g.mesh ?? g.faces)}:${isMatrix(g.transform) ? g.transform.map((v) => v.toFixed(4)).join(',') : '-'}`)
    .join('|');
}
