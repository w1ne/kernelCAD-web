// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/render/animationSampler.ts
//
// Pure keyframe-track sampler for animationView() timelines. Turns the
// normalized track metadata (see src/shared/intent/animationViewRecord.ts)
// into per-frame param values for offline MP4 capture
// (scripts/captureAnimationView.mjs) and — later — Studio's Animation tab
// player, which must use THIS module so capture and playback agree exactly.
//
// The easing formulas in easeProgress() are the product contract: any other
// consumer (Studio player, docs, examples) must reproduce them bit-for-bit.
//
// Pure module: no I/O, no kernel imports.

import type { AnimationEase, NormalizedAnimationTrack } from '../../shared/intent/animationViewRecord';

/**
 * Map a linear time-fraction `u` ∈ [0, 1] within a segment to eased progress.
 *
 * Exact formulas (cubic family — the product contract):
 *   - 'linear':    f(u) = u
 *   - 'step':      f(u) = 0 for u < 1, f(1) = 1   (hold until arrival)
 *   - 'easeIn':    f(u) = u³                       (cubic-in)
 *   - 'easeOut':   f(u) = 1 − (1−u)³               (cubic-out)
 *   - 'easeInOut': f(u) = u < 0.5 ? 4u³ : 1 − 4(1−u)³   (standard cubic pair)
 *
 * All five satisfy f(0) = 0 and f(1) = 1, so sampling exactly AT a key time
 * always returns the key's exact value regardless of ease.
 */
export function easeProgress(ease: AnimationEase, u: number): number {
  switch (ease) {
    case 'linear':
      return u;
    case 'step':
      return u < 1 ? 0 : 1;
    case 'easeIn':
      return u * u * u;
    case 'easeOut': {
      const v = 1 - u;
      return 1 - v * v * v;
    }
    case 'easeInOut':
      if (u < 0.5) return 4 * u * u * u;
      {
        const v = 1 - u;
        return 1 - 4 * v * v * v;
      }
  }
}

/**
 * Sample a normalized track at `tMs` milliseconds.
 *
 * Hold-clamp outside the keyed span: before the first key the track sits at
 * the first key's value, after the last key at the last key's value. Between
 * keys i−1 and i:
 *
 *   u     = (tMs − atMs[i−1]) / (atMs[i] − atMs[i−1])
 *   value = value[i−1] + (value[i] − value[i−1]) · easeProgress(ease[i], u)
 *
 * The ease comes from the key the segment ENDS at ("arrive with this
 * easing"), matching the AnimationKey contract.
 *
 * Zero-length segments cannot exist post-validation (duplicate atMs throws
 * in CaptureSession.addAnimationView) — asserted defensively anyway.
 */
export function sampleTrackAt(track: NormalizedAnimationTrack, tMs: number): number {
  const keys = track.keys;
  if (keys.length === 0) {
    throw new Error(`animationSampler: track '${track.param}' has no keys`);
  }
  if (tMs <= keys[0].atMs) return keys[0].value;
  const last = keys[keys.length - 1];
  if (tMs >= last.atMs) return last.value;
  for (let i = 1; i < keys.length; i += 1) {
    if (tMs <= keys[i].atMs) {
      const a = keys[i - 1];
      const b = keys[i];
      const dt = b.atMs - a.atMs;
      if (dt <= 0) {
        throw new Error(
          `animationSampler: zero-length segment at atMs=${b.atMs} on track '${track.param}' (duplicate atMs should have been rejected by validation)`,
        );
      }
      const u = (tMs - a.atMs) / dt;
      return a.value + (b.value - a.value) * easeProgress(b.ease, u);
    }
  }
  // Unreachable: tMs < last.atMs guarantees a segment above.
  return last.value;
}

/** One capture frame: timeline position plus every track's sampled value. */
export interface AnimationFrameSample {
  tMs: number;
  values: Record<string, number>;
}

export interface AnimationSampleResult {
  frames: AnimationFrameSample[];
  durationMs: number;
}

/**
 * Sample every track at a uniform frame schedule.
 *
 *   durationMs = max atMs across all tracks (0 when all keys sit at 0)
 *   frameCount = max(2, ceil(durationMs / 1000 · fps))
 *   frame i at tMs = durationMs · i / (frameCount − 1)
 *
 * The last frame lands EXACTLY at durationMs (computed as `durationMs`
 * directly, not via the fraction, so no float drift). Every frame carries a
 * value for every track — tracks whose keyed span doesn't cover a frame's
 * tMs contribute their hold-clamped value.
 */
export function sampleTracks(
  tracks: readonly NormalizedAnimationTrack[],
  fps: number,
): AnimationSampleResult {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error(`animationSampler: fps must be a finite number > 0 (got ${fps})`);
  }
  let durationMs = 0;
  for (const track of tracks) {
    for (const key of track.keys) durationMs = Math.max(durationMs, key.atMs);
  }
  const frameCount = Math.max(2, Math.ceil((durationMs / 1000) * fps));
  const frames: AnimationFrameSample[] = [];
  for (let i = 0; i < frameCount; i += 1) {
    const tMs = i === frameCount - 1 ? durationMs : (durationMs * i) / (frameCount - 1);
    const values: Record<string, number> = {};
    for (const track of tracks) values[track.param] = sampleTrackAt(track, tMs);
    frames.push({ tMs, values });
  }
  return { frames, durationMs };
}

/**
 * Timeline positions where motion verification should sample (feeds T5):
 * every distinct key atMs across all tracks PLUS each adjacent-pair midpoint
 * per track, deduped by exact number equality, sorted ascending. Midpoints
 * catch eased-segment shape (a key-only sample set cannot distinguish eases);
 * a single-key track contributes its atMs and no midpoint.
 */
export function keyframeSampleSet(tracks: readonly NormalizedAnimationTrack[]): number[] {
  const samples = new Set<number>();
  for (const track of tracks) {
    const keys = track.keys;
    for (let i = 0; i < keys.length; i += 1) {
      samples.add(keys[i].atMs);
      if (i > 0) samples.add((keys[i - 1].atMs + keys[i].atMs) / 2);
    }
  }
  return [...samples].sort((a, b) => a - b);
}
