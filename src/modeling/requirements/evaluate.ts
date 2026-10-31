// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Ledger evaluator. Resolves a requirement's selections against the lowered
// model, measures the metric, and turns the measurement into a pass/fail/
// not-evaluated entry with measured, limit, margin and S1 fingerprints.
//
// Measurement is kernel-side: BREP distances for clearance/distance, OCCT
// mass properties for mass/volume/centre, the same face/edge query resolver
// the rest of the API uses for selections, and scene part surfaces when an
// external requirement names a part.

import type { BuiltModel } from '../buildModel';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { resolveEdgeQuery, resolveFaceQuery } from '../../kernel/backends/occt/edgeQueries';
import { edgeFingerprint, faceFingerprint } from '../../kernel/backends/occt/bindingFingerprint';
import { brepExtremaDistanceBetween } from '../runtime/brepDistance';
import type { BindingFingerprint, SelectionRecord } from '../../shared/intent/selectionRecord';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId, Vec3 } from '../../shared/intent/types';
import type {
  ExternalRequirement,
  RequirementBands,
  RequirementLedgerEntry,
  RequirementLimit,
  RequirementMeasured,
  RequirementOperand,
  RequirementPredicateSpec,
  RequirementSource,
} from '../../shared/intent/requirementRecord';
import { ledgerFromEntries, type RequirementsLedger } from '../../shared/intent/requirementRecord';
import { RequirementPredicate } from './predicates';

type Face = ReturnType<typeof resolveFaceQuery>[number];
type Edge = ReturnType<typeof resolveEdgeQuery>[number];

const EPS = 1e-9;
const DEFAULT_CONCENTRIC_TOL_MM = 0.05;
const DEFAULT_ANGLE_TOL_DEG = 1;

interface ResolvedUnit {
  kind: 'body' | 'face' | 'edge';
  featureId: string;
  backend: OcctBackend;
  wrapped: unknown;
  /** The replicad Face/Edge wrapper; kept alive so its finalizer cannot
   *  delete the wrapped TopoDS_Shape while a distance is being measured. */
  handle?: object;
  fingerprint?: BindingFingerprint;
  centroid: Vec3;
  direction?: Vec3;
  radius?: number;
  size?: number;
  innerLoops?: number;
}

type OperandResolution =
  | { ok: true; units: ResolvedUnit[]; record?: SelectionRecord }
  | { ok: false; reason: string };

function backendOf(shape: unknown): OcctBackend | undefined {
  return shape instanceof Object && 'getReplicadShape' in shape ? shape as OcctBackend : undefined;
}

/** Match a feature NAME (not id) against the built shapes. */
function findBackendByName(model: BuiltModel, ref: string): { backend?: OcctBackend; featureId: string } | undefined {
  for (const [id, shape] of model.shapes) {
    const record = findRecord(model.records, id);
    if (record !== undefined && recordName(record) === ref) {
      const backend = backendOf(shape);
      if (backend !== undefined) return { backend, featureId: id };
    }
  }
  return undefined;
}

/** Assembly part name: the part's local shape is the measurable body. */
function findBackendInScene(model: BuiltModel, ref: string): OcctBackend | undefined {
  for (const shape of model.shapes.values()) {
    if (!isSceneBackend(shape)) continue;
    const backend = backendOf(shape.parts.find(p => p.name === ref)?.shape);
    if (backend !== undefined) return backend;
  }
  return undefined;
}

/** Resolve a feature id, feature name, or assembly part name to its backend. */
function findBackend(model: BuiltModel, ref: string): { backend?: OcctBackend; featureId: string } {
  const direct = backendOf(model.shapes.get(ref));
  if (direct !== undefined) return { backend: direct, featureId: ref };
  const record = findRecord(model.records, ref);
  if (record !== undefined) {
    const backend = backendOf(model.shapes.get(record.id));
    if (backend !== undefined) return { backend, featureId: record.id };
  }
  const named = findBackendByName(model, ref);
  if (named !== undefined) return named;
  const scenePart = findBackendInScene(model, ref);
  return scenePart !== undefined ? { backend: scenePart, featureId: ref } : { featureId: ref };
}

function findRecord(records: readonly FeatureRecord[], ref: string): FeatureRecord | undefined {
  return records.find(r => r.id === ref) ?? records.find(r => recordName(r) === ref);
}

function recordName(record: FeatureRecord): string | undefined {
  const meta = record.metadata as { name?: unknown; featureName?: unknown } | undefined;
  if (typeof meta?.name === 'string') return meta.name;
  if (typeof meta?.featureName === 'string') return meta.featureName;
  const params = record.params as { name?: { evaluated?: unknown } } | undefined;
  return typeof params?.name?.evaluated === 'string' ? params.name.evaluated : undefined;
}

function wrappedOf(backend: OcctBackend): unknown {
  return (backend as unknown as { shape: { wrapped: unknown } }).shape.wrapped;
}

function faceInnerLoops(face: Face): number {
  try {
    // Face.innerWires() self-deletes the face wrapper (see drawingSections),
    // so count on a clone and keep the original alive for distance work.
    const clone = (face as unknown as { clone?: () => Face }).clone?.() ?? face;
    const inner = (clone as unknown as { innerWires?: () => unknown[] }).innerWires?.();
    return Array.isArray(inner) ? inner.length : 0;
  } catch {
    return 0;
  }
}

function bboxCenter(backend: OcctBackend): Vec3 {
  const bb = backend.boundingBox();
  return [
    (bb.min[0] + bb.max[0]) / 2,
    (bb.min[1] + bb.max[1]) / 2,
    (bb.min[2] + bb.max[2]) / 2,
  ];
}

function partDiagonal(backend: OcctBackend): number {
  try {
    const bb = backend.boundingBox();
    return Math.hypot(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]);
  } catch {
    return 0;
  }
}

function bodyUnit(backend: OcctBackend, featureId: string): ResolvedUnit {
  return {
    kind: 'body',
    featureId,
    backend,
    wrapped: wrappedOf(backend),
    centroid: bboxCenter(backend),
  };
}

function faceUnit(backend: OcctBackend, featureId: string, face: Face): ResolvedUnit {
  const fp = faceFingerprint(backend, face);
  const direction = fp.direction;
  return {
    kind: 'face',
    featureId,
    backend,
    wrapped: (face as unknown as { wrapped: unknown }).wrapped,
    handle: face,
    fingerprint: fp,
    centroid: fp.centroid,
    ...(direction !== undefined ? { direction } : {}),
    ...(fp.radius !== undefined ? { radius: fp.radius } : {}),
    size: fp.size,
    innerLoops: faceInnerLoops(face),
  };
}

function edgeUnit(backend: OcctBackend, featureId: string, edge: Edge): ResolvedUnit {
  const fp = edgeFingerprint(edge);
  return {
    kind: 'edge',
    featureId,
    backend,
    wrapped: (edge as unknown as { wrapped: unknown }).wrapped,
    handle: edge,
    fingerprint: { ...fp, producer: featureId },
    centroid: fp.centroid,
    ...(fp.direction !== undefined ? { direction: fp.direction } : {}),
    ...(fp.radius !== undefined ? { radius: fp.radius } : {}),
    size: fp.size,
  };
}

/** Closest descriptor to a captured snapshot, used for @kc[...] lists. */
function nearestFace(backend: OcctBackend, snapshot: RequirementOperand['snapshots'] extends (infer T)[] | undefined ? T : never): Face | undefined {
  const faces = (backend.getReplicadShape() as unknown as { faces: Face[] }).faces;
  let best: { face: Face; d: number } | undefined;
  for (const face of faces) {
    const fp = faceFingerprint(backend, face);
    const d = Math.hypot(
      fp.centroid[0] - snapshot.centroid[0],
      fp.centroid[1] - snapshot.centroid[1],
      fp.centroid[2] - snapshot.centroid[2],
    );
    if (best === undefined || d < best.d) best = { face, d };
  }
  return best !== undefined && best.d <= 1e-3 ? best.face : undefined;
}

function nearestEdge(backend: OcctBackend, snapshot: NonNullable<RequirementOperand['snapshots']>[number]): Edge | undefined {
  const edges = (backend.getReplicadShape() as unknown as { edges: Edge[] }).edges;
  let best: { edge: Edge; d: number } | undefined;
  for (const edge of edges) {
    const fp = edgeFingerprint(edge);
    const d = Math.hypot(
      fp.centroid[0] - snapshot.centroid[0],
      fp.centroid[1] - snapshot.centroid[1],
      fp.centroid[2] - snapshot.centroid[2],
    );
    if (best === undefined || d < best.d) best = { edge, d };
  }
  return best !== undefined && best.d <= 1e-3 ? best.edge : undefined;
}

function selectorText(operand: RequirementOperand): string {
  const q = operand.query !== undefined ? ` ${JSON.stringify(operand.query)}` : '';
  return `${operand.kind}(${operand.ref}${q})`;
}

function selectionRecord(
  requirementId: string,
  operand: RequirementOperand,
  units: readonly ResolvedUnit[],
): SelectionRecord {
  const grouped = new Map<string, ResolvedUnit[]>();
  for (const unit of units) {
    const list = grouped.get(unit.featureId) ?? [];
    list.push(unit);
    grouped.set(unit.featureId, list);
  }
  const groups = [...grouped.entries()];
  const all = groups.flatMap(([, list]) => list);
  const fingerprints = all.map(u => u.fingerprint).filter((fp): fp is BindingFingerprint => fp !== undefined);
  const backend = all[0]?.backend;
  return {
    consumerFeatureId: requirementId,
    selectorText: selectorText(operand),
    syntax: operand.query !== undefined ? 'query' : 'lineage',
    fingerprints,
    partDiagonal: backend !== undefined ? partDiagonal(backend) : 0,
  };
}

function resolveOperand(model: BuiltModel, operand: RequirementOperand): OperandResolution {
  const found = findBackend(model, operand.ref);
  if (found.backend === undefined) {
    return { ok: false, reason: `selection '${operand.ref}' does not resolve to a built feature or assembly part` };
  }
  const backend = found.backend;
  try {
    if (operand.kind === 'body' || operand.kind === 'part') {
      const units = [bodyUnit(backend, found.featureId)];
      return { ok: true, units, record: selectionRecord('', operand, units) };
    }
    if (operand.kind === 'faces') {
      let faces: Face[];
      if (operand.query !== undefined) {
        faces = resolveFaceQuery(backend, operand.query);
      } else if (operand.snapshots !== undefined && operand.snapshots.length > 0) {
        faces = operand.snapshots
          .filter(s => s.entityKind === 'face')
          .map(s => nearestFace(backend, s))
          .filter((f): f is Face => f !== undefined);
      } else {
        faces = (backend.getReplicadShape() as unknown as { faces: Face[] }).faces;
      }
      if (faces.length === 0) return { ok: false, reason: `selection '${selectorText(operand)}' matched no faces` };
      const units = faces.map(f => faceUnit(backend, found.featureId, f));
      return { ok: true, units, record: selectionRecord('', operand, units) };
    }
    let edges: Edge[];
    if (operand.query !== undefined) {
      edges = resolveEdgeQuery(backend, operand.query as import('../../shared/intent/queryTypes').EdgeQuery);
    } else if (operand.snapshots !== undefined && operand.snapshots.length > 0) {
      edges = operand.snapshots
        .filter(s => s.entityKind === 'edge')
        .map(s => nearestEdge(backend, s))
        .filter((e): e is Edge => e !== undefined);
    } else {
      edges = (backend.getReplicadShape() as unknown as { edges: Edge[] }).edges;
    }
    if (edges.length === 0) return { ok: false, reason: `selection '${selectorText(operand)}' matched no edges` };
    const units = edges.map(e => edgeUnit(backend, found.featureId, e));
    return { ok: true, units, record: selectionRecord('', operand, units) };
  } catch (e) {
    return { ok: false, reason: `selection '${selectorText(operand)}' failed to resolve: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function attachRequirementId(record: SelectionRecord | undefined, requirementId: string): SelectionRecord | undefined {
  return record === undefined ? undefined : { ...record, consumerFeatureId: requirementId };
}

function distanceBetween(a: readonly ResolvedUnit[], b: readonly ResolvedUnit[]): number | undefined {
  let best = Number.POSITIVE_INFINITY;
  for (const ua of a) {
    for (const ub of b) {
      const d = brepExtremaDistanceBetween(ua.wrapped, ub.wrapped);
      if (d === undefined) continue;
      if (d < best) best = d;
    }
  }
  return Number.isFinite(best) ? best : undefined;
}

function volumeOf(units: readonly ResolvedUnit[]): number | undefined {
  let total = 0;
  let any = false;
  for (const unit of units) {
    if (unit.kind !== 'body') continue;
    try {
      total += unit.backend.volume();
      any = true;
    } catch {
      /* leave this unit out */
    }
  }
  return any ? total : undefined;
}

function massOf(units: readonly ResolvedUnit[], density: number): number | undefined {
  const volume = volumeOf(units);
  return volume === undefined ? undefined : volume * 1e-9 * density;
}

function bboxOf(units: readonly ResolvedUnit[]): Vec3 | undefined {
  let min: Vec3 | undefined;
  let max: Vec3 | undefined;
  for (const unit of units) {
    if (unit.kind !== 'body') continue;
    const bb = unit.backend.boundingBox();
    min = min === undefined ? [...bb.min] : [Math.min(min[0], bb.min[0]), Math.min(min[1], bb.min[1]), Math.min(min[2], bb.min[2])];
    max = max === undefined ? [...bb.max] : [Math.max(max[0], bb.max[0]), Math.max(max[1], bb.max[1]), Math.max(max[2], bb.max[2])];
  }
  return min !== undefined && max !== undefined
    ? [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
    : undefined;
}

function centerOfMassOf(units: readonly ResolvedUnit[], density: number): Vec3 | undefined {
  const bodies = units.filter(u => u.kind === 'body');
  if (bodies.length > 0) {
    let mx = 0, my = 0, mz = 0, total = 0;
    for (const unit of bodies) {
      try {
        const mp = unit.backend.massProperties(density);
        mx += mp.com[0] * mp.mass;
        my += mp.com[1] * mp.mass;
        mz += mp.com[2] * mp.mass;
        total += mp.mass;
      } catch {
        /* skip this unit */
      }
    }
    if (total > 0) return [mx / total, my / total, mz / total];
  }
  if (units.length === 0) return undefined;
  const c = units.reduce((acc, u) => [acc[0] + u.centroid[0], acc[1] + u.centroid[1], acc[2] + u.centroid[2]], [0, 0, 0]);
  return [c[0] / units.length, c[1] / units.length, c[2] / units.length];
}

function directionOf(unit: ResolvedUnit): Vec3 | undefined {
  if (unit.direction !== undefined) return unit.direction;
  if (unit.kind !== 'body') return undefined;
  try {
    return unit.backend.massProperties(1000).principalAxes[0];
  } catch {
    return undefined;
  }
}

function angleDeg(a: Vec3, b: Vec3): number {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return (Math.acos(dot) * 180) / Math.PI;
}

function firstDirection(units: readonly ResolvedUnit[]): Vec3 | undefined {
  for (const unit of units) {
    const d = directionOf(unit);
    if (d !== undefined) return d;
  }
  return undefined;
}

function pointDistance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export interface Measurement {
  measured: RequirementMeasured;
  axes?: Record<string, number>;
}

type MetricResult = Measurement | { reason: string };

function measureDistanceMetric(a: readonly ResolvedUnit[], b: readonly ResolvedUnit[]): MetricResult {
  const d = distanceBetween(a, b);
  return d === undefined ? { reason: 'the kernel could not measure a distance between these selections' } : { measured: d };
}

function measureVolumeMetric(a: readonly ResolvedUnit[]): MetricResult {
  const v = volumeOf(a);
  return v === undefined ? { reason: 'volume needs a solid body selection' } : { measured: v };
}

function measureMassMetric(a: readonly ResolvedUnit[], spec: RequirementPredicateSpec): MetricResult {
  const m = massOf(a, spec.density ?? 1000);
  return m === undefined ? { reason: 'mass needs a solid body selection' } : { measured: m };
}

function measureBboxMetric(a: readonly ResolvedUnit[]): MetricResult {
  const size = bboxOf(a);
  return size === undefined
    ? { reason: 'bbox needs a solid body selection' }
    : { measured: size, axes: { x: size[0], y: size[1], z: size[2] } };
}

function measureCenterMetric(a: readonly ResolvedUnit[], spec: RequirementPredicateSpec): MetricResult {
  const c = centerOfMassOf(a, spec.density ?? 1000);
  return c === undefined
    ? { reason: 'centre of mass needs a non-empty selection' }
    : { measured: c, axes: { x: c[0], y: c[1], z: c[2] } };
}

function measureCountMetric(a: readonly ResolvedUnit[]): MetricResult {
  return { measured: a.length };
}

function measureInnerLoopsMetric(a: readonly ResolvedUnit[]): MetricResult {
  if (a.some(u => u.kind !== 'face')) return { reason: 'innerLoops needs a face selection' };
  return { measured: Math.max(...a.map(u => u.innerLoops ?? 0)) };
}

function measureAngleMetric(a: readonly ResolvedUnit[], b: readonly ResolvedUnit[]): MetricResult {
  const da = firstDirection(a);
  const db = firstDirection(b);
  if (da === undefined || db === undefined) {
    return { reason: 'angle needs selections with a direction (face/edge or a body with mass properties)' };
  }
  return { measured: angleDeg(da, db) };
}

function measureConcentricMetric(a: readonly ResolvedUnit[], b: readonly ResolvedUnit[]): MetricResult {
  const da = firstDirection(a);
  const db = firstDirection(b);
  if (da === undefined || db === undefined) return { reason: 'concentric needs selections with an axis' };
  const axisAngle = angleDeg(da, db);
  const offset = pointDistance(a[0].centroid, b[0].centroid);
  return { measured: offset, axes: { axisAngleDeg: axisAngle, centerOffsetMm: offset } };
}

function measureCoplanarMetric(a: readonly ResolvedUnit[], b: readonly ResolvedUnit[]): MetricResult {
  const da = firstDirection(a);
  const db = firstDirection(b);
  if (da === undefined || db === undefined) return { reason: 'coplanar needs selections with a normal' };
  const axisAngle = Math.min(angleDeg(da, db), 180 - angleDeg(da, db));
  const offset = Math.abs(
    (a[0].centroid[0] - b[0].centroid[0]) * da[0]
    + (a[0].centroid[1] - b[0].centroid[1]) * da[1]
    + (a[0].centroid[2] - b[0].centroid[2]) * da[2],
  );
  const measured = Math.max(axisAngle, offset);
  return { measured, axes: { angleDeg: axisAngle, offsetMm: offset } };
}

/** A comparable scalar for a metric, or bands for bbox/centre. */
function measureScalarMetric(
  metric: RequirementPredicateSpec['metric'],
  spec: RequirementPredicateSpec,
  a: readonly ResolvedUnit[],
  b: readonly ResolvedUnit[],
): MetricResult {
  const measurers: Record<RequirementPredicateSpec['metric'], () => MetricResult> = {
    clearance: () => measureDistanceMetric(a, b),
    distance: () => measureDistanceMetric(a, b),
    mass: () => measureMassMetric(a, spec),
    volume: () => measureVolumeMetric(a),
    bbox: () => measureBboxMetric(a),
    centerOfMass: () => measureCenterMetric(a, spec),
    count: () => measureCountMetric(a),
    innerLoops: () => measureInnerLoopsMetric(a),
    angle: () => measureAngleMetric(a, b),
    concentric: () => measureConcentricMetric(a, b),
    coplanar: () => measureCoplanarMetric(a, b),
  };
  return measurers[metric]();
}

interface Comparison {
  status: 'pass' | 'fail';
  margin: number;
}

function compareWithNumber(measured: number, op: RequirementPredicateSpec['op'], limit: number): Comparison | undefined {
  if (op === 'gte') return { status: measured >= limit - EPS ? 'pass' : 'fail', margin: measured - limit };
  if (op === 'lte' || op === 'within') return { status: measured <= limit + EPS ? 'pass' : 'fail', margin: limit - measured };
  if (op === 'eq') return { status: Math.abs(measured - limit) <= EPS ? 'pass' : 'fail', margin: measured - limit };
  return undefined;
}

function compareWithBand(measured: number, limit: RequirementLimit): Comparison | undefined {
  if (!Array.isArray(limit) || limit.length !== 2) return undefined;
  const [lo, hi] = limit as [number, number];
  if (typeof lo !== 'number' || typeof hi !== 'number') return undefined;
  const margin = Math.min(measured - lo, hi - measured);
  return { status: measured >= lo - EPS && measured <= hi + EPS ? 'pass' : 'fail', margin };
}

function compareWithTolerance(measured: number, spec: RequirementPredicateSpec): Comparison {
  const tol = spec.tolerance ?? (spec.metric === 'angle' ? DEFAULT_ANGLE_TOL_DEG : DEFAULT_CONCENTRIC_TOL_MM);
  return { status: measured <= tol + EPS ? 'pass' : 'fail', margin: tol - measured };
}

export function scalarComparison(measured: number, spec: RequirementPredicateSpec): Comparison {
  if (typeof spec.limit === 'number') {
    return compareWithNumber(measured, spec.op ?? 'within', spec.limit) ?? compareWithTolerance(measured, spec);
  }
  return compareWithBand(measured, spec.limit ?? null) ?? compareWithTolerance(measured, spec);
}

export function bandsComparison(axes: Record<string, number>, limit: RequirementLimit): { status: 'pass' | 'fail'; margin: number } | undefined {
  if (limit === null || typeof limit === 'number' || Array.isArray(limit)) return undefined;
  const bands = limit as RequirementBands;
  let margin = Number.POSITIVE_INFINITY;
  for (const axis of ['x', 'y', 'z'] as const) {
    const band = bands[axis];
    if (band === undefined) continue;
    const value = axes[axis];
    if (value === undefined) continue;
    margin = Math.min(margin, Math.min(value - band[0], band[1] - value));
  }
  return Number.isFinite(margin) ? { status: margin >= -EPS ? 'pass' : 'fail', margin } : undefined;
}

function compareCenterOriginBand(axes: Record<string, number>, spec: RequirementPredicateSpec): Comparison {
  const d = Math.hypot(axes.x ?? 0, axes.y ?? 0, axes.z ?? 0);
  return scalarComparison(d, spec);
}

function compareAxisBand(axes: Record<string, number>, limit: readonly [number, number]): Comparison {
  const [lo, hi] = limit;
  let margin = Number.POSITIVE_INFINITY;
  for (const value of Object.values(axes)) margin = Math.min(margin, Math.min(value - lo, hi - value));
  const allIn = Object.values(axes).every(v => v >= lo - EPS && v <= hi + EPS);
  return { status: allIn ? 'pass' : 'fail', margin };
}

export function comparisonFor(measurement: Measurement, spec: RequirementPredicateSpec): Comparison {
  if (measurement.axes !== undefined && spec.op === 'within') {
    const bands = bandsComparison(measurement.axes, spec.limit ?? null);
    if (bands !== undefined) return bands;
  }
  if (measurement.axes !== undefined && Array.isArray(spec.limit)) {
    if (spec.metric === 'centerOfMass') return compareCenterOriginBand(measurement.axes, spec);
    if (spec.metric === 'bbox') return compareAxisBand(measurement.axes, spec.limit as [number, number]);
  }
  if (typeof measurement.measured === 'number') return scalarComparison(measurement.measured, spec);
  return { status: 'fail', margin: 0 };
}

function limitForReport(spec: RequirementPredicateSpec): RequirementLimit {
  if (spec.metric === 'concentric' || spec.metric === 'coplanar' || spec.metric === 'angle') {
    return spec.limit ?? (spec.metric === 'angle' ? DEFAULT_ANGLE_TOL_DEG : DEFAULT_CONCENTRIC_TOL_MM);
  }
  return spec.limit ?? null;
}

function formatValue(value: RequirementMeasured | RequirementLimit): string {
  if (value === null) return 'unmeasured';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3);
  if (Array.isArray(value)) return `[${value.map(v => formatValue(v as RequirementMeasured)).join(', ')}]`;
  return `{${Object.entries(value).map(([k, v]) => `${k}: ${formatValue(v as RequirementMeasured)}`).join(', ')}}`;
}

function requirementSelections(
  a: OperandResolution | undefined,
  b: OperandResolution | undefined,
  requirementId: string,
): SelectionRecord[] {
  const records = [
    ...(a?.ok === true ? [attachRequirementId(a.record, requirementId)] : []),
    ...(b?.ok === true ? [attachRequirementId(b.record, requirementId)] : []),
  ];
  return records.filter((r): r is SelectionRecord => r !== undefined);
}

function notEvaluatedEntry(
  name: string,
  spec: RequirementPredicateSpec,
  source: RequirementSource,
  selections: SelectionRecord[],
  reason: string,
  featureId?: string,
): RequirementLedgerEntry {
  return {
    name,
    source,
    status: 'not-evaluated',
    measured: null,
    limit: limitForReport(spec),
    margin: null,
    selections,
    message: `${name} was not evaluated: ${reason}.`,
    ...(featureId !== undefined ? { featureId } : {}),
    predicate: spec,
  };
}

function failureMessage(
  name: string,
  measurement: Measurement,
  spec: RequirementPredicateSpec,
  margin: number,
): string {
  const involved = [spec.a?.ref, spec.b?.ref].filter((r): r is string => r !== undefined);
  const suffix = involved.length > 0 ? ` (${involved.join(' vs ')})` : '';
  return `${name} failed: measured ${formatValue(measurement.measured)}, limit ${formatValue(limitForReport(spec))}, margin ${margin.toFixed(3)}${suffix}.`;
}

function resolutionFailure(
  a: OperandResolution | undefined,
  b: OperandResolution | undefined,
): string | undefined {
  if (a !== undefined && !a.ok) return a.reason;
  if (b !== undefined && !b.ok) return b.reason;
  return undefined;
}

function unitsOf(resolved: OperandResolution | undefined): ResolvedUnit[] {
  return resolved?.ok === true ? resolved.units : [];
}

/** Evaluate one requirement spec against a built model. */
export function evaluateRequirement(
  model: BuiltModel,
  name: string,
  spec: RequirementPredicateSpec,
  source: RequirementSource,
  featureId?: string,
): { entry: RequirementLedgerEntry; selections: SelectionRecord[] } {
  const requirementId = featureId ?? `requirement:${name}`;
  const a = spec.a !== undefined ? resolveOperand(model, spec.a) : undefined;
  const b = spec.b !== undefined ? resolveOperand(model, spec.b) : undefined;
  const selections = requirementSelections(a, b, requirementId);
  const notEvaluated = (reason: string) => ({
    entry: notEvaluatedEntry(name, spec, source, selections, reason, featureId),
    selections,
  });

  const failure = resolutionFailure(a, b);
  if (failure !== undefined) return notEvaluated(failure);
  const unitsA = unitsOf(a);
  const unitsB = unitsOf(b);
  if (unitsA.length === 0) return notEvaluated('its selection matched nothing');

  let measurement: MetricResult;
  try {
    measurement = measureScalarMetric(spec.metric, spec, unitsA, unitsB);
  } catch (e) {
    // A kernel measurement can fail on a stale/re-lowered shape (for example a
    // solved assembly whose part handles no longer belong to the active OCCT
    // instance). Report not-evaluated — never a crash, and never green.
    return notEvaluated(`the kernel failed to measure it (${e instanceof Error ? e.message : String(e)})`);
  }
  if ('reason' in measurement) return notEvaluated(measurement.reason);
  const comparison = comparisonFor(measurement, spec);
  const message = comparison.status === 'fail' ? failureMessage(name, measurement, spec, comparison.margin) : undefined;
  return {
    entry: {
      name,
      source,
      status: comparison.status,
      measured: measurement.measured,
      limit: limitForReport(spec),
      margin: comparison.margin,
      selections,
      ...(message !== undefined ? { message } : {}),
      ...(featureId !== undefined ? { featureId } : {}),
      predicate: spec,
    },
    selections,
  };
}

/** Script `require` records, in source order, plus call-time requirements. */
export function scriptRequirementSpecs(
  records: readonly FeatureRecord[],
): Array<{ name: string; spec: RequirementPredicateSpec; featureId: FeatureId }> {
  const out: Array<{ name: string; spec: RequirementPredicateSpec; featureId: FeatureId }> = [];
  for (const record of records) {
    if (record.kind !== 'require') continue;
    const meta = record.metadata as { name?: unknown; predicate?: unknown } | undefined;
    if (typeof meta?.name !== 'string' || typeof meta.predicate !== 'object' || meta.predicate === null) continue;
    out.push({ name: meta.name, spec: meta.predicate as RequirementPredicateSpec, featureId: record.id });
  }
  return out;
}

export interface RequirementEvaluationOptions {
  external?: readonly ExternalRequirement[];
  /** Extra entries produced by dfm/fae/mechanical adapters. */
  extraEntries?: readonly RequirementLedgerEntry[];
  /** Include script `require` records (default true). */
  includeScript?: boolean;
}

/** Evaluate script + external requirements and fold in adapter entries. */
export function evaluateRequirementsOnModel(
  model: BuiltModel,
  opts: RequirementEvaluationOptions = {},
): RequirementsLedger {
  const entries: RequirementLedgerEntry[] = [];
  const selections: SelectionRecord[] = [];
  if (opts.includeScript !== false) {
    for (const { name, spec, featureId } of scriptRequirementSpecs(model.records)) {
      const result = evaluateRequirement(model, name, spec, 'script', featureId);
      entries.push(result.entry);
      selections.push(...result.selections);
    }
  }
  for (const req of opts.external ?? []) {
    if (typeof req.name !== 'string' || req.predicate === undefined) continue;
    const result = evaluateRequirement(model, req.name, req.predicate, 'external');
    entries.push(result.entry);
  }
  for (const extra of opts.extraEntries ?? []) entries.push(extra);
  // Requirement selections participate in S1 drift detection just like
  // selector-consuming features. External requirements are not persisted.
  for (const record of selections) model.selections.push(record);
  return ledgerFromEntries(entries);
}

export function predicateFrom(value: unknown): RequirementPredicateSpec | undefined {
  return value instanceof RequirementPredicate ? value.spec : undefined;
}
