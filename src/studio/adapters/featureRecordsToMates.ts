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
import type { MateRecord } from '../../modeling/mates/mate';
import type { EncodedMateRecord } from '../../modeling/capture/captureSession';
import type { Param } from '../../shared/intent/types';
import type { ParamTable } from '../../shared/runtime/paramTable';

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
}

function paramSymbol(param: Param): string | null {
  const ref = param.paramRef;
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object' && 'kind' in ref && ref.kind === 'param') {
    return ref.name;
  }
  // Numeric literal or compound expression — no single param table entry to
  // bind a slider to.
  return null;
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
    };
  }
  const p = em.pose.value;
  return {
    mate: { name: em.name, a: em.a, b: em.b, type: em.type, ...limits },
    pose: resolveParamValue(p, paramTable),
    poseParamNames: [paramSymbol(p)],
  };
}

/**
 * Extract the list of joints (mates with declared pose) from the latest
 * `featureRecords`. Pulls `metadata.mates` off every `solvedAssembly` record
 * (encoded form) and reconstructs the slim shape JointsTab consumes.
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
  // 1. Collect every posed mate, indexed by name. Walking forward means
  //    later records' entries overwrite earlier ones — exactly the
  //    last-wins precedence the lowerer applies for duplicate mate names.
  const byName = new Map<string, JointPoseSnapshot>();
  // 2. Track first-appearance order per name so the UI ordering follows
  //    declaration order from the FIRST solvedAssembly that introduced
  //    the mate (subsequent overrides update value but not slot).
  const order: string[] = [];
  for (const rec of records) {
    if (rec.kind !== 'solvedAssembly') continue;
    const meta = rec.metadata as
      | { mates?: readonly EncodedMateRecord[] }
      | undefined;
    const mates = meta?.mates;
    if (!mates || mates.length === 0) continue;
    for (const em of mates) {
      const snap = encodedToSnapshot(em, paramTable);
      if (snap === null) continue;
      if (!byName.has(em.name)) order.push(em.name);
      byName.set(em.name, snap);
    }
  }
  return order.map((name) => byName.get(name)!);
}
