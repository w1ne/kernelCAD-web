// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Pure, session-free animation baker. Solves an `animationView()` timeline ONCE
 * into per-part world transforms so a client can play it back smoothly without
 * a kernel re-solve per frame.
 *
 * Mirrors the bake loop in `server/middleware/animationBakeEndpoint.ts` and is
 * used by the gallery build (`build-gallery`) to bake curated models at build
 * time into static `/gallery/_anim/<sha>.json` files, so anonymous Studio
 * visitors get a moving mechanism with zero server compute.
 *
 * TODO(dry): have `animationBakeEndpoint` adopt this function (wrapping it with
 * its single-flight + pre/post pose restore) so there is one bake implementation.
 * Kept separate for now to avoid touching the working live `?script=` path.
 *
 * Guards throw `Error` objects carrying a `.code` (and optional `.hint`) so the
 * endpoint maps them to its typed 422 envelope; the build treats a thrown guard
 * as "this model has no bakeable pose-only timeline" and simply skips it.
 */
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import {
  updateModelParams,
  type BuiltModel,
  type ParamUpdateEdit,
} from '../buildModel';
import { sampleTracks } from '../../agent/render/animationSampler';
import { verifyAnimation, type AnimationCollision } from '../../agent/render/verifyAnimation';
import type { AnimationViewMetadata } from '../../shared/intent/animationViewRecord';

/** Hard ceiling on baked frames. A pose-only bake is ~60ms/frame; 600 frames
 *  is already a ~36 s bake — beyond interactive review, so fail fast. */
export const MAX_BAKE_FRAMES = 600;

export interface BakedPart {
  name: string;
  /** One 16-float column-major world matrix per frame, frame-aligned to `times`. */
  matrices: number[][];
}

export interface AnimationBakeResult {
  frames: number;
  durationMs: number;
  fps: number;
  times: number[];
  parts: BakedPart[];
  /** ADVISORY keyframe-pose interferences — NON-FATAL; drives the Studio warning. */
  collisions: AnimationCollision[];
}

/** Typed guard error the endpoint surfaces as 422 and the build skips. */
function bakeError(message: string, code: string, hint?: string): Error {
  return Object.assign(new Error(message), { code, hint });
}

const ASSEMBLY_RECORD_KINDS: ReadonlySet<string> = new Set([
  'solvedAssembly',
  'assemblyModel',
]);

function firstAssemblyIndex(model: BuiltModel): number {
  for (let i = 0; i < model.records.length; i += 1) {
    if (ASSEMBLY_RECORD_KINDS.has(model.records[i].kind)) return i;
  }
  return -1;
}

/** Last-wins animationView metadata across the model's records. */
export function selectAnimationMetadata(model: BuiltModel): AnimationViewMetadata | null {
  let found: AnimationViewMetadata | null = null;
  for (const record of model.records) {
    if (record.kind !== 'animationView') continue;
    if (!record.metadata) continue;
    found = record.metadata as unknown as AnimationViewMetadata;
  }
  return found;
}

/** Live solved tail from the session's `cachedShapes`, falling back to `tailShape`. */
function liveTail(model: BuiltModel): unknown {
  const session = model.session as unknown as { cachedShapes?: Map<string, unknown> };
  const tailId = model.tailId;
  const cached = tailId ? session.cachedShapes?.get(tailId) : undefined;
  return cached ?? model.tailShape;
}

/**
 * Bake the model's animationView timeline into per-part world transforms.
 * MUTATES the model's param poses during the sweep (caller restores if the
 * model is shared, e.g. a pooled live session). Throws a typed guard error if
 * there is no view, too many frames, a geometry-driving track, or a pose that
 * doesn't resolve an assembly scene.
 */
export async function bakeAnimationTimeline(model: BuiltModel): Promise<AnimationBakeResult> {
  const metadata = selectAnimationMetadata(model);
  if (!metadata) {
    throw bakeError(
      'session has no animationView() record to bake',
      'animation.bake.no-view',
      'Declare an animationView({ tracks: [...] }) in the script before requesting a bake.',
    );
  }

  const tracks = metadata.tracks;
  const fps = metadata.fps;
  const { frames: schedule, durationMs } = sampleTracks(tracks, fps);
  if (schedule.length > MAX_BAKE_FRAMES) {
    throw bakeError(
      `animation timeline bakes to ${schedule.length} frames, above the ${MAX_BAKE_FRAMES}-frame ceiling`,
      'animation.bake.too-many-frames',
      `Lower the animationView fps or shorten durationMs so frames ≤ ${MAX_BAKE_FRAMES}.`,
    );
  }

  const assemblyIndex = firstAssemblyIndex(model);
  const recordIndexById = new Map<string, number>();
  model.records.forEach((rec, idx) => recordIndexById.set(rec.id, idx));

  const times: number[] = [];
  const order: string[] = [];
  const byPart = new Map<string, number[][]>();

  for (let i = 0; i < schedule.length; i += 1) {
    const frame = schedule[i];
    times.push(frame.tMs);
    const edits: ParamUpdateEdit[] = tracks.map((track) => ({
      name: track.param,
      value: frame.values[track.param],
    }));
    const { model: updated, result: updateResult } = await updateModelParams(model, edits, {
      silent: true,
    });

    // Geometry-param guard: baked playback re-applies RIGID per-part transforms
    // only. A track param that re-lowers a part record BEFORE the assembly
    // record changed geometry, not just a pose → the baked transforms would
    // pose the pre-edit shape. Detect on the first frame and refuse.
    if (i === 0 && assemblyIndex >= 0) {
      const touchedGeometry = updateResult.relowered.some((id) => {
        const idx = recordIndexById.get(id);
        return idx !== undefined && idx < assemblyIndex;
      });
      if (touchedGeometry) {
        throw bakeError(
          'this animationView timeline drives part GEOMETRY (a dimension / extrude depth / hole radius), ' +
            'not just a mate pose — baked playback only re-applies rigid per-part transforms.',
          'animation.bake.geometry-param',
          'Studio playback supports POSE-ONLY (mate-driven) timelines. Render geometry-animating timelines with `kernelcad animate`.',
        );
      }
    }

    // Read the freshly-posed scene from the STABLE original tailId on the
    // shared session (updateModelParams populated `model.session.cachedShapes`
    // in place). The returned `updated` model can carry a tailId that misses
    // the cache → a stale frame-0 tailShape fallback → a frozen mechanism.
    // Same accessor the live `transformsEndpoint` uses (`entry.model.tailId`).
    const tail = liveTail(updated);
    if (!isSceneBackend(tail)) {
      throw bakeError(
        `the pose at tMs=${frame.tMs} did not resolve an assembly scene; baked playback needs per-part transforms`,
        'animation.bake.no-scene',
        'Return the solved assembly from the script — `return asm.solvedModel(...)`.',
      );
    }
    for (const part of tail.parts) {
      let matrices = byPart.get(part.name);
      if (!matrices) {
        matrices = [];
        byPart.set(part.name, matrices);
        order.push(part.name);
      }
      matrices.push(Array.from(part.worldTransform.toMat4()));
    }
  }

  // ADVISORY collision check (same keyframe-sample check `kernelcad animate`
  // uses). NON-FATAL: never sink a bake whose transforms are already computed.
  let collisions: AnimationCollision[] = [];
  try {
    const verdict = await verifyAnimation(model, tracks, { silent: true });
    collisions = verdict.collisions;
  } catch (e) {
    console.warn('[bakeAnimationTimeline] advisory collision check failed:', e instanceof Error ? e.message : String(e));
  }

  return {
    frames: schedule.length,
    durationMs,
    fps,
    times,
    parts: order.map((name) => ({ name, matrices: byPart.get(name) ?? [] })),
    collisions,
  };
}
