// src/shared/intent/animationViewRecord.ts
//
// Types for the animationView() top-level API. An animation-view feature is a
// capture-only (virtual) node that declares a parameter sweep for offline
// MP4 capture (via scripts/captureAnimationView.mjs) and — eventually —
// playback in Studio's Animation tab.
//
// The author declares which `param()` to sweep, the start and end values, the
// duration in milliseconds, and an optional frames-per-second target. The
// capture script reads this record, generates N frames by calling
// `updateModelParams` at each sample, and stitches an MP4 via ffmpeg. The
// existing per-session mesh cache makes each frame's recompute essentially
// free (~5 ms warm).
//
// Default behavior (script never calls this) is unchanged: no animation
// captured, no Studio Animation tab enabled.

import type { FeatureId } from './types';

/**
 * Author-surface spec for animationView(). A single named param is swept
 * linearly from `from` to `to` over `durationMs` milliseconds at `fps`
 * frames per second (default 30). The capture script samples
 * ceil(durationMs/1000 * fps) frames; each frame's param value is
 * `from + (to - from) * frame / (frames - 1)`.
 */
export interface AnimationViewSpec {
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
 * Metadata stored on an `animationView` FeatureRecord. Always `virtual: true`.
 * `fps` is normalized to the resolved frames-per-second (defaulting to 30
 * when the script omitted it).
 */
export interface AnimationViewMetadata {
  param: string;
  from: number;
  to: number;
  durationMs: number;
  fps: number;
  virtual: true;
}

export interface AnimationViewHandle {
  readonly id: FeatureId;
  readonly metadata: AnimationViewMetadata;
}
