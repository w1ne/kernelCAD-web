// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `.finish()` is sugar over `.material()`: it must write the IDENTICAL
// metadata.material record so the renderer and every exporter consume it with
// no downstream branch. These tests pin that equivalence, the hue override, the
// per-face routing, and the loud failure on a bad name.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { expandFinish } from '../../../src/shared/render/finishes';

function materialOf(session: CaptureSession, id: string): unknown {
  return session.getRecords().find((r) => r.id === id)!.metadata?.material;
}

describe('Shape.finish()', () => {
  it('writes the same record shape as the equivalent .material() call', () => {
    // Build the same appearance two ways: named finish vs the raw PBR the
    // finish expands to. The stored records must be byte-equal.
    const sf = new CaptureSession();
    const kf = createApi({ session: sf });
    const finished = kf.box(10, 10, 10).finish('anodized-black');

    const sm = new CaptureSession();
    const km = createApi({ session: sm });
    const manual = km.box(10, 10, 10).material(expandFinish('anodized-black'));

    expect(materialOf(sf, finished.id)).toEqual(materialOf(sm, manual.id));
  });

  it('is chainable and returns the same Shape', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    expect(s.finish('brass')).toBe(s);
    expect(materialOf(session, s.id)).toEqual({
      baseColor: '#c8a24a',
      metalness: 1.0,
      roughness: 0.35,
    });
  });

  it('applies a hue override while keeping the finish surface', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10).finish('abs', { color: '#c0392b' });
    expect(materialOf(session, s.id)).toEqual({
      baseColor: '#c0392b', // overridden
      metalness: 0.0,
      roughness: 0.55, // ABS surface, unchanged
    });
  });

  it('routes { face } to per-face material, same plumbing as .material({ face })', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10, false, { faceLabels: { ring: 'top' } });
    s.finish('brass', { face: 'ring' });
    const record = session.getRecords().find((r) => r.id === s.id)!;
    const byLabel = record.metadata?.materialByLabel as Record<string, unknown>;
    expect(byLabel.ring).toEqual({ baseColor: '#c8a24a', metalness: 1.0, roughness: 0.35 });
    // Whole-shape default is untouched by a per-face call.
    expect(record.metadata?.material).toBeUndefined();
  });

  it('a PBR record from .finish() overrides a prior .color() hue on the same leaf', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10).color('#aabbcc').finish('brass');
    const record = session.getRecords().find((r) => r.id === s.id)!;
    // Both slots exist; pbrFromMetadata prioritises metadata.material.
    expect(record.metadata?.color).toBe('#aabbcc');
    expect((record.metadata?.material as { baseColor: string }).baseColor).toBe('#c8a24a');
  });

  it('throws feature.finish.unknown-token on a bad name — no silent default', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const s = kcad.box(10, 10, 10);
    expect(() => s.finish('anodised-black' as never)).toThrow(/not a known finish/);
    // Nothing was written.
    expect(materialOf(session, s.id)).toBeUndefined();
  });
});
