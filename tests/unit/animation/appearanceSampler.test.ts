// tests/unit/animation/appearanceSampler.test.ts
//
// Colour keyframe sampling: per-component 8-bit sRGB interpolation through the
// shared easeProgress contract, rounded; hold-clamp outside the keyed span.

import { describe, it, expect } from 'vitest';
import type { NormalizedAnimationAppearanceTrack } from '../../../src/shared/intent/animationViewRecord';
import { sampleAppearanceTrackAt, sampleTracks } from '../../../src/modeling/animation/animationSampler';

const ramp: NormalizedAnimationAppearanceTrack = {
  target: 'led',
  channel: 'emissive',
  keys: [
    { atMs: 100, value: '#000000', ease: 'linear' },
    { atMs: 300, value: '#ff8040', ease: 'linear' },
    { atMs: 500, value: '#ff8040', ease: 'step' },
    { atMs: 600, value: '#0000ff', ease: 'step' },
  ],
};

describe('sampleAppearanceTrackAt', () => {
  it('holds the first colour before the first key and the last after', () => {
    expect(sampleAppearanceTrackAt(ramp, 0)).toBe('#000000');
    expect(sampleAppearanceTrackAt(ramp, 10_000)).toBe('#0000ff');
  });

  it('returns exact key colours at key times', () => {
    expect(sampleAppearanceTrackAt(ramp, 300)).toBe('#ff8040');
  });

  it('interpolates each component and rounds', () => {
    // u = 0.5: 255*0.5=127.5→128 (0x80), 128*0.5=64 (0x40), 64*0.5=32 (0x20)
    expect(sampleAppearanceTrackAt(ramp, 200)).toBe('#804020');
  });

  it('step holds the previous colour until the key', () => {
    expect(sampleAppearanceTrackAt(ramp, 599)).toBe('#ff8040');
    expect(sampleAppearanceTrackAt(ramp, 600)).toBe('#0000ff');
  });

  it('applies the segment-ending ease', () => {
    const eased: NormalizedAnimationAppearanceTrack = {
      target: 'x', channel: 'color',
      keys: [{ atMs: 0, value: '#000000', ease: 'linear' }, { atMs: 100, value: '#ffffff', ease: 'easeIn' }],
    };
    // easeIn(0.5) = 0.125 → 255*0.125 = 31.875 → 32 (0x20)
    expect(sampleAppearanceTrackAt(eased, 50)).toBe('#202020');
  });
});

describe('sampleTracks with appearance tracks', () => {
  it('spans the appearance duration and attaches per-frame colours', () => {
    const { frames, durationMs } = sampleTracks([], 10, [ramp]);
    expect(durationMs).toBe(600);
    expect(frames).toHaveLength(6);
    expect(frames[0].values).toEqual({});
    expect(frames[0].appearance).toEqual([{ target: 'led', channel: 'emissive', value: '#000000' }]);
    expect(frames[frames.length - 1].appearance).toEqual([{ target: 'led', channel: 'emissive', value: '#0000ff' }]);
  });

  it('leaves frames without an appearance field when there are no appearance tracks', () => {
    const { frames } = sampleTracks([{ param: 'p', keys: [{ atMs: 0, value: 0, ease: 'linear' }, { atMs: 100, value: 1, ease: 'linear' }] }], 30);
    expect('appearance' in frames[0]).toBe(false);
  });
});
