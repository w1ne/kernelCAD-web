// src/shared/intent/animationViewRecord.ts
//
// Types for the animationView() top-level API. An animation-view feature is a
// capture-only (virtual) node that declares an animation timeline for offline
// MP4 capture (via scripts/captureAnimationView.mjs) and — eventually —
// playback in Studio's Animation tab.
//
// Two author-surface forms are accepted:
//
//   1. Legacy sweep — ONE param swept linearly:
//        animationView({ param: 'driveAngleDeg', from: 0, to: 360, durationMs: 4000 })
//   2. Keyframe tracks — multiple params, each with its own key list:
//        animationView({ name: 'dispense cycle', tracks: [
//          { param: 'drumAngleDeg',  keys: [{ atMs: 0, value: 0 }, { atMs: 800, value: 60, ease: 'easeInOut' }] },
//          { param: 'meterSwingDeg', keys: [{ atMs: 800, value: 0 }, { atMs: 1400, value: 35 }] },
//        ] })
//
// Whatever the author surface, the metadata stored on the FeatureRecord is
// ALWAYS normalized to the track shape (see AnimationViewMetadata) — the
// legacy sweep becomes one linear two-key track. Downstream consumers read
// `tracks` only; there is no param/from/to compatibility view on the metadata.
//
// Default behavior (script never calls this) is unchanged: no animation
// captured, no Studio Animation tab enabled.

import type { FeatureId } from './types';

/** Easing functions accepted on an AnimationKey. */
export const ANIMATION_EASES = ['linear', 'step', 'easeIn', 'easeOut', 'easeInOut'] as const;

export type AnimationEase = (typeof ANIMATION_EASES)[number];

/**
 * One keyframe on a track: the named param reaches `value` at `atMs`
 * milliseconds on the timeline.
 *
 * `ease` applies to the segment ENDING at this key — "arrive at this pose
 * with this easing" — and defaults to 'linear'. The ease on the FIRST key of
 * a track is therefore inert (no segment ends there). Outside the keyed span
 * the value holds (clamp): before the first key the track sits at the first
 * key's value, after the last key it sits at the last key's value.
 */
export interface AnimationKey {
  /** Timeline position in milliseconds (>= 0, finite, unique within a track). */
  atMs: number;
  /** Param value at this keyframe. Clamped to the param's declared min/max range. */
  value: number;
  /** Easing of the segment that ENDS at this key; default 'linear'. */
  ease?: AnimationEase;
}

/**
 * One animated param: the name of a `param()` declared earlier in the script
 * plus its keyframes. A param may appear in at most one track per
 * animationView() call.
 */
export interface AnimationTrack {
  /** Name of a `param()` declared earlier in the script. */
  param: string;
  /** Keyframes; need not be pre-sorted — normalization sorts by atMs. */
  keys: AnimationKey[];
}

/**
 * Legacy author-surface form: a single named param swept linearly from
 * `from` to `to` over `durationMs` milliseconds at `fps` frames per second
 * (default 30). Normalizes to one track
 * `[{ atMs: 0, value: from }, { atMs: durationMs, value: to }]` with linear
 * easing.
 */
export interface AnimationViewSweepSpec {
  /** Name of a `param()` declared earlier in the script. The capture script
   *  calls `updateModelParams` with this name at each frame. */
  param: string;
  /** Start value of the sweep (inclusive). */
  from: number;
  /** End value of the sweep (inclusive). */
  to: number;
  /** Total animation duration in milliseconds. Combined with `fps`, this
   *  determines the frame count: `ceil(durationMs / 1000 * fps)`. */
  durationMs: number;
  /** Frames per second; default 30. The capture script stitches at this
   *  rate so playback speed matches the authored duration. */
  fps?: number;
}

/**
 * Keyframe-track author-surface form: several params animated on one shared
 * timeline. Total duration is the maximum `atMs` across all tracks.
 */
export interface AnimationViewTracksSpec {
  /** Optional human-readable label for the animation (e.g. 'dispense cycle'). */
  name?: string;
  /** One track per animated param. */
  tracks: AnimationTrack[];
  /** Frames per second; default 30. */
  fps?: number;
}

/** Author-surface spec for animationView() — sweep or keyframe-track form. */
export type AnimationViewSpec = AnimationViewSweepSpec | AnimationViewTracksSpec;

/** Discriminates the keyframe-track form from the legacy sweep form. */
export function isAnimationViewTracksSpec(spec: AnimationViewSpec): spec is AnimationViewTracksSpec {
  return typeof spec === 'object' && spec !== null && 'tracks' in spec;
}

/** AnimationKey after normalization: `ease` is always present ('linear' default). */
export interface NormalizedAnimationKey {
  atMs: number;
  value: number;
  ease: AnimationEase;
}

/** AnimationTrack after normalization: keys sorted ascending by atMs. */
export interface NormalizedAnimationTrack {
  param: string;
  keys: NormalizedAnimationKey[];
}

/**
 * Metadata stored on an `animationView` FeatureRecord. Always `virtual: true`
 * and ALWAYS in the normalized track shape regardless of which author-surface
 * form produced it:
 *   - keys are sorted ascending by atMs with `ease` defaulted to 'linear';
 *   - `durationMs` is the maximum atMs across all tracks;
 *   - `fps` is the resolved frames-per-second (default 30).
 */
export interface AnimationViewMetadata {
  name?: string;
  tracks: NormalizedAnimationTrack[];
  fps: number;
  durationMs: number;
  virtual: true;
}

export interface AnimationViewHandle {
  readonly id: FeatureId;
  readonly metadata: AnimationViewMetadata;
}

/**
 * Pure normalization of an author-surface spec into the stored metadata
 * shape. Assumes the spec already passed validation (finite numbers, no
 * duplicate atMs); validation and range-clamping live in
 * `CaptureSession.addAnimationView`.
 *
 * `fps` overrides the spec's own fps when provided (the session resolves
 * invalid fps values to the 30 default with a warn diagnostic).
 */
export function normalizeAnimationView(spec: AnimationViewSpec, fps?: number): AnimationViewMetadata {
  const resolvedFps = fps ?? spec.fps ?? 30;
  let name: string | undefined;
  let tracks: NormalizedAnimationTrack[];
  if (isAnimationViewTracksSpec(spec)) {
    name = spec.name;
    tracks = spec.tracks.map((t) => ({
      param: t.param,
      keys: [...t.keys]
        .sort((a, b) => a.atMs - b.atMs)
        .map((k) => ({ atMs: k.atMs, value: k.value, ease: k.ease ?? 'linear' })),
    }));
  } else {
    tracks = [{
      param: spec.param,
      keys: [
        { atMs: 0, value: spec.from, ease: 'linear' },
        { atMs: spec.durationMs, value: spec.to, ease: 'linear' },
      ],
    }];
  }
  let durationMs = 0;
  for (const t of tracks) {
    for (const k of t.keys) durationMs = Math.max(durationMs, k.atMs);
  }
  return {
    ...(name !== undefined ? { name } : {}),
    tracks,
    fps: resolvedFps,
    durationMs,
    virtual: true,
  };
}
