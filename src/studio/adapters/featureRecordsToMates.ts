// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Adapter: FeatureRecord[] → MateRecord[].
//
// The /__kernelcad/mesh endpoint returns serialized `FeatureRecord`s; when an
// assembly with mates ran, the `solvedAssembly` record's `metadata.mates`
// field carries the EncodedMateRecord[] surfaced through capture. We rebuild
// a JointsTab-friendly MateRecord[] (with numeric `pose` lifted from the
// session's ParamTable when the encoded Param has a `paramRef`, falling back
// to the encoded `evaluated` for numeric-literal poses). The recovered
// `name` is what JointsTab passes to `updateParam([{ name, value }])`.
//
// Multiple `solvedAssembly` records are merged. If the same mate name appears
// twice (e.g. a script that resolves the same assembly twice) the last wins —
// the rendered scene matches the last lower anyway.

import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { Connector } from '../../modeling/mates/connector';
import { parseConnectorRef, type MateRecord } from '../../modeling/mates/mate';
import type { EncodedMateRecord } from '../../modeling/capture/captureSession';
import type { Param, Vec3 } from '../../shared/intent/types';
import type { ParamTable } from '../../shared/runtime/paramTable';
import type { ParamRefExpr } from '../../shared/runtime/paramRef';

/**
 * Per-mate snapshot used by `JointsTab`. `pose` is always a concrete number
 * (or a triple of numbers for ball joints), with `poseParamNames` recording
 * which ParamTable entry each component maps to. UI passes
 * `poseParamNames[i]` back to `updateParam` so the kernel re-lowers reactively.
 *
 * `pose` is `undefined` when the mate has zero articulation (fastened /
 * planar); those rows are excluded by JointsTab.
 */
export interface JointPoseSnapshot {
  readonly mate: MateRecord;
  readonly pose: number | [number, number, number] | undefined;
  /** For scalar mates: `[paramName]` (or `[null]` if pose was a numeric literal).
   *  For ball mates: `[xName, yName, zName]`. */
  readonly poseParamNames: readonly (string | null)[];
  readonly preview?: JointViewportPreview;
}

export interface JointViewportPreview {
  readonly assemblyFeatureId: string;
  readonly parentPartName: string;
  readonly childPartName: string;
  readonly parentConnectorOrigin: Vec3;
  readonly parentConnectorAxis: Vec3;
}

function paramSymbol(param: Param): string | null {
  const ref = param.paramRef;
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object' && 'kind' in ref && ref.kind === 'param') {
    return ref.name;
  }
  if (ref && typeof ref === 'object' && 'kind' in ref) {
    const names = new Set<string>();
    collectExprParamNames(ref as ParamRefExpr, names);
    if (names.size === 1) return [...names][0];
  }
  // Numeric literal or compound expression — no single param table entry to
  // bind a slider to.
  return null;
}

function collectExprParamNames(expr: ParamRefExpr, names: Set<string>): void {
  switch (expr.kind) {
    case 'param':
      names.add(expr.name);
      break;
    case 'lit':
      break;
    case 'neg':
      collectExprParamNames(expr.expr, names);
      break;
    case 'binop':
      collectExprParamNames(expr.left, names);
      collectExprParamNames(expr.right, names);
      break;
  }
}

/** Resolve a Param's runtime value. Capture-time encoding stamps `evaluated: 0`
 *  on ParamRef-typed Params (only literals carry the real value), so we look
 *  up the ParamTable first and only fall back to `evaluated` for literals. */
function resolveParamValue(param: Param, paramTable: ParamTable | null): number {
  const sym = paramSymbol(param);
  if (sym !== null && paramTable && paramTable.has(sym)) {
    const entry = paramTable.get(sym);
    if (typeof entry.value === 'number') return entry.value;
  }
  return param.evaluated;
}

function encodedToSnapshot(
  em: EncodedMateRecord,
  paramTable: ParamTable | null,
  preview?: JointViewportPreview,
): JointPoseSnapshot | null {
  if (em.pose === undefined) return null;
  const limits = {
    ...(em.limitsDeg !== undefined ? { limitsDeg: em.limitsDeg } : {}),
    ...(em.limitsMm !== undefined ? { limitsMm: em.limitsMm } : {}),
  };
  if (em.pose.kind === 'ball') {
    const [px, py, pz] = em.pose.value;
    return {
      mate: { name: em.name, a: em.a, b: em.b, type: em.type, ...limits },
      pose: [
        resolveParamValue(px, paramTable),
        resolveParamValue(py, paramTable),
        resolveParamValue(pz, paramTable),
      ],
      poseParamNames: [paramSymbol(px), paramSymbol(py), paramSymbol(pz)],
      ...(preview !== undefined ? { preview } : {}),
    };
  }
  const p = em.pose.value;
  return {
    mate: { name: em.name, a: em.a, b: em.b, type: em.type, ...limits },
    pose: resolveParamValue(p, paramTable),
    poseParamNames: [paramSymbol(p)],
    ...(preview !== undefined ? { preview } : {}),
  };
}

function partNameById(records: readonly FeatureRecord[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const rec of records) {
    if (rec.kind !== 'assemblyPart') continue;
    const partName = (rec.metadata as { partName?: string } | undefined)?.partName;
    if (typeof partName === 'string') out.set(rec.id, partName);
  }
  return out;
}

function connectorAxis(connector: Connector): Vec3 {
  return connector.axis ?? connector.normal ?? [0, 0, 1];
}

function buildPreview(
  rec: FeatureRecord,
  em: EncodedMateRecord,
  namesByPartId: ReadonlyMap<string, string>,
): JointViewportPreview | undefined {
  const meta = rec.metadata as
    | { connectorsByPartId?: Record<string, readonly Connector[]> }
    | undefined;
  const connectorsByPartId = meta?.connectorsByPartId;
  if (!connectorsByPartId) return undefined;
  const a = parseConnectorRef(em.a);
  const b = parseConnectorRef(em.b);
  let parentConnector: Connector | undefined;
  for (const [partId, connectors] of Object.entries(connectorsByPartId)) {
    const partName = namesByPartId.get(partId) ?? partId;
    if (partName !== a.partName) continue;
    parentConnector = connectors.find((connector) => connector.name === a.connectorName);
    if (parentConnector) break;
  }
  if (!parentConnector || parentConnector.origin.kind !== 'vec3') return undefined;
  return {
    assemblyFeatureId: rec.id,
    parentPartName: a.partName,
    childPartName: b.partName,
    parentConnectorOrigin: parentConnector.origin.value,
    parentConnectorAxis: connectorAxis(parentConnector),
  };
}

/**
 * Extract the list of joints (mates with declared pose) from the latest
 * `featureRecords`. Pulls `metadata.mates` off every `solvedAssembly` or
 * `assemblyModel` record (encoded form) and reconstructs the slim shape
 * JointsTab consumes.
 *
 * Cross-record dedupe: when the same mate name appears across multiple
 * `solvedAssembly` records (e.g. a script that resolves the same assembly
 * twice), the last record wins — that's what the rendered scene shows.
 * Within a single record, declaration order is preserved.
 */
export function extractJointSnapshots(
  records: readonly FeatureRecord[],
  paramTable: ParamTable | null = null,
): readonly JointPoseSnapshot[] {
  const namesByPartId = partNameById(records);
  // 1. Collect every posed mate, indexed by name. Walking forward means
  //    later records' entries overwrite earlier ones — exactly the
  //    last-wins precedence the lowerer applies for duplicate mate names.
  const byName = new Map<string, JointPoseSnapshot>();
  // 2. Track first-appearance order per name so the UI ordering follows
  //    declaration order from the FIRST solvedAssembly that introduced
  //    the mate (subsequent overrides update value but not slot).
  const order: string[] = [];
  for (const rec of records) {
    if (rec.kind !== 'solvedAssembly' && rec.kind !== 'assemblyModel') continue;
    const meta = rec.metadata as
      | { mates?: readonly EncodedMateRecord[] }
      | undefined;
    const mates = meta?.mates;
    if (!mates || mates.length === 0) continue;
    for (const em of mates) {
      const snap = encodedToSnapshot(em, paramTable, buildPreview(rec, em, namesByPartId));
      if (snap === null) continue;
      if (!byName.has(em.name)) order.push(em.name);
      byName.set(em.name, snap);
    }
  }
  return order.map((name) => byName.get(name)!);
}
