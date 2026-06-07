// tests/unit/render/animationSampler.test.ts
//
// Exhaustive golden-value tests for the pure keyframe-track sampler. The
// easing formulas are the product contract (Studio's player must reproduce
// them exactly), so expectations are exact `toBe` — every golden value below
// is an exact binary fraction computed by hand in the comments.

import { describe, it, expect } from 'vitest';
import type {
  AnimationEase,
  NormalizedAnimationKey,
  NormalizedAnimationTrack,
} from '../../../src/shared/intent/animationViewRecord';
import {
  easeProgress,
  sampleTrackAt,
  sampleTracks,
  keyframeSampleSet,
} from '../../../src/agent/render/animationSampler';

function key(atMs: number, value: number, ease: AnimationEase = 'linear'): NormalizedAnimationKey {
  return { atMs, value, ease };
}

function track(param: string, keys: NormalizedAnimationKey[]): NormalizedAnimationTrack {
  return { param, keys };
}

describe('easeProgress', () => {
  // Golden values at u = 0.25 / 0.5 / 0.75 (all exact binary fractions):
  //   linear:    u                       → 0.25, 0.5, 0.75
  //   step:      0 for u<1, 1 at u=1     → 0, 0, 0
  //   easeIn:    u³                      → 0.25³ = 0.015625
  //                                        0.5³  = 0.125
  //                                        0.75³ = 0.421875
  //   easeOut:   1 − (1−u)³              → 1 − 0.75³ = 0.578125
  //                                        1 − 0.5³  = 0.875
  //                                        1 − 0.25³ = 0.984375
  //   easeInOut: u<0.5 ? 4u³ : 1−4(1−u)³ → 4·0.25³        = 0.0625
  //                                        1 − 4·0.5³     = 0.5
  //                                        1 − 4·0.25³    = 0.9375
  const golden: Record<AnimationEase, [number, number, number]> = {
    linear: [0.25, 0.5, 0.75],
    step: [0, 0, 0],
    easeIn: [0.015625, 0.125, 0.421875],
    easeOut: [0.578125, 0.875, 0.984375],
    easeInOut: [0.0625, 0.5, 0.9375],
  };

  for (const [ease, [g25, g50, g75]] of Object.entries(golden) as Array<
    [AnimationEase, [number, number, number]]
  >) {
    it(`'${ease}' golden values at u=0.25/0.5/0.75`, () => {
      expect(easeProgress(ease, 0.25)).toBe(g25);
      expect(easeProgress(ease, 0.5)).toBe(g50);
      expect(easeProgress(ease, 0.75)).toBe(g75);
    });

    it(`'${ease}' satisfies f(0)=0 and f(1)=1`, () => {
      expect(easeProgress(ease, 0)).toBe(0);
      expect(easeProgress(ease, 1)).toBe(1);
    });
  }

  it("'step' holds at 0 arbitrarily close to arrival", () => {
    expect(easeProgress('step', 0.999)).toBe(0);
  });
});

describe('sampleTrackAt', () => {
  const t = track('a', [key(1000, 10), key(2000, 20, 'easeIn')]);

  it('hold-clamps before the first key', () => {
    expect(sampleTrackAt(t, 0)).toBe(10);
    expect(sampleTrackAt(t, 999)).toBe(10);
  });

  it('hold-clamps after the last key', () => {
    expect(sampleTrackAt(t, 2000.5)).toBe(20);
    expect(sampleTrackAt(t, 99999)).toBe(20);
  });

  it('returns exact key values AT key times regardless of ease', () => {
    expect(sampleTrackAt(t, 1000)).toBe(10);
    expect(sampleTrackAt(t, 2000)).toBe(20);
    const stepT = track('s', [key(0, 0), key(1000, 5, 'step')]);
    expect(sampleTrackAt(stepT, 1000)).toBe(5);
  });

  it('linear midpoint', () => {
    const lin = track('l', [key(0, 0), key(1000, 10)]);
    // u = 0.5, linear → 0 + 10·0.5 = 5
    expect(sampleTrackAt(lin, 500)).toBe(5);
  });

  it('easeIn midpoint uses f(u)=u³', () => {
    // u = 0.5 → 10 + (20−10)·0.125 = 11.25
    expect(sampleTrackAt(t, 1500)).toBe(11.25);
  });

  it('easeOut midpoint uses f(u)=1−(1−u)³', () => {
    const out = track('o', [key(0, 0), key(1000, 10, 'easeOut')]);
    // u = 0.5 → 10·0.875 = 8.75
    expect(sampleTrackAt(out, 500)).toBe(8.75);
  });

  it('easeInOut quarter points use the cubic pair', () => {
    const io = track('io', [key(0, 0), key(1000, 10, 'easeInOut')]);
    // u = 0.25 → 10·0.0625 = 0.625;  u = 0.5 → 5;  u = 0.75 → 10·0.9375 = 9.375
    expect(sampleTrackAt(io, 250)).toBe(0.625);
    expect(sampleTrackAt(io, 500)).toBe(5);
    expect(sampleTrackAt(io, 750)).toBe(9.375);
  });

  it("'step' holds the previous value until arrival", () => {
    const st = track('st', [key(0, 1), key(1000, 5, 'step')]);
    expect(sampleTrackAt(st, 1)).toBe(1);
    expect(sampleTrackAt(st, 500)).toBe(1);
    expect(sampleTrackAt(st, 999)).toBe(1);
    expect(sampleTrackAt(st, 1000)).toBe(5);
  });

  it('ease attaches to the segment ENDING at the key', () => {
    // Middle key has easeIn: segment 0→1000 eases in; segment 1000→2000
    // (ending at a linear key) is linear.
    const tr = track('m', [key(0, 0), key(1000, 10, 'easeIn'), key(2000, 30)]);
    expect(sampleTrackAt(tr, 500)).toBe(1.25); // 10·0.125
    expect(sampleTrackAt(tr, 1500)).toBe(20); // 10 + 20·0.5
  });

  it('single-key track is constant everywhere', () => {
    const single = track('c', [key(500, 7)]);
    expect(sampleTrackAt(single, 0)).toBe(7);
    expect(sampleTrackAt(single, 500)).toBe(7);
    expect(sampleTrackAt(single, 5000)).toBe(7);
  });

  it('throws on an empty key list (defensive)', () => {
    expect(() => sampleTrackAt(track('e', []), 0)).toThrow(/no keys/);
  });
});

describe('sampleTracks', () => {
  it('throws on non-finite or non-positive fps', () => {
    const tracks = [track('a', [key(0, 0), key(1000, 1)])];
    for (const fps of [0, -30, NaN, Infinity, -Infinity]) {
      expect(() => sampleTracks(tracks, fps)).toThrow(/fps must be a finite number > 0/);
    }
  });

  it('frameCount = ceil(durationMs/1000 · fps); last frame exactly at durationMs', () => {
    const tracks = [track('a', [key(0, 0), key(4000, 360)])];
    const { frames, durationMs } = sampleTracks(tracks, 30);
    // ceil(4000/1000 · 30) = 120
    expect(durationMs).toBe(4000);
    expect(frames).toHaveLength(120);
    expect(frames[0].tMs).toBe(0);
    expect(frames[119].tMs).toBe(4000);
    // frame i at durationMs·i/(frameCount−1)
    expect(frames[1].tMs).toBe((4000 * 1) / 119);
  });

  it('last frame tMs === durationMs exactly even when the fraction would drift', () => {
    // 1001/1000·30 = 30.03 → ceil = 31 frames; 1001·30/30 has no drift by
    // construction (the implementation assigns durationMs directly).
    const tracks = [track('a', [key(0, 0), key(1001, 1)])];
    const { frames } = sampleTracks(tracks, 30);
    expect(frames).toHaveLength(31);
    expect(frames[30].tMs).toBe(1001);
  });

  it('applies the max(2, ...) floor for tiny durations', () => {
    // ceil(10/1000 · 30) = 1 → floored to 2 frames at tMs 0 and 10.
    const tracks = [track('a', [key(0, 0), key(10, 1)])];
    const { frames, durationMs } = sampleTracks(tracks, 30);
    expect(durationMs).toBe(10);
    expect(frames).toHaveLength(2);
    expect(frames[0].tMs).toBe(0);
    expect(frames[1].tMs).toBe(10);
  });

  it('durationMs=0 (all keys at zero) yields two frames both at tMs 0', () => {
    const tracks = [track('a', [key(0, 5)])];
    const { frames, durationMs } = sampleTracks(tracks, 30);
    expect(durationMs).toBe(0);
    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual({ tMs: 0, values: { a: 5 } });
    expect(frames[1]).toEqual({ tMs: 0, values: { a: 5 } });
  });

  it('merges multi-track values at shared timestamps', () => {
    const tracks = [
      track('a', [key(0, 0), key(1000, 10)]),
      track('b', [key(0, 100), key(1000, 200, 'easeIn')]),
    ];
    const { frames } = sampleTracks(tracks, 2); // ceil(2) = 2 frames: 0, 1000
    expect(frames).toHaveLength(2);
    expect(frames[0].values).toEqual({ a: 0, b: 100 });
    expect(frames[1].values).toEqual({ a: 10, b: 200 });
  });

  it('a track whose keyed span misses a frame still contributes its held value', () => {
    // durationMs = 4000 comes from 'a'; 'b' is keyed only on [1000, 2000].
    const tracks = [
      track('a', [key(0, 0), key(4000, 40)]),
      track('b', [key(1000, 5), key(2000, 9)]),
    ];
    const { frames, durationMs } = sampleTracks(tracks, 1); // ceil(4) = 4 frames
    expect(durationMs).toBe(4000);
    expect(frames).toHaveLength(4);
    // Frame 0 at tMs 0: before b's first key → hold at 5.
    expect(frames[0].values).toEqual({ a: 0, b: 5 });
    // Frame 3 at tMs 4000: after b's last key → hold at 9.
    expect(frames[3].values).toEqual({ a: 40, b: 9 });
  });
});

describe('keyframeSampleSet', () => {
  it('emits every key atMs plus adjacent-pair midpoints, sorted', () => {
    const tracks = [track('a', [key(0, 0), key(1000, 1), key(3000, 2)])];
    // Keys 0, 1000, 3000; midpoints 500, 2000.
    expect(keyframeSampleSet(tracks)).toEqual([0, 500, 1000, 2000, 3000]);
  });

  it('dedupes exact-equal samples across tracks and stays sorted', () => {
    const tracks = [
      track('a', [key(0, 0), key(1000, 1), key(3000, 2)]),
      track('b', [key(1000, 0), key(2000, 1)]), // 1000 dup; midpoint 1500; 2000 dup with a's midpoint
    ];
    expect(keyframeSampleSet(tracks)).toEqual([0, 500, 1000, 1500, 2000, 3000]);
  });

  it('single-key track contributes its atMs and no midpoint', () => {
    expect(keyframeSampleSet([track('a', [key(250, 7)])])).toEqual([250]);
    const mixed = [track('a', [key(250, 7)]), track('b', [key(0, 0), key(100, 1)])];
    expect(keyframeSampleSet(mixed)).toEqual([0, 50, 100, 250]);
  });

  it('returns an empty set for no tracks', () => {
    expect(keyframeSampleSet([])).toEqual([]);
  });
});
