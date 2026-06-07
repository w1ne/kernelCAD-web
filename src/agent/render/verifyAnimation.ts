// src/agent/render/verifyAnimation.ts
//
// Animation-pose interference verification — the right-sized motion gate
// for `kernelcad animate`. The capture engine deliberately does NOT run the
// full-range mechanism-truth probe (48 minutes before frame 1 on the
// gearfinity planetary stage; it judges poses the animation never visits).
// This module instead checks interference at the poses the animation
// ACTUALLY visits: every keyframe time plus each segment midpoint
// (`keyframeSampleSet`), or an explicit caller-supplied schedule.
//
// Threshold semantics REUSE the mechanism-validity gate's constants from
// `modeling/runtime/jointContactCap` (do not re-derive):
//   - detection epsilon `INTERPENETRATION_EPSILON_MM3` (0.01 mm³) — below
//     this an intersection is boolean/tessellation roundoff, not an overlap;
//   - classification cap `jointContactCapMm3()` (20 mm³) — shared volume at
//     or below the cap is coincident-face touching / tessellation noise
//     (touching ≠ interference); strictly above it is a real collision.
//
// Ignore-pairs: the model's own `solvedModel({ ignore: [...] })` lists are
// REACHABLE from a BuiltModel via `model.session.assemblies` →
// `Assembly.__ignoreInterference()` (the same surface review_cad reads), so
// pairs the script declared as intended contacts are honored automatically;
// `opts.ignorePairs` (pre-built `pairKey` strings) unions on top.
//
// Honesty rule: a pose that fails to solve (updateModelParams throws) or
// whose chain tail cannot be resolved is a diagnostic-bearing failure
// (`recompute.lowering.exception`, message names tMs) and flips `ok` to
// false — a pose is NEVER silently skipped.
//
// Param restoration: the sweep mutates the session paramTable; after
// verification the original (pre-verification) values are restored via
// `updateModelParams` so the capture frame loop or later consumers reuse the
// model from an unchanged state.

import {
  updateModelParams,
  type BuiltModel,
  type ParamUpdateEdit,
} from '../../modeling/buildModel';
import type { Assembly } from '../../modeling/capture/assembly';
import {
  detectInterferences,
  pairKey,
} from '../../modeling/runtime/detectInterferences';
import {
  INTERPENETRATION_EPSILON_MM3,
  jointContactCapMm3,
} from '../../modeling/runtime/jointContactCap';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic, DiagnosticCode } from '../../shared/diagnostics/diagnostic';
import { withNextAction } from '../../shared/diagnostics/diagnostic';
import type { NormalizedAnimationTrack } from '../../shared/intent/animationViewRecord';
import { keyframeSampleSet, sampleTrackAt } from './animationSampler';

/** One colliding part pair at one sampled timeline position. */
export interface AnimationCollision {
  /** Timeline position (ms) at which the pair interpenetrates. */
  tMs: number;
  a: string;
  b: string;
  /** Shared volume in mm³ — always strictly above `jointContactCapMm3()`. */
  volumeMm3: number;
}

export interface VerifyAnimationResult {
  /** True when every sampled pose solved AND no pair collided at any of them. */
  ok: boolean;
  /** One row per colliding pair per sampled pose. */
  collisions: AnimationCollision[];
  /** Poses at which interference detection actually ran (solved + lowered).
   *  Equals the sample-set size when every pose solves. */
  posesSampled: number;
  /** One `animation.collision` error per collision row (message includes
   *  tMs, the pair, and the volume), plus one `recompute.lowering.exception`
   *  per pose that failed to solve. */
  diagnostics: CompilerDiagnostic[];
}

export interface VerifyAnimationOpts {
  /** Explicit timeline positions (ms) to verify at; default
   *  `keyframeSampleSet(tracks)` (key times + segment midpoints). */
  sampleTimesMs?: number[];
  /** Extra ignored pairs as `pairKey(a, b)` strings — unioned with the
   *  model's own `solvedModel({ ignore })` lists. */
  ignorePairs?: ReadonlySet<string>;
}

function diag(code: DiagnosticCode, message: string, hint: string): CompilerDiagnostic {
  return withNextAction({ target: 'export-occt', code, severity: 'error', message, hint });
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Union of the model's `solvedModel({ ignore })` lists across every
 *  assembly captured by the script, as symmetric `pairKey` strings. */
function modelIgnorePairs(model: BuiltModel): Set<string> {
  const ignored = new Set<string>();
  for (const asm of model.session.assemblies.values()) {
    for (const [a, b] of (asm as Assembly).__ignoreInterference()) {
      ignored.add(pairKey(a, b));
    }
  }
  return ignored;
}

/**
 * Verify the animation timeline's sampled poses are interference-free.
 *
 * For each sample time: every track's param value comes from
 * `sampleTrackAt`, the model re-solves via `updateModelParams`, the chain
 * root's lowered scene is resolved, and `detectInterferences` runs with the
 * mechanism-validity gate's thresholds. Non-assembly models (root is not a
 * SceneBackend) have nothing to clash — every pose trivially passes.
 *
 * Always restores the pre-verification param values before returning.
 */
export async function verifyAnimation(
  model: BuiltModel,
  tracks: readonly NormalizedAnimationTrack[],
  opts: VerifyAnimationOpts = {},
): Promise<VerifyAnimationResult> {
  const sampleTimes = opts.sampleTimesMs ?? keyframeSampleSet(tracks);
  const diagnostics: CompilerDiagnostic[] = [];
  const collisions: AnimationCollision[] = [];
  const cap = jointContactCapMm3();

  const ignored = modelIgnorePairs(model);
  for (const key of opts.ignorePairs ?? []) ignored.add(key);

  // Snapshot the pre-verification values of every animated param so the
  // model can be restored after the sweep (a param may appear in only one
  // track post-validation; the Set guards defensively anyway).
  const originals: ParamUpdateEdit[] = [];
  const seen = new Set<string>();
  for (const track of tracks) {
    if (seen.has(track.param)) continue;
    seen.add(track.param);
    originals.push({ name: track.param, value: model.session.paramTable.get(track.param).value });
  }

  let posesSampled = 0;
  let poseFailures = 0;
  for (const tMs of sampleTimes) {
    const edits: ParamUpdateEdit[] = tracks.map((track) => ({
      name: track.param,
      value: sampleTrackAt(track, tMs),
    }));
    let lowered;
    try {
      const { model: updated } = await updateModelParams(model, edits);
      lowered = updated.rootShape ?? updated.tailShape;
      if (lowered === undefined) {
        throw new Error('the chain root produced no lowered shape');
      }
    } catch (e) {
      // Honesty rule: a pose that fails to solve is a failure, never a skip.
      poseFailures += 1;
      diagnostics.push(diag(
        'recompute.lowering.exception',
        `verifyAnimation: the pose at tMs=${tMs} failed to solve/lower: ${errMsg(e)}`,
        'Fix the underlying solve error in the message, or adjust the animationView keyframes to avoid the failing pose.',
      ));
      continue;
    }
    posesSampled += 1;
    if (!isSceneBackend(lowered)) continue; // single-body model: nothing to clash
    const result = detectInterferences(lowered, INTERPENETRATION_EPSILON_MM3, ignored);
    for (const pair of result.pairs) {
      // Mechanism-gate classification: at or below the cap is touching /
      // tessellation noise, NOT an interference.
      if (pair.volumeMm3 <= cap) continue;
      collisions.push({ tMs, a: pair.a, b: pair.b, volumeMm3: pair.volumeMm3 });
      diagnostics.push(diag(
        'animation.collision',
        `verifyAnimation: parts '${pair.a}' and '${pair.b}' collide at tMs=${tMs} of the animation timeline — ` +
          `shared volume ${pair.volumeMm3.toFixed(2)} mm³ exceeds the ${cap} mm³ interference threshold.`,
        `Adjust the keyframes so the pose at tMs=${tMs} keeps '${pair.a}' and '${pair.b}' clear, or reshape / add clearance to the colliding geometry.`,
      ));
    }
  }

  // Restore the pre-verification param values — the capture frame loop or
  // later consumers reuse the model and must see it unchanged.
  if (originals.length > 0) {
    try {
      await updateModelParams(model, originals);
    } catch (e) {
      poseFailures += 1;
      diagnostics.push(diag(
        'recompute.lowering.exception',
        `verifyAnimation: restoring the pre-verification param values failed: ${errMsg(e)}`,
        'The model session may be in an inconsistent pose; rebuild the model before reusing it.',
      ));
    }
  }

  return {
    ok: collisions.length === 0 && poseFailures === 0,
    collisions,
    posesSampled,
    diagnostics,
  };
}
