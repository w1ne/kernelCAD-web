// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/bindingFingerprint.ts
//
// Read the BindingFingerprint of a resolved face or edge, and report a
// selector's resolution to the sink of the feature that consumed it. One
// reporting point serves every selector syntax: label, `@kc[...]` ref, query.

import { getOC, measureArea, type Edge, type Face } from 'replicad';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { BindingFingerprint, SelectionRecord, SelectorSyntax } from '../../../shared/intent/selectionRecord';
import type { Vec3 } from '../../../shared/intent/types';
import { hasSelectionSink, recordSelection } from '../../naming/selectionSink';
import { makeQuery } from '../../naming/query';
import { faceHashOf, surfaceTypeOf } from './createdRefs';
import type { OcctBackend } from './occtBackend';

const unit = (x: number, y: number, z: number): Vec3 | undefined => {
  const n = Math.hypot(x, y, z);
  return n > 1e-9 ? [x / n, y / n, z / n] : undefined;
};

/** Axis of a cylinder/cone, oriented to its dominant positive axis (an axis has no sign). */
function orientAxis(d: Vec3): Vec3 {
  const k = [0, 1, 2].reduce((m, i) => (Math.abs(d[i]!) > Math.abs(d[m]!) ? i : m), 0);
  return d[k]! < 0 ? [-d[0], -d[1], -d[2]] : d;
}

/** Radius and axis of an analytic surface; undefined for planes and free-form surfaces. */
function analytic(face: Face, type: string): { radius?: number; axis?: Vec3 } {
  if (type !== 'CYLINDRE' && type !== 'SPHERE' && type !== 'CONE') return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- installed OCCT API
  const oc = getOC() as any;
  const adaptor = new oc.BRepAdaptor_Surface_2(face.wrapped, true);
  try {
    const s = type === 'CYLINDRE' ? adaptor.Cylinder() : type === 'SPHERE' ? adaptor.Sphere() : adaptor.Cone();
    try {
      const radius: number = type === 'CONE' ? s.RefRadius() : s.Radius();
      if (type === 'SPHERE') return { radius };
      const dir = s.Position().Direction();
      const axis = unit(dir.X(), dir.Y(), dir.Z());
      return { radius, ...(axis ? { axis: orientAxis(axis) } : {}) };
    } finally { s.delete(); }
  } catch { return {}; } finally { adaptor.delete(); }
}

export function faceFingerprint(base: OcctBackend, face: Face): BindingFingerprint {
  const geomType = surfaceTypeOf(face);
  const lineage = base.historyMap?.get(faceHashOf(face));
  const producer = lineage?.featureId ?? lineage?.rootFeatureId;
  const role = lineage?.canonicalName ?? lineage?.labelName;
  const c = face.center;
  let normal: Vec3 | undefined;
  try {
    const n = face.normalAt();
    normal = unit(n.x, n.y, n.z);
    n.delete();
  } catch { /* leave undefined */ }
  const { radius, axis } = analytic(face, geomType);
  let area = 0;
  try { area = measureArea(face); } catch { /* degenerate face */ }
  const direction = axis ?? normal;
  return {
    entityKind: 'face',
    geomType,
    ...(producer !== undefined ? { producer } : {}),
    ...(role !== undefined ? { role } : {}),
    ...(direction ? { direction } : {}),
    ...(radius !== undefined ? { radius } : {}),
    size: area,
    centroid: [c.x, c.y, c.z],
  };
}

export function edgeFingerprint(edge: Edge): BindingFingerprint {
  const mid = edge.pointAt(0.5);
  const tangent = edge.tangentAt(0.5);
  const direction = unit(tangent.x, tangent.y, tangent.z);
  const centroid: Vec3 = [mid.x, mid.y, mid.z];
  mid.delete();
  tangent.delete();
  let radius: number | undefined;
  if (edge.geomType === 'CIRCLE') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- installed OCCT API
    const oc = getOC() as any;
    const adaptor = new oc.BRepAdaptor_Curve_2(edge.wrapped);
    try {
      const circle = adaptor.Circle();
      try { radius = circle.Radius(); } finally { circle.delete(); }
    } catch { /* leave undefined */ } finally { adaptor.delete(); }
  }
  return {
    entityKind: 'edge',
    geomType: edge.geomType,
    ...(direction ? { direction } : {}),
    ...(radius !== undefined ? { radius } : {}),
    size: edge.length,
    centroid,
  };
}

function partDiagonal(base: OcctBackend): number {
  try {
    const bb = base.getReplicadShape().boundingBox;
    const d = Math.hypot(bb.width, bb.height, bb.depth);
    bb.delete();
    return d;
  } catch { return 0; }
}

/** The selector as the agent authored it, and which syntax it was. */
export function describeSelector(record: FeatureRecord, slot: 'face' | 'edges'): { text: string; syntax: SelectorSyntax } {
  const ref = record.inputs[slot];
  if (!ref) return { text: '', syntax: 'lineage' };
  if (ref.kind === 'face') {
    const r = ref.ref;
    if (r.kind === 'label') return { text: r.name, syntax: 'lineage' };
    if (r.kind === 'canonical') return { text: r.face, syntax: 'lineage' };
    if (r.kind === 'queryDsl') {
      const ast = r.queryAst as { op?: string; ref?: string };
      if (ast.op === 'fromString' && typeof ast.ref === 'string') {
        return { text: ast.ref, syntax: ast.ref.startsWith('@kc[') ? 'topoRef' : 'query' };
      }
      return { text: dslOf(r), syntax: 'query' };
    }
    if (r.kind === 'query') return { text: JSON.stringify(r.query), syntax: 'query' };
    return { text: JSON.stringify(r), syntax: 'lineage' };
  }
  if (ref.kind === 'edge') {
    const r = ref.ref;
    if (r.kind === 'queryDsl') return { text: dslOf(r), syntax: 'query' };
    if (r.kind === 'segment') return { text: JSON.stringify(r), syntax: 'topoRef' };
    if (r.kind === 'query') return { text: JSON.stringify(r.query), syntax: 'query' };
    return { text: JSON.stringify(r), syntax: 'query' };
  }
  return { text: JSON.stringify(ref), syntax: 'lineage' };
}

function dslOf(r: { queryTarget: unknown; queryAst: unknown; lenient?: boolean }): string {
  try {
    return makeQuery<unknown>(r.queryTarget as never, r.queryAst as never, r.lenient).toString();
  } catch {
    return JSON.stringify(r.queryAst);
  }
}

/** Report that the selector in `slot` of `record` bound to `entities`.
 *  `owner` is the record the sink hangs off (the one being lowered). */
export function reportBinding(
  record: FeatureRecord,
  base: OcctBackend,
  slot: 'face' | 'edges',
  entities: ReadonlyArray<Face | Edge>,
): void {
  if (!hasSelectionSink(record) || entities.length === 0) return;
  const { text, syntax } = describeSelector(record, slot);
  const selection: SelectionRecord = {
    consumerFeatureId: record.id,
    selectorText: text,
    syntax,
    fingerprints: entities.map((e) => ('normalAt' in e ? faceFingerprint(base, e as Face) : edgeFingerprint(e as Edge))),
    partDiagonal: partDiagonal(base),
  };
  recordSelection(record, selection);
}
