// src/modeling/mates/workspaceReachability.ts
//
// v0.7 Slice 1 — workspace-reachability gate.
//
// Spec: `2026-05-15-v0.7-kinematic-grounding-design.md` §workspace-reachability.
//
// Closes the loop on `arm.workspace(connectorRef, { reachable: [...] })`.
// The capture-time declaration only records intent; this pure synchronous
// pass validates each declared world-frame target against the sampled
// `ConnectorWorkspace` AABB already produced by `reviewPoseEnvelope` (see
// `poseEnvelope.ts:315`).
//
// Behaviour summary:
//   - If `arm.__workspaceTargets()` is empty → returns `[]`.
//   - If `connectorWorkspace` is undefined (no envelope was run) AND there
//     ARE declared targets → emits one info-severity diagnostic per
//     declared connectorRef telling the agent to enable
//     `posesGate: 'envelope'`. The gate cannot fire its error tier without
//     a sampled envelope.
//   - Otherwise per declared target: compute signed distance from the
//     target to the sampled AABB; if > toleranceMm, emit one
//     `assembly.workspace.unreachable` (severity error).
//
// AABB-only containment is the documented Slice 1 precision floor — the
// hint flags this so agents can read why a target sitting just outside the
// hull's true (convex) reachable volume might still be flagged inside the
// AABB. A convex-hull refinement is queued for Slice 2.

import type { Assembly } from '../capture/assembly';
import type { Vec3 } from '../../shared/intent/types';
import type { ConnectorWorkspace } from './poseEnvelope';
import type { ValidatorDiagnostic } from './validator';

/**
 * v0.7 Slice 1 entry point. Pure: no I/O, no async, no lower.
 *
 * Returns the list of diagnostics — possibly empty. For each declared
 * `WorkspaceTargetRecord`, evaluates every world-frame target against the
 * matching sampled `ConnectorWorkspace` AABB minus `toleranceMm` and emits
 * one `assembly.workspace.unreachable` diagnostic per out-of-range target
 * (severity error). When the connectorRef has no sampled workspace entry,
 * emits one structured "ref not in envelope" diagnostic so the agent can
 * spot misnamed refs or topology-origin connectors (which the envelope
 * skips, surfacing `assembly.pose-envelope.connector-unresolved`).
 */
export function validateWorkspaceReachability(
  arm: Assembly,
  connectorWorkspace: readonly ConnectorWorkspace[] | undefined,
): ValidatorDiagnostic[] {
  const targets = arm.__workspaceTargets();
  if (targets.length === 0) return [];

  // No envelope was run — the agent declared workspace targets but didn't
  // ask for the envelope pass that produces the sampled hull. Emit one
  // info-severity diagnostic per declared target so they see the wiring
  // gap. Info (not error) because the capture-time declaration is still
  // syntactically valid; the agent just hasn't requested the gate run.
  if (connectorWorkspace === undefined) {
    return targets.map((t) => ({
      code: 'assembly.workspace.unreachable',
      severity: 'info',
      connectorRef: t.connectorRef,
      message:
        `Workspace targets declared for connector '${t.connectorRef}' but no pose-envelope was sampled; the gate is inert.`,
      hint:
        `invalid-args.assembly.workspace-unreachable — call arm.solvedModel({}, { validate: 'error', posesGate: 'envelope' }) so the kernel samples the reachable workspace before checking targets.`,
    }));
  }

  const byRef = new Map<string, ConnectorWorkspace>();
  for (const ws of connectorWorkspace) byRef.set(ws.ref, ws);

  const out: ValidatorDiagnostic[] = [];
  for (const target of targets) {
    const ws = byRef.get(target.connectorRef);
    if (!ws) {
      // The envelope ran but this ref was never observed. Either the
      // connector doesn't exist, OR it has a topology-bound origin (which
      // `reviewPoseEnvelope` skips, also surfacing a separate
      // `assembly.pose-envelope.connector-unresolved` warning). Emit a
      // dedicated workspace diagnostic so the agent's recovery hint points
      // at THIS declaration, not just the generic envelope warning.
      out.push({
        code: 'assembly.workspace.unreachable',
        severity: 'error',
        connectorRef: target.connectorRef,
        message:
          `Workspace target for connector '${target.connectorRef}' could not be evaluated — the connector was not observed in the sampled pose envelope.`,
        hint:
          `invalid-args.assembly.workspace-unreachable — verify '${target.connectorRef}' names an existing connector with a numeric vec3 origin (topology-bound origins are skipped by the envelope sampler). Switch the connector to origin: { kind: 'vec3', value: [...] } if it must be tracked.`,
      });
      continue;
    }

    for (const target3 of target.reachable) {
      const result = signedDistanceToAabb(target3, ws.min, ws.max);
      if (result.deltaMm <= target.toleranceMm) continue;

      // Mate identification: the v0.7 Slice 1 envelope output does not
      // carry per-AABB "limiting mate" attribution; surfacing 'unknown'
      // keeps the hint truthful. A future envelope refinement may attach
      // the dominating limiting mate per axis (queued for Slice 2).
      const limitingMate = 'unknown';

      const targetStr = formatVec3(target3);
      const minStr = formatVec3(ws.min);
      const maxStr = formatVec3(ws.max);
      const closestStr = formatVec3(result.closest);
      const deltaStr = result.deltaMm.toFixed(2);

      out.push({
        code: 'assembly.workspace.unreachable',
        severity: 'error',
        connectorRef: target.connectorRef,
        message:
          `Connector '${target.connectorRef}' declared target ${targetStr} lies ${deltaStr} mm outside the sampled workspace AABB [${minStr} .. ${maxStr}]; closest sampled point ${closestStr}.`,
        hint:
          `invalid-args.assembly.workspace-unreachable — connector '${target.connectorRef}' declared target ${targetStr} lies ${deltaStr} mm outside the sampled workspace AABB (bbox [${minStr} .. ${maxStr}]). Either widen mate limits on '${limitingMate}' so the envelope reaches the target, or revise the target. Note: v0.7 Slice 1 uses AABB-only containment; a target inside the AABB but outside the true (convex) reachable hull is not flagged — convex-hull check queued for Slice 2.`,
      });
    }
  }

  return out;
}

/** Internal result of the per-target geometry check. */
interface SignedDistanceResult {
  /** 0 if the target lies inside or on the AABB; positive otherwise (mm). */
  readonly deltaMm: number;
  /** Closest point on the AABB surface (or the target itself if inside). */
  readonly closest: Vec3;
}

/**
 * Signed (outside-only) distance from `target` to the AABB defined by
 * `bboxMin`/`bboxMax`. For points inside or on the box returns
 * `{ deltaMm: 0, closest: target }`. For points outside returns the
 * Euclidean distance to the closest face / edge / corner and that closest
 * point. Cheap, pure arithmetic — no helper imports needed.
 *
 * v0.7 Slice 1 chose AABB-only containment over convex-hull deliberately:
 * keeps the gate's arithmetic O(targets × connectors) and avoids pulling
 * in a hull library. The diagnostic hint flags the precision floor so the
 * agent can interpret false negatives correctly.
 */
function signedDistanceToAabb(
  target: Vec3,
  bboxMin: Vec3,
  bboxMax: Vec3,
): SignedDistanceResult {
  const closest: Vec3 = [
    clamp(target[0], bboxMin[0], bboxMax[0]),
    clamp(target[1], bboxMin[1], bboxMax[1]),
    clamp(target[2], bboxMin[2], bboxMax[2]),
  ];
  const dx = target[0] - closest[0];
  const dy = target[1] - closest[1];
  const dz = target[2] - closest[2];
  const deltaMm = Math.hypot(dx, dy, dz);
  return { deltaMm, closest };
}

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function formatVec3(v: Vec3): string {
  return `[${formatScalar(v[0])}, ${formatScalar(v[1])}, ${formatScalar(v[2])}]`;
}

function formatScalar(n: number): string {
  // Avoid forcing scientific notation on tiny values; keep 3 decimal places
  // unless the value rounds cleanly to fewer.
  if (Number.isInteger(n)) return n.toString();
  const fixed = n.toFixed(3);
  // Trim trailing zeros while keeping at least one decimal.
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}
