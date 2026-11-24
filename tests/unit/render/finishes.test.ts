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
  it('has the curated finish vocabulary', () => {
    // 22 mechanical/glass finishes plus 11 PCB / electronics finishes.
    expect(FINISH_TOKENS.length).toBe(33);
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

  it('PCB and electronics finishes are physically calibrated', () => {
    for (const mask of ['pcb-green', 'pcb-black', 'pcb-blue', 'pcb-red', 'pcb-white'] as const) {
      const pbr = expandFinish(mask);
      expect(pbr.clearcoat, mask).toBeGreaterThanOrEqual(0.4);
      expect(pbr.clearcoat, mask).toBeLessThanOrEqual(0.45);
      expect(pbr.metalness, mask).toBe(0);
    }
    for (const metal of ['pcb-copper', 'gold-enig', 'solder'] as const) {
      const pbr = expandFinish(metal);
      expect(pbr.metalness, metal).toBe(1);
      expect(pbr.roughness, metal).toBeGreaterThanOrEqual(0.18);
      expect(pbr.roughness, metal).toBeLessThanOrEqual(0.22);
    }
    expect(expandFinish('ic-epoxy')).toMatchObject({ baseColor: '#23272e', roughness: 0.62, metalness: 0 });
    expect(expandFinish('silkscreen')).toMatchObject({ baseColor: '#f4f5f2', roughness: 0.58 });
    expect(expandFinish('fr4').baseColor).toBe('#b7a469');
  });

  it('glass finishes transmit and refract with crisp speculars', () => {
    for (const token of ['glass', 'glass-tinted', 'acrylic'] as const) {
      const pbr = expandFinish(token);
      expect(pbr.transmission, token).toBeGreaterThan(0.85);
      expect(pbr.clearcoat, token).toBeGreaterThanOrEqual(0.9);
      expect(pbr.roughness, token).toBeLessThanOrEqual(0.05);
      expect(pbr.ior, token).toBeGreaterThanOrEqual(1.49);
    }
    expect(expandFinish('glass-tinted')).toMatchObject({
      attenuationColor: '#2d3f5e',
      attenuationDistance: 8,
      thickness: 3,
    });
  });
});
