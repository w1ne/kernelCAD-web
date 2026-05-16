// src/lib/mates/limitFixSuggest.ts
//
// Binary-search fix-suggestion engine. Given a PoseEnvelopeDiagnostic of code
// 'assembly.pose-envelope.interference' or 'assembly.pose.out-of-limits',
// finds the collision-onset angle for the offending mate's limit and emits
// a SuggestedLimits with the shrunk bound. The agent reads
// MechanismBlockingReason.suggestedLimits and revises the script.
//
// Algorithm: binary search between (a) the mate's resolved capture-time
// default pose, assumed clean by the v0.6.0 single-pose interference gate,
// and (b) the offending limit extreme, known to collide. Cap 8 iterations,
// ε=1° (limitsDeg) or 1mm (limitsMm). Returns null when the search has no
// safe anchor (default collides) or the diagnostic is non-actionable
// (missing localization, ball mate, etc.).

import type { Assembly } from '../capture/assembly';
import type { MateRecord } from './mate';
import type { PoseEnvelopeDiagnostic } from './poseEnvelope';
import { currentValue } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';
import { detectInterferencesForPoses } from './poseEnvelope';

export interface SuggestedLimits {
  readonly mateName: string;
  readonly limits: readonly [number, number];
  readonly limitsField: 'limitsDeg' | 'limitsMm';
  readonly shrunkBound: 'min' | 'max' | 'both';
  readonly originalLimits: readonly [number, number];
}

const MAX_ITER = 8;
const EPS_DEG = 1;
const EPS_MM = 1;

export async function suggestLimitFix(
  arm: Assembly,
  diagnostic: PoseEnvelopeDiagnostic,
): Promise<SuggestedLimits | null> {
  // Diagnostic must be actionable: localizable to a specific mate + part pair.
  if (!diagnostic.mateName) return null;
  if (diagnostic.code !== 'assembly.pose-envelope.interference' && diagnostic.code !== 'assembly.pose.out-of-limits') {
    return null;
  }
  if (!diagnostic.partA || !diagnostic.partB) return null;
  if (!diagnostic.sampleName) return null;

  const mate = arm.__mates().find((m) => m.name === diagnostic.mateName);
  if (!mate) return null;

  // Ball deferred to v0.6.x.
  if (mate.type === 'ball') return null;

  const limits = mate.limitsDeg ?? mate.limitsMm;
  if (limits === undefined) return null;
  const limitsField: 'limitsDeg' | 'limitsMm' = mate.limitsDeg !== undefined ? 'limitsDeg' : 'limitsMm';

  // Sample-name shape from poseEnvelope.buildPoseEnvelopeSamples: `${mate.name}:min` or `${mate.name}:max`.
  const isMin = diagnostic.sampleName.endsWith(':min');
  const isMax = diagnostic.sampleName.endsWith(':max');
  if (!isMin && !isMax) return null;

  const offendingExtreme = isMin ? limits[0] : limits[1];
  const defaultPose = resolveMateDefault(mate, arm);
  if (defaultPose === undefined) return null;

  // Belt-and-suspenders: if default collides, there's no clean anchor for the
  // binary search. Return null so caller falls back to stock hint.
  if (await pairCollidesAt(arm, mate.name, defaultPose, diagnostic.partA, diagnostic.partB)) {
    return null;
  }

  let lo = defaultPose;
  let hi = offendingExtreme;
  const eps = limitsField === 'limitsDeg' ? EPS_DEG : EPS_MM;

  for (let i = 0; i < MAX_ITER && Math.abs(hi - lo) > eps; i++) {
    const mid = (lo + hi) / 2;
    if (await pairCollidesAt(arm, mate.name, mid, diagnostic.partA, diagnostic.partB)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const safeBound = lo;
  const newLimits: readonly [number, number] = isMin
    ? [safeBound, limits[1]]
    : [limits[0], safeBound];

  return {
    mateName: mate.name,
    limits: newLimits,
    limitsField,
    shrunkBound: isMin ? 'min' : 'max',
    originalLimits: limits,
  };
}

/**
 * Resolve a mate's capture-time default pose to a numeric scalar. For ball
 * mates this returns undefined (ball deferred); for fastened/planar also
 * undefined (no DOF). For revolute/prismatic/cylindrical/pin_slot, falls
 * back to 0 when no `pose` declared.
 */
function resolveMateDefault(mate: MateRecord, arm: Assembly): number | undefined {
  if (mate.type === 'fastened' || mate.type === 'planar' || mate.type === 'ball') return undefined;
  if (mate.pose === undefined) return 0;
  if (Array.isArray(mate.pose)) return undefined;   // ball-shape pose on non-ball mate is invalid; bail
  return currentValue(mate.pose as Editable<number>, arm.__session().paramTable);
}

/**
 * Pairwise interference check at a specific pose value for a specific mate.
 * Holds all other mates at their resolved capture-time defaults.
 *
 * Implementation reuses `detectInterferencesForPoses` (a small helper
 * exported from `poseEnvelope.ts`).
 */
async function pairCollidesAt(
  arm: Assembly,
  mateName: string,
  pose: number,
  partA: string,
  partB: string,
): Promise<boolean> {
  const poses: Record<string, number> = { [mateName]: pose };
  const pairs = await detectInterferencesForPoses(arm, poses);
  return pairs.some((p) => (p.a === partA && p.b === partB) || (p.a === partB && p.b === partA));
}
