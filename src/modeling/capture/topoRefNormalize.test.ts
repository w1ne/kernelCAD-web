// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { normalizeTopoRefOrString } from './topoRefNormalize';

describe('normalizeTopoRefOrString — F-surface F3 input acceptance', () => {
  it('normalises @kc[owner/face/top] into { face: "top" } for face selectors', () => {
    const r = normalizeTopoRefOrString('@kc[base/face/top]', 'face');
    expect(r).toEqual({ face: 'top' });
  });

  it('normalises @kc[owner/face/myLabel] for labeled faces', () => {
    const r = normalizeTopoRefOrString('@kc[base/face/lid]', 'face');
    expect(r).toEqual({ face: 'lid' });
  });

  it('passes through a non-@kc bare-string as the canonical-face shorthand', () => {
    const r = normalizeTopoRefOrString('top', 'face');
    expect(r).toEqual({ face: 'top' });
  });

  it('throws on a malformed @kc string', () => {
    expect(() => normalizeTopoRefOrString('@kc[1bad/face/top]', 'face')).toThrow();
  });

  it('throws when the kind segment disagrees with the requested kind', () => {
    expect(() => normalizeTopoRefOrString('@kc[base/edge/top]', 'face')).toThrow();
  });

  it('returns the edge-name when called with kind="edge"', () => {
    const r = normalizeTopoRefOrString('@kc[base/edge/top-front]', 'edge');
    expect(r).toEqual({ edge: 'top-front' });
  });

  it('returns { connector, ownerPart } for connector refs', () => {
    const r = normalizeTopoRefOrString('@kc[arm/connector/flange]', 'connector');
    expect(r).toEqual({ connector: 'flange', ownerPart: 'arm' });
  });

  it('throws on a bare-string connector ref (no dot-form acceptance via this helper)', () => {
    expect(() => normalizeTopoRefOrString('arm.flange', 'connector')).toThrow();
  });
});
