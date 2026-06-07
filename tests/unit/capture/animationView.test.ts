// tests/unit/capture/animationView.test.ts
//
// Agent-animation Task 1: animationView() capture-side validation +
// normalization. Both author-surface forms (legacy sweep, keyframe tracks)
// always store track-shape metadata. New animation.* error conditions THROW
// KernelError (the dfmSpec precedent — stashed virtual-record diagnostics
// never reach evaluate); warns (range clamp, shadowed record) are stashed on
// metadata.diagnostics with a record still produced. The legacy form keeps
// its historic stash-on-metadata feature.invalid-args behavior for malformed
// param/from/to/durationMs.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';
import type { AnimationViewMetadata } from '../../../src/shared/intent/animationViewRecord';

type MetaWithDiagnostics = AnimationViewMetadata & { diagnostics?: CompilerDiagnostic[] };

function makeApi() {
  const session = new CaptureSession();
  return { session, api: createApi({ session }) };
}

function lastMeta(session: CaptureSession): MetaWithDiagnostics {
  const records = session.getRecords().filter((r) => r.kind === 'animationView');
  expect(records.length).toBeGreaterThan(0);
  return records[records.length - 1].metadata as unknown as MetaWithDiagnostics;
}

function expectThrowCode(fn: () => unknown, code: string, msgRe: RegExp) {
  expect(fn).toThrow(KernelError);
  try { fn(); }
  catch (e) {
    expect((e as KernelError).code).toBe(code);
    expect((e as KernelError).message).toMatch(msgRe);
    expect((e as KernelError).hint ?? '').not.toBe('');
  }
}

describe('animationView capture — happy paths', () => {
  it('legacy sweep registers normalized track-shape metadata (no diagnostics)', () => {
    const { session, api } = makeApi();
    api.param('driveAngleDeg', 90, { min: 0, max: 360 });
    const handle = api.animationView({ param: 'driveAngleDeg', from: 0, to: 360, durationMs: 4000, fps: 30 });
    const meta = lastMeta(session);
    expect(handle.id).toMatch(/^animationView_/);
    expect(handle.metadata).toEqual(meta);
    expect(meta.diagnostics).toBeUndefined();
    expect(meta).toEqual({
      virtual: true,
      fps: 30,
      durationMs: 4000,
      tracks: [{
        param: 'driveAngleDeg',
        keys: [
          { atMs: 0, value: 0, ease: 'linear' },
          { atMs: 4000, value: 360, ease: 'linear' },
        ],
      }],
    });
  });

  it('keyframe-track form registers sorted, ease-defaulted tracks with durationMs = max atMs', () => {
    const { session, api } = makeApi();
    api.param('drumAngleDeg', 0);
    api.param('meterSwingDeg', 0);
    api.animationView({
      name: 'dispense cycle',
      tracks: [
        { param: 'drumAngleDeg', keys: [{ atMs: 800, value: 60, ease: 'easeInOut' }, { atMs: 0, value: 0 }] },
        { param: 'meterSwingDeg', keys: [{ atMs: 1400, value: 35 }, { atMs: 800, value: 0 }] },
      ],
      fps: 60,
    });
    const meta = lastMeta(session);
    expect(meta.diagnostics).toBeUndefined();
    expect(meta.name).toBe('dispense cycle');
    expect(meta.fps).toBe(60);
    expect(meta.durationMs).toBe(1400);
    expect(meta.tracks).toEqual([
      { param: 'drumAngleDeg', keys: [{ atMs: 0, value: 0, ease: 'linear' }, { atMs: 800, value: 60, ease: 'easeInOut' }] },
      { param: 'meterSwingDeg', keys: [{ atMs: 800, value: 0, ease: 'linear' }, { atMs: 1400, value: 35, ease: 'linear' }] },
    ]);
  });
});

describe('animationView capture — animation.param.unknown', () => {
  it('throws for a track naming an undeclared param', () => {
    const { api } = makeApi();
    api.param('declared', 0);
    expectThrowCode(
      () => api.animationView({ tracks: [{ param: 'ghost', keys: [{ atMs: 0, value: 0 }] }] }),
      'animation.param.unknown',
      /tracks\[0\]\.param.*"ghost".*not declared/,
    );
  });

  it('throws for the legacy form naming an undeclared param', () => {
    const { api } = makeApi();
    expectThrowCode(
      () => api.animationView({ param: 'ghost', from: 0, to: 1, durationMs: 1000 }),
      'animation.param.unknown',
      /"ghost".*not declared/,
    );
  });

  it('throws for a track targeting a boolean param, naming the declared type', () => {
    const { api } = makeApi();
    api.param('mirrored', true);
    expectThrowCode(
      () => api.animationView({ tracks: [{ param: 'mirrored', keys: [{ atMs: 0, value: 0 }] }] }),
      'animation.param.unknown',
      /'mirrored'.*declared as boolean.*require numeric/,
    );
  });

  it('throws for the legacy form targeting a boolean param, naming the declared type', () => {
    const { api } = makeApi();
    api.param('mirrored', false);
    expectThrowCode(
      () => api.animationView({ param: 'mirrored', from: 0, to: 1, durationMs: 1000 }),
      'animation.param.unknown',
      /'mirrored'.*declared as boolean.*require numeric/,
    );
  });
});

describe('animationView capture — animation.track.duplicate-param', () => {
  it('throws when two tracks animate the same param', () => {
    const { api } = makeApi();
    api.param('angle', 0);
    expectThrowCode(
      () => api.animationView({
        tracks: [
          { param: 'angle', keys: [{ atMs: 0, value: 0 }] },
          { param: 'angle', keys: [{ atMs: 100, value: 1 }] },
        ],
      }),
      'animation.track.duplicate-param',
      /tracks\[1\].*'angle'.*already animates/,
    );
  });
});

describe('animationView capture — animation.keys.invalid', () => {
  function apiWithParam() {
    const { api } = makeApi();
    api.param('angle', 0);
    return api;
  }

  it('throws for an empty tracks array', () => {
    expectThrowCode(
      () => apiWithParam().animationView({ tracks: [] }),
      'animation.keys.invalid',
      /'tracks' must be a non-empty array/,
    );
  });

  it('throws for a track with an empty keys array', () => {
    expectThrowCode(
      () => apiWithParam().animationView({ tracks: [{ param: 'angle', keys: [] }] }),
      'animation.keys.invalid',
      /tracks\[0\].*empty keys array/,
    );
  });

  it('throws for non-finite atMs and non-finite value', () => {
    expectThrowCode(
      () => apiWithParam().animationView({ tracks: [{ param: 'angle', keys: [{ atMs: NaN, value: 0 }] }] }),
      'animation.keys.invalid',
      /keys\[0\].*finite/,
    );
    expectThrowCode(
      () => apiWithParam().animationView({ tracks: [{ param: 'angle', keys: [{ atMs: 0, value: Infinity }] }] }),
      'animation.keys.invalid',
      /keys\[0\].*finite/,
    );
  });

  it('throws for a negative atMs', () => {
    expectThrowCode(
      () => apiWithParam().animationView({ tracks: [{ param: 'angle', keys: [{ atMs: -1, value: 0 }] }] }),
      'animation.keys.invalid',
      /atMs must be >= 0/,
    );
  });

  it('throws for duplicate atMs within a track', () => {
    expectThrowCode(
      () => apiWithParam().animationView({
        tracks: [{ param: 'angle', keys: [{ atMs: 100, value: 0 }, { atMs: 100, value: 1 }] }],
      }),
      'animation.keys.invalid',
      /duplicate atMs 100/,
    );
  });

  it('throws for an unknown ease string', () => {
    expectThrowCode(
      () => apiWithParam().animationView({
        tracks: [{ param: 'angle', keys: [{ atMs: 0, value: 0, ease: 'bounce' as never }] }],
      }),
      'animation.keys.invalid',
      /unknown ease "bounce"/,
    );
  });
});

describe('animationView capture — animation.value.clamped warn', () => {
  it('clamps track key values to the declared param range and warns', () => {
    const { session, api } = makeApi();
    api.param('angle', 0, { min: 0, max: 90 });
    api.animationView({
      tracks: [{ param: 'angle', keys: [{ atMs: 0, value: -10 }, { atMs: 500, value: 120 }] }],
    });
    const meta = lastMeta(session);
    expect(meta.tracks[0].keys.map((k) => k.value)).toEqual([0, 90]);
    const clampWarns = (meta.diagnostics ?? []).filter((d) => d.code === 'animation.value.clamped');
    expect(clampWarns).toHaveLength(2);
    for (const d of clampWarns) {
      expect(d.severity).toBe('warn');
      expect(d.hint?.length ?? 0).toBeGreaterThan(0);
    }
    expect(clampWarns[0].message).toMatch(/'angle'.*value -10.*clamped to 0/);
  });

  it('clamps legacy from/to values to the declared range and warns', () => {
    const { session, api } = makeApi();
    api.param('angle', 0, { min: 0, max: 180 });
    api.animationView({ param: 'angle', from: -45, to: 360, durationMs: 1000 });
    const meta = lastMeta(session);
    expect(meta.tracks[0].keys.map((k) => k.value)).toEqual([0, 180]);
    expect((meta.diagnostics ?? []).filter((d) => d.code === 'animation.value.clamped')).toHaveLength(2);
  });

  it('does not warn for an unbounded param', () => {
    const { session, api } = makeApi();
    api.param('angle', 0);
    api.animationView({ tracks: [{ param: 'angle', keys: [{ atMs: 0, value: 1e6 }] }] });
    expect(lastMeta(session).diagnostics).toBeUndefined();
  });

  it('does not warn for key values exactly AT the declared min and max', () => {
    const { session, api } = makeApi();
    api.param('angle', 0, { min: 0, max: 90 });
    api.animationView({
      tracks: [{ param: 'angle', keys: [{ atMs: 0, value: 0 }, { atMs: 500, value: 90 }] }],
    });
    const meta = lastMeta(session);
    expect(meta.tracks[0].keys.map((k) => k.value)).toEqual([0, 90]);
    expect(meta.diagnostics).toBeUndefined();
  });
});

describe('animationView capture — animation.view.shadowed warn (last-wins)', () => {
  it('warns on the later record naming the shadowed record ids', () => {
    const { session, api } = makeApi();
    api.param('angle', 0);
    const first = api.animationView({ param: 'angle', from: 0, to: 1, durationMs: 1000 });
    const second = api.animationView({ tracks: [{ param: 'angle', keys: [{ atMs: 0, value: 0 }, { atMs: 500, value: 1 }] }] });
    const records = session.getRecords().filter((r) => r.kind === 'animationView');
    expect(records.map((r) => r.id)).toEqual([first.id, second.id]);
    const firstMeta = records[0].metadata as unknown as MetaWithDiagnostics;
    expect(firstMeta.diagnostics).toBeUndefined();
    const shadowWarns = (second.metadata as MetaWithDiagnostics).diagnostics?.filter(
      (d) => d.code === 'animation.view.shadowed',
    );
    expect(shadowWarns).toHaveLength(1);
    expect(shadowWarns![0].severity).toBe('warn');
    expect(shadowWarns![0].message).toContain(first.id);
  });

  it('third stacked call warns naming BOTH prior record ids', () => {
    const { api } = makeApi();
    api.param('angle', 0);
    const first = api.animationView({ param: 'angle', from: 0, to: 1, durationMs: 1000 });
    const second = api.animationView({ param: 'angle', from: 1, to: 0, durationMs: 1000 });
    const third = api.animationView({
      tracks: [{ param: 'angle', keys: [{ atMs: 0, value: 0 }, { atMs: 500, value: 1 }] }],
    });
    const shadowWarns = (third.metadata as MetaWithDiagnostics).diagnostics?.filter(
      (d) => d.code === 'animation.view.shadowed',
    );
    expect(shadowWarns).toHaveLength(1);
    expect(shadowWarns![0].message).toContain(first.id);
    expect(shadowWarns![0].message).toContain(second.id);
  });
});

describe('animationView capture — legacy stash-on-metadata behavior retained', () => {
  it('stashes feature.invalid-args for an empty param and still registers a default-safe record', () => {
    const { session, api } = makeApi();
    api.animationView({ param: '', from: 0, to: 1, durationMs: 1000 });
    const meta = lastMeta(session);
    expect(meta.tracks).toEqual([{
      param: '',
      keys: [{ atMs: 0, value: 0, ease: 'linear' }, { atMs: 1000, value: 1, ease: 'linear' }],
    }]);
    const errs = (meta.diagnostics ?? []).filter((d) => d.code === 'feature.invalid-args');
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toMatch(/'param' must be a non-empty string/);
  });

  it('stashes feature.invalid-args for non-finite from/to and bad durationMs with safe defaults', () => {
    const { session, api } = makeApi();
    api.param('angle', 0);
    api.animationView({ param: 'angle', from: NaN, to: 1, durationMs: -5 });
    const meta = lastMeta(session);
    expect(meta.durationMs).toBe(1000);
    expect(meta.tracks[0].keys).toEqual([
      { atMs: 0, value: 0, ease: 'linear' }, // non-finite from → default 0
      { atMs: 1000, value: 1, ease: 'linear' }, // finite to kept
    ]);
    const codes = (meta.diagnostics ?? []).map((d) => d.code);
    expect(codes.filter((c) => c === 'feature.invalid-args')).toHaveLength(2);
  });

  it('warns and defaults fps to 30 for a non-positive fps (both forms)', () => {
    const { session, api } = makeApi();
    api.param('angle', 0);
    api.animationView({ param: 'angle', from: 0, to: 1, durationMs: 1000, fps: -2 });
    const legacyMeta = lastMeta(session);
    expect(legacyMeta.fps).toBe(30);
    expect((legacyMeta.diagnostics ?? []).some((d) => d.severity === 'warn' && /fps/.test(d.message))).toBe(true);

    const fresh = makeApi();
    fresh.api.param('angle', 0);
    fresh.api.animationView({ tracks: [{ param: 'angle', keys: [{ atMs: 0, value: 0 }] }], fps: 0 });
    const trackMeta = lastMeta(fresh.session);
    expect(trackMeta.fps).toBe(30);
    expect((trackMeta.diagnostics ?? []).some((d) => d.severity === 'warn' && /fps/.test(d.message))).toBe(true);
  });

  it('accepts a fractional fps (29.97) without a warn', () => {
    const { session, api } = makeApi();
    api.param('angle', 0);
    api.animationView({
      tracks: [{ param: 'angle', keys: [{ atMs: 0, value: 0 }, { atMs: 500, value: 1 }] }],
      fps: 29.97,
    });
    const meta = lastMeta(session);
    expect(meta.fps).toBe(29.97);
    expect(meta.diagnostics).toBeUndefined();
  });
});
