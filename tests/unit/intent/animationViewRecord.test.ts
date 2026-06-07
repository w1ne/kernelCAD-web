// tests/unit/intent/animationViewRecord.test.ts
//
// Normalization of the two animationView() author-surface forms into the
// stored track-shape metadata: legacy sweep → one linear two-key track,
// keyframe tracks → keys sorted by atMs with ease defaulted, durationMs =
// max atMs across all tracks. Validation/clamping live in captureSession
// and are covered by tests/unit/capture/animationView.test.ts.

import { describe, it, expect } from 'vitest';
import {
  ANIMATION_EASES,
  isAnimationViewTracksSpec,
  normalizeAnimationView,
  type AnimationViewHandle,
  type AnimationViewMetadata,
  type AnimationViewSpec,
} from '../../../src/shared/intent/animationViewRecord';

describe('isAnimationViewTracksSpec', () => {
  it('discriminates track form from legacy sweep form', () => {
    expect(isAnimationViewTracksSpec({ param: 'a', from: 0, to: 1, durationMs: 100 })).toBe(false);
    expect(isAnimationViewTracksSpec({ tracks: [{ param: 'a', keys: [{ atMs: 0, value: 0 }] }] })).toBe(true);
  });
});

describe('normalizeAnimationView — legacy sweep form', () => {
  it('normalizes to a single linear two-key track', () => {
    const m = normalizeAnimationView({ param: 'driveAngleDeg', from: 0, to: 360, durationMs: 4000 });
    expect(m).toEqual({
      tracks: [{
        param: 'driveAngleDeg',
        keys: [
          { atMs: 0, value: 0, ease: 'linear' },
          { atMs: 4000, value: 360, ease: 'linear' },
        ],
      }],
      fps: 30,
      durationMs: 4000,
      virtual: true,
    });
  });

  it('respects the spec fps and an explicit fps override', () => {
    const spec: AnimationViewSpec = { param: 'a', from: 1, to: 2, durationMs: 1000, fps: 60 };
    expect(normalizeAnimationView(spec).fps).toBe(60);
    expect(normalizeAnimationView(spec, 24).fps).toBe(24);
  });
});

describe('normalizeAnimationView — keyframe-track form', () => {
  it('sorts keys by atMs, defaults ease to linear, durationMs = max atMs across tracks', () => {
    const m = normalizeAnimationView({
      name: 'dispense cycle',
      tracks: [
        {
          param: 'drumAngleDeg',
          keys: [
            { atMs: 800, value: 60, ease: 'easeInOut' },
            { atMs: 0, value: 0 },
          ],
        },
        {
          param: 'meterSwingDeg',
          keys: [
            { atMs: 1400, value: 35 },
            { atMs: 800, value: 0, ease: 'step' },
          ],
        },
      ],
    });
    expect(m.name).toBe('dispense cycle');
    expect(m.durationMs).toBe(1400);
    expect(m.fps).toBe(30);
    expect(m.virtual).toBe(true);
    expect(m.tracks).toEqual([
      {
        param: 'drumAngleDeg',
        keys: [
          { atMs: 0, value: 0, ease: 'linear' },
          { atMs: 800, value: 60, ease: 'easeInOut' },
        ],
      },
      {
        param: 'meterSwingDeg',
        keys: [
          { atMs: 800, value: 0, ease: 'step' },
          { atMs: 1400, value: 35, ease: 'linear' },
        ],
      },
    ]);
  });

  it('omits name when not authored', () => {
    const m = normalizeAnimationView({ tracks: [{ param: 'a', keys: [{ atMs: 500, value: 1 }] }] });
    expect('name' in m).toBe(false);
    expect(m.durationMs).toBe(500);
  });

  it('does not mutate the author-supplied keys array', () => {
    const keys = [{ atMs: 100, value: 1 }, { atMs: 0, value: 0 }];
    normalizeAnimationView({ tracks: [{ param: 'a', keys }] });
    expect(keys[0].atMs).toBe(100);
  });
});

describe('animationView record types', () => {
  it('exposes the five eases', () => {
    expect([...ANIMATION_EASES]).toEqual(['linear', 'step', 'easeIn', 'easeOut', 'easeInOut']);
  });

  it('AnimationViewHandle carries id + normalized metadata shape', () => {
    const metadata: AnimationViewMetadata = {
      tracks: [{ param: 'a', keys: [{ atMs: 0, value: 0, ease: 'linear' }] }],
      fps: 30,
      durationMs: 0,
      virtual: true,
    };
    const handle: AnimationViewHandle = { id: 'animationView_1', metadata };
    expect(handle.metadata.virtual).toBe(true);
    expect(handle.metadata.tracks[0].keys[0].ease).toBe('linear');
  });
});
