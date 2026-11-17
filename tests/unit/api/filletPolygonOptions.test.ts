// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// filletPolygon rejects a misplaced, unknown or non-finite option instead of
// dropping it: `filletPolygon(pts, 4, 16)` and `{ segs: 16 }` used to return
// the default 8 samples per corner, and `{ segments: NaN }` silently turned
// every rounded corner into a chamfer.
import { describe, expect, it } from 'vitest';
import { filletPolygon } from '../../../src/modeling/apiPolygonMethods';
import { KernelError } from '../../../src/shared/intent/kernelError';

const RECT: [number, number][] = [[0, 0], [40, 0], [40, 20], [0, 20]];

function caught(fn: () => unknown): KernelError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(KernelError);
    return e as KernelError;
  }
  throw new Error('expected a KernelError');
}

describe('filletPolygon option keys', () => {
  it.each([
    [{ segs: 16 }, 'segs'],
    [{ samples: 16 }, 'samples'],
    [{ segments: 16, radius: 2 }, 'radius'],
  ])('rejects the unknown option in %j', (opts, key) => {
    const err = caught(() => filletPolygon(RECT, 4, opts as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain(`opts.${key}`);
    expect(err.message).toContain(`unknown option '${key}'`);
  });

  it.each([16, 'segments', true])('rejects the positional opts %j', (opts) => {
    const err = caught(() => filletPolygon(RECT, 4, opts as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('not a positional argument');
  });

  it.each([NaN, Infinity, '16'])('rejects the non-finite segments %j', (segments) => {
    const err = caught(() => filletPolygon(RECT, 4, { segments } as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('opts.segments');
  });

  it('keeps the 8-sample default for undefined, null and {}', () => {
    // 4 corners × (8 + 1) points.
    expect(filletPolygon(RECT, 4)).toHaveLength(36);
    expect(filletPolygon(RECT, 4, null as never)).toHaveLength(36);
    expect(filletPolygon(RECT, 4, {})).toHaveLength(36);
  });

  it('honours an explicit segments count and its minimum of 2', () => {
    expect(filletPolygon(RECT, 4, { segments: 16 })).toHaveLength(68);
    expect(filletPolygon(RECT, 4, { segments: 1 })).toHaveLength(12);
  });
});
