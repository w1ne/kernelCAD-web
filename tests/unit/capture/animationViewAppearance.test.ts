// tests/unit/capture/animationViewAppearance.test.ts
//
// Appearance tracks on animationView(): a track names a `target` object and a
// `channel` ('color' | 'emissive') instead of a param. Normalized metadata
// keeps param tracks in `tracks` and stores appearance tracks in
// `appearanceTracks`; durationMs spans both.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { AnimationViewMetadata } from '../../../src/shared/intent/animationViewRecord';

function makeApi() {
  const session = new CaptureSession();
  return { session, api: createModelingApi({ session }) };
}

function lastMeta(session: CaptureSession): AnimationViewMetadata {
  const records = session.getRecords().filter((r) => r.kind === 'animationView');
  return records[records.length - 1].metadata as unknown as AnimationViewMetadata;
}

function expectThrowCode(fn: () => unknown, code: string, msgRe: RegExp) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(KernelError);
    expect((e as KernelError).code).toBe(code);
    expect((e as KernelError).message).toMatch(msgRe);
    return;
  }
  throw new Error('expected a throw');
}

describe('animationView appearance tracks', () => {
  it('accepts an appearance-only timeline and normalizes colours and keys', () => {
    const { session, api } = makeApi();
    api.animationView({
      name: 'chase',
      tracks: [
        { target: 'led-1', channel: 'emissive', keys: [
          { atMs: 400, value: '#000' },
          { atMs: 0, value: '#000000' },
          { atMs: 200, value: '#2BFF88', ease: 'easeOut' },
        ] },
      ],
    });
    const meta = lastMeta(session);
    expect(meta.tracks).toEqual([]);
    expect(meta.durationMs).toBe(400);
    expect(meta.appearanceTracks).toEqual([
      { target: 'led-1', channel: 'emissive', keys: [
        { atMs: 0, value: '#000000', ease: 'linear' },
        { atMs: 200, value: '#2bff88', ease: 'easeOut' },
        { atMs: 400, value: '#000000', ease: 'linear' },
      ] },
    ]);
  });

  it('mixes param and appearance tracks; durationMs spans both', () => {
    const { session, api } = makeApi();
    api.param('angle', 0, { min: 0, max: 90 });
    api.animationView({
      tracks: [
        { param: 'angle', keys: [{ atMs: 0, value: 0 }, { atMs: 1000, value: 90 }] },
        { target: 'lamp', channel: 'color', keys: [{ atMs: 0, value: '#ff0000' }, { atMs: 1500, value: '#0000ff' }] },
      ],
    });
    const meta = lastMeta(session);
    expect(meta.tracks.map((t) => t.param)).toEqual(['angle']);
    expect(meta.appearanceTracks?.map((t) => t.target)).toEqual(['lamp']);
    expect(meta.durationMs).toBe(1500);
  });

  it('omits appearanceTracks when there are none', () => {
    const { session, api } = makeApi();
    api.param('angle', 0);
    api.animationView({ tracks: [{ param: 'angle', keys: [{ atMs: 0, value: 0 }, { atMs: 10, value: 1 }] }] });
    expect('appearanceTracks' in lastMeta(session)).toBe(false);
  });

  it('rejects an unknown channel', () => {
    const { api } = makeApi();
    expectThrowCode(
      () => api.animationView({ tracks: [{ target: 'a', channel: 'glow' as never, keys: [{ atMs: 0, value: '#fff' }] }] }),
      'animation.keys.invalid',
      /channel/,
    );
  });

  it('rejects a non-hex colour value', () => {
    const { api } = makeApi();
    expectThrowCode(
      () => api.animationView({ tracks: [{ target: 'a', channel: 'color', keys: [{ atMs: 0, value: 'red' }] }] }),
      'animation.keys.invalid',
      /#rrggbb/,
    );
  });

  it('rejects an empty target', () => {
    const { api } = makeApi();
    expectThrowCode(
      () => api.animationView({ tracks: [{ target: ' ', channel: 'color', keys: [{ atMs: 0, value: '#fff' }] }] }),
      'animation.keys.invalid',
      /target/,
    );
  });

  it('rejects duplicate atMs within an appearance track', () => {
    const { api } = makeApi();
    expectThrowCode(
      () => api.animationView({ tracks: [{ target: 'a', channel: 'color', keys: [{ atMs: 0, value: '#fff' }, { atMs: 0, value: '#000' }] }] }),
      'animation.keys.invalid',
      /duplicate atMs/,
    );
  });

  it('rejects two tracks on the same target and channel', () => {
    const { api } = makeApi();
    expectThrowCode(
      () => api.animationView({ tracks: [
        { target: 'a', channel: 'color', keys: [{ atMs: 0, value: '#fff' }] },
        { target: 'a', channel: 'color', keys: [{ atMs: 5, value: '#000' }] },
      ] }),
      'animation.track.duplicate-param',
      /'a'.*color/,
    );
  });

  it('allows the same target on both channels', () => {
    const { session, api } = makeApi();
    api.animationView({ tracks: [
      { target: 'a', channel: 'color', keys: [{ atMs: 0, value: '#fff' }] },
      { target: 'a', channel: 'emissive', keys: [{ atMs: 5, value: '#000' }] },
    ] });
    expect(lastMeta(session).appearanceTracks).toHaveLength(2);
  });
});
