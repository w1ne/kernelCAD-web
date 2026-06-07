/**
 * `POST /__kernelcad/animation-bake?session=<token>`.
 *
 * Bakes the session's last `animationView()` timeline into per-part world
 * transforms ONCE, server-side, so Studio can play it back smoothly on the
 * client without a kernel re-solve per frame.
 *
 * Why this exists
 * ---------------
 * The original Animation tab emitted one `POST /__kernelcad/params` per rAF
 * tick — every visible pose was a full kernel re-solve → SSE relower → client
 * re-fetch of ALL feature meshes → scene rebuild (200-400ms+/pose; jerky).
 * But for a pose-only timeline (mate-pose params on a solvedAssembly) the
 * per-part GEOMETRY never changes — only the per-part WORLD TRANSFORMS do.
 * Re-transferring identical triangle buffers every frame is pure waste.
 *
 * This endpoint solves the timeline once. For each scheduled frame it
 * `updateModelParams`-solves the pose and collects the solved scene's per-part
 * world transforms (the SAME `worldTransform.toMat4()` 16-float column-major
 * matrices the `/transforms` fast path and `/mesh` payload carry). Geometry is
 * NEVER serialized. The client caches the result and interpolates between
 * baked frames at full rAF rate, applying transforms directly to the existing
 * part groups.
 *
 * Response shape
 * --------------
 *   { frames, durationMs, fps, times: number[],
 *     parts: [{ name, matrices: number[][] }] }   // matrices[frame] = mat4[16]
 *
 * Each part's `matrices[i]` is its world transform at `times[i]`. The Studio
 * viewport already poses parts by replacing each geometry's `transform`
 * (16-float column-major) keyed by `assemblyPartName` (see
 * `GeometryContext.displayGeometries` / `setGeometryTransformOverride`), so the
 * client applies a baked matrix DIRECTLY with no decompose round-trip needed —
 * though it decomposes for slerp/lerp interpolation between samples.
 *
 * Conventions mirrored from the sibling endpoints
 * -----------------------------------------------
 * - Session resolution + typed error envelope: same as `paramsEndpoint` /
 *   `transformsEndpoint` (400 missing token, 404 unknown token, 422 typed,
 *   500 fallback).
 * - Param restoration after the sweep: same as `verifyAnimation` (the pooled
 *   session is reused by the live viewport, so it must be left at its
 *   pre-bake pose).
 * - Single-flight per session: a second bake while one is running for the same
 *   token returns 409 (the client awaits the first; bakes are deterministic so
 *   the second would compute the same thing).
 */

import type { SessionPool } from '../sessionPool';
import { readQuery, writeJson, type MinimalRes } from './httpUtil';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import {
  updateModelParams,
  type BuiltModel,
  type ParamUpdateEdit,
} from '../../modeling/buildModel';
import { sampleTracks } from '../../agent/render/animationSampler';
import type {
  AnimationViewMetadata,
  NormalizedAnimationTrack,
} from '../../shared/intent/animationViewRecord';

export interface AnimationBakeEndpointDeps {
  pool: SessionPool;
}

export interface AnimationBakeReqLike {
  url?: string;
  method?: string;
}

/** Hard ceiling on baked frames. A pose-only bake is ~60ms/frame; 600 frames
 *  (e.g. 30 fps × 20 s, or 12 fps × 50 s) is already a ~36 s bake. Beyond this
 *  the timeline is almost certainly authored for offline MP4 capture, not
 *  interactive review — fail with a typed error rather than wedge the kernel. */
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
}

/** Last-wins animationView metadata across the model's records (same policy as
 *  `selectAnimationMetadata` and the offline capture engine). */
function selectAnimationMetadata(model: BuiltModel): AnimationViewMetadata | null {
  let found: AnimationViewMetadata | null = null;
  for (const record of model.records) {
    if (record.kind !== 'animationView') continue;
    if (!record.metadata) continue;
    found = record.metadata as unknown as AnimationViewMetadata;
  }
  return found;
}

/** Read the LIVE solved tail from the session's `cachedShapes` (kept fresh by
 *  `updateModelParams` → `populateCache`), falling back to the model's
 *  `tailShape`. Same approach as `transformsEndpoint`. */
function liveTail(model: BuiltModel): unknown {
  const session = model.session as unknown as { cachedShapes?: Map<string, unknown> };
  const tailId = model.tailId;
  const cached = tailId ? session.cachedShapes?.get(tailId) : undefined;
  return cached ?? model.tailShape;
}

export function createAnimationBakeEndpoint(deps: AnimationBakeEndpointDeps) {
  // Single-flight per session token. A bake is deterministic and mutates the
  // shared session pose mid-sweep (restored at the end); two overlapping bakes
  // on one session would race the single OCCT WASM instance AND each other's
  // param restoration. The client awaits the first and reuses its cache.
  const inFlight = new Set<string>();

  return async function animationBakeHandler(
    req: AnimationBakeReqLike,
    res: MinimalRes,
  ): Promise<void> {
    let token: string | null = null;
    try {
      token = readQuery(req.url, 'session');
      if (!token) {
        return writeJson(res, 400, { error: 'missing session query parameter' });
      }
      const entry = deps.pool.get(token);
      if (!entry) {
        return writeJson(res, 404, { error: 'unknown session token' });
      }

      if (inFlight.has(token)) {
        return writeJson(res, 409, {
          error: 'a bake is already in flight for this session',
          code: 'animation.bake.in-flight',
          hint: 'Await the in-flight bake (the client caches the result) instead of issuing a second one.',
        });
      }

      const model = entry.model;
      const metadata = selectAnimationMetadata(model);
      if (!metadata) {
        return writeJson(res, 422, {
          error: 'session has no animationView() record to bake',
          code: 'animation.bake.no-view',
          hint: 'Declare an animationView({ tracks: [...] }) in the script before requesting a bake.',
        });
      }

      const tracks: readonly NormalizedAnimationTrack[] = metadata.tracks;
      const fps = metadata.fps;
      const { frames: schedule, durationMs } = sampleTracks(tracks, fps);
      if (schedule.length > MAX_BAKE_FRAMES) {
        return writeJson(res, 422, {
          error: `animation timeline bakes to ${schedule.length} frames, above the ${MAX_BAKE_FRAMES}-frame ceiling`,
          code: 'animation.bake.too-many-frames',
          hint: `Lower the animationView fps or shorten durationMs so frames ≤ ${MAX_BAKE_FRAMES}, or use offline MP4 capture for long timelines.`,
        });
      }

      inFlight.add(token);

      // Snapshot pre-bake values of every animated param so the pooled session
      // (reused by the live viewport) is restored to its current pose after the
      // sweep — same discipline as verifyAnimation.
      const originals: ParamUpdateEdit[] = [];
      const seen = new Set<string>();
      for (const track of tracks) {
        if (seen.has(track.param)) continue;
        seen.add(track.param);
        originals.push({
          name: track.param,
          value: model.session.paramTable.get(track.param).value,
        });
      }

      try {
        const times: number[] = [];
        // partName → matrices[frame]. Preserve first-seen part order.
        const order: string[] = [];
        const byPart = new Map<string, number[][]>();

        for (let i = 0; i < schedule.length; i += 1) {
          const frame = schedule[i];
          times.push(frame.tMs);
          const edits: ParamUpdateEdit[] = tracks.map((track) => ({
            name: track.param,
            value: frame.values[track.param],
          }));
          // `silent` so the per-frame pose solve does NOT fan a relower out
          // to SSE subscribers. Without this each baked frame fired one
          // `event: relower` → the client re-fetched `/transforms` per frame
          // (25 useless fetches across a 24-frame bake) and the live viewport
          // twitched through every pose mid-bake. The single post-restore
          // relower below is the only one a bake should produce.
          const { model: updated } = await updateModelParams(model, edits, {
            silent: true,
          });
          const tail = liveTail(updated);
          if (!isSceneBackend(tail)) {
            return writeJson(res, 422, {
              error: `the pose at tMs=${frame.tMs} did not resolve an assembly scene; baked playback needs per-part transforms`,
              code: 'animation.bake.no-scene',
              hint: 'Return the solved assembly from the script — `return asm.solvedModel(...)` — so each pose lowers to a scene with per-part world transforms.',
            });
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

        const result: AnimationBakeResult = {
          frames: schedule.length,
          durationMs,
          fps,
          times,
          parts: order.map((name) => ({ name, matrices: byPart.get(name) ?? [] })),
        };
        return writeJson(res, 200, result);
      } finally {
        // Restore the pre-bake pose, then drop the single-flight lock. A
        // restore failure leaves the session at the last baked pose; surface
        // nothing here (the bake result already went out) but log it.
        //
        // This restore solve is the ONLY relower a bake emits: the per-frame
        // sweep above ran `silent`, so this single (non-silent) update fans one
        // `event: relower` out to SSE subscribers AFTER the session is back at
        // its pre-bake pose — any open client resyncs its transforms exactly
        // once instead of once per baked frame.
        if (originals.length > 0) {
          try {
            await updateModelParams(model, originals);
          } catch (e) {
            console.warn(
              `[animation-bake] failed to restore params for session ${token}:`,
              e instanceof Error ? e.message : String(e),
            );
          }
        } else {
          // No animated params were edited (degenerate timeline): the silent
          // sweep emitted nothing, so emit one synthetic empty relower so a
          // client that began listening mid-bake still gets a single resync.
          model.session.engine?.emitRelower([]);
        }
        inFlight.delete(token);
      }
    } catch (error) {
      if (token) inFlight.delete(token);
      const err = error as { message?: unknown; code?: unknown; hint?: unknown };
      if (typeof err?.code === 'string') {
        return writeJson(res, 422, {
          error: typeof err.message === 'string' ? err.message : String(error),
          code: err.code,
          hint: typeof err.hint === 'string' ? err.hint : undefined,
        });
      }
      return writeJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
