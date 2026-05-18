// Adapter: FeatureRecord[] → MateRecord[].
//
// The /__kernelcad/mesh endpoint returns serialized `FeatureRecord`s; when an
// assembly with mates ran, the `solvedAssembly` record's `metadata.mates`
// field carries the EncodedMateRecord[] surfaced through capture. We rebuild
// a JointsTab-friendly MateRecord[] (with numeric `pose` lifted from each
// encoded Param's `.evaluated`, and the `name` field carrying the ParamTable
// key when the original pose was a ParamRef). The recovered `name` is what
// JointsTab passes to `updateParam([{ name, value }])`.
//
// Multiple `solvedAssembly` records are merged. If the same mate name appears
// twice (e.g. a script that resolves the same assembly twice) the last wins —
// the rendered scene matches the last lower anyway.

import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { MateRecord } from '../../modeling/mates/mate';
import type { EncodedMateRecord } from '../../modeling/capture/captureSession';
import type { Param } from '../../shared/intent/types';

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

/**
 * Extract the list of joints (mates with declared pose) from the latest
 * `featureRecords`. Pulls `metadata.mates` off every `solvedAssembly` record
 * (encoded form) and reconstructs the slim shape JointsTab consumes.
 */
export function extractJointSnapshots(
  records: readonly FeatureRecord[],
): readonly JointPoseSnapshot[] {
  const out: JointPoseSnapshot[] = [];
  const seenNames = new Set<string>();
  // Iterate in reverse so the last-recorded solvedAssembly wins on duplicate
  // mate names (matches the rendered scene's precedence).
  for (let i = records.length - 1; i >= 0; i--) {
    const rec = records[i];
    if (rec.kind !== 'solvedAssembly') continue;
    const meta = rec.metadata as
      | { mates?: readonly EncodedMateRecord[] }
      | undefined;
    const mates = meta?.mates;
    if (!mates || mates.length === 0) continue;
    for (const em of mates) {
      if (em.pose === undefined) continue;
      if (seenNames.has(em.name)) continue;
      seenNames.add(em.name);
      if (em.pose.kind === 'ball') {
        const [px, py, pz] = em.pose.value;
        out.push({
          mate: {
            name: em.name,
            a: em.a,
            b: em.b,
            type: em.type,
            ...(em.limitsDeg !== undefined ? { limitsDeg: em.limitsDeg } : {}),
            ...(em.limitsMm !== undefined ? { limitsMm: em.limitsMm } : {}),
          },
          pose: [px.evaluated, py.evaluated, pz.evaluated],
          poseParamNames: [paramSymbol(px), paramSymbol(py), paramSymbol(pz)],
        });
      } else {
        const p = em.pose.value;
        out.push({
          mate: {
            name: em.name,
            a: em.a,
            b: em.b,
            type: em.type,
            ...(em.limitsDeg !== undefined ? { limitsDeg: em.limitsDeg } : {}),
            ...(em.limitsMm !== undefined ? { limitsMm: em.limitsMm } : {}),
          },
          pose: p.evaluated,
          poseParamNames: [paramSymbol(p)],
        });
      }
    }
  }
  // Reverse-pass collected in reverse capture order — flip back so the UI
  // shows joints in the order the script declared them.
  return out.reverse();
}
