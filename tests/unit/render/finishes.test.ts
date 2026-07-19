// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The finish table is the front door for appearance. These tests hold three
// promises: every token resolves to a valid PBR record, an unknown name fails
// LOUDLY (names the token, lists the valid ones — never a silent default), and
// the hue override actually overrides.

import { describe, it, expect } from 'vitest';
import {
  FINISHES,
  FINISH_TOKENS,
  isFinishToken,
  expandFinish,
} from '../../../src/shared/render/finishes';
import { isPBRMaterial } from '../../../src/shared/intent/material';
import { isKernelError } from '../../../src/shared/intent/kernelError';

describe('finish table', () => {
  it('has the curated 22-entry vocabulary', () => {
    // A ceiling, not a floor — the proposal caps the default library at ~22.
    expect(FINISH_TOKENS.length).toBe(22);
  });

  it('every finish resolves to a valid PBR record', () => {
    for (const token of FINISH_TOKENS) {
      const pbr = expandFinish(token);
      expect(isPBRMaterial(pbr), `${token} is not a PBRMaterial`).toBe(true);
      // baseColor is required and non-empty.
      expect(typeof pbr.baseColor).toBe('string');
      expect(pbr.baseColor.length).toBeGreaterThan(0);
      // Every numeric field the table sets must be finite and in-range, so it
      // flows through .material()'s clamp without a warning.
      const inUnit = (v: number | undefined) => v === undefined || (Number.isFinite(v) && v >= 0 && v <= 1);
      expect(inUnit(pbr.metalness), `${token}.metalness out of [0,1]`).toBe(true);
      expect(inUnit(pbr.roughness), `${token}.roughness out of [0,1]`).toBe(true);
      expect(inUnit(pbr.clearcoat), `${token}.clearcoat out of [0,1]`).toBe(true);
      expect(inUnit(pbr.transmission), `${token}.transmission out of [0,1]`).toBe(true);
      expect(inUnit(pbr.anisotropy), `${token}.anisotropy out of [0,1]`).toBe(true);
      if (pbr.ior !== undefined) {
        expect(pbr.ior).toBeGreaterThanOrEqual(1.0);
        expect(pbr.ior).toBeLessThanOrEqual(2.5);
      }
    }
  });

  it('returns a fresh copy — the shared table entry is never mutated', () => {
    const a = expandFinish('brass', { color: '#ff0000' });
    expect(a.baseColor).toBe('#ff0000');
    // The table's brass keeps its own colour.
    expect(FINISHES.brass.baseColor).toBe('#c8a24a');
    expect(expandFinish('brass').baseColor).toBe('#c8a24a');
  });

  it('the hue override replaces baseColor and keeps the surface character', () => {
    const abs = expandFinish('abs');
    const red = expandFinish('abs', { color: '#c0392b' });
    expect(red.baseColor).toBe('#c0392b');
    // Surface (roughness/metalness) is unchanged by the hue override.
    expect(red.roughness).toBe(abs.roughness);
    expect(red.metalness).toBe(abs.metalness);
  });

  it('an unknown finish throws a clear, listing diagnostic — no silent default', () => {
    let thrown: unknown;
    try {
      expandFinish('anodised-black'); // British spelling; deliberately not a token
    } catch (e) {
      thrown = e;
    }
    expect(isKernelError(thrown)).toBe(true);
    if (isKernelError(thrown)) {
      expect(thrown.code).toBe('feature.finish.unknown-token');
      // Names the offending token...
      expect(thrown.message).toContain('anodised-black');
      // ...and lists valid finishes so the author can fix it without guessing.
      expect(thrown.message).toContain('brass');
      expect(thrown.message).toContain('anodized-black');
    }
    // It must NOT quietly return the 'default' finish.
    expect(() => expandFinish('nope')).toThrow();
  });

  it('isFinishToken is a precise guard', () => {
    expect(isFinishToken('brass')).toBe(true);
    expect(isFinishToken('anodized-black')).toBe(true);
    expect(isFinishToken('anodised')).toBe(false);
    expect(isFinishToken('')).toBe(false);
    expect(isFinishToken(undefined)).toBe(false);
    // Not fooled by Object.prototype members.
    expect(isFinishToken('toString')).toBe(false);
    expect(isFinishToken('constructor')).toBe(false);
  });
});
