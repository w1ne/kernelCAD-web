// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// arm.part(name, shape, { material }) seeds BOTH a density default and a
// default finish. These tests pin the precedence rules: material seeds density
// AND appearance; an explicit `density` overrides the material's density; an
// explicit `.finish()` / `.color()` overrides the material's finish; an unknown
// material throws (no silent fallback).

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';
import { FINISHES } from '../../../../src/shared/render/finishes';
import type { PBRMaterial } from '../../../../src/shared/intent/material';

describe('arm.part(name, shape, { material })', () => {
  beforeAll(async () => { await initOcct(); });

  function makeArm() {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    return { session, kcad, arm };
  }

  const materialOf = (session: CaptureSession, id: string): PBRMaterial | undefined =>
    session.getRecords().find((r) => r.id === id)?.metadata?.material;
  const colorOf = (session: CaptureSession, id: string): string | undefined =>
    session.getRecords().find((r) => r.id === id)?.metadata?.color as string | undefined;

  it('seeds the density from the material catalog (steel → 7850)', () => {
    const { kcad, arm } = makeArm();
    arm.part('hub', kcad.box(10, 10, 10), { material: 'steel' });
    expect(arm.__parts()[0].density).toBe(7850);
    expect(arm.__parts()[0].material).toBe('steel');
  });

  it('seeds density for aluminium (UK spelling) via the alias', () => {
    const { kcad, arm } = makeArm();
    arm.part('bracket', kcad.box(10, 10, 10), { material: 'aluminium' });
    expect(arm.__parts()[0].density).toBe(2700);
    // Stored under the canonical name regardless of the spelling used.
    expect(arm.__parts()[0].material).toBe('aluminum');
  });

  it('applies the material default finish to a shape with no explicit appearance', () => {
    const { session, kcad, arm } = makeArm();
    const shape = kcad.box(10, 10, 10);
    arm.part('bracket', shape, { material: 'aluminum' });
    // aluminum → the 'aluminium' finish token.
    expect(materialOf(session, shape.id)?.baseColor).toBe(FINISHES.aluminium.baseColor);
    expect(materialOf(session, shape.id)?.metalness).toBe(FINISHES.aluminium.metalness);
  });

  it('explicit density overrides the material density (material still seeds finish)', () => {
    const { session, kcad, arm } = makeArm();
    const shape = kcad.box(10, 10, 10);
    // A measured lot: steel finish, but a custom density number.
    arm.part('hub', shape, { material: 'steel', density: 8100 });
    expect(arm.__parts()[0].density).toBe(8100); // explicit wins
    expect(materialOf(session, shape.id)?.baseColor).toBe(FINISHES.steel.baseColor); // finish still seeded
  });

  it('an explicit .finish() on the shape wins over the material finish', () => {
    const { session, kcad, arm } = makeArm();
    const shape = kcad.box(10, 10, 10).finish('brass');
    arm.part('trim', shape, { material: 'steel' });
    // brass explicit finish survives; steel's finish did NOT overwrite it.
    expect(materialOf(session, shape.id)?.baseColor).toBe(FINISHES.brass.baseColor);
    // Density is still seeded from the material.
    expect(arm.__parts()[0].density).toBe(7850);
  });

  it('an explicit .color() on the shape blocks the material finish', () => {
    const { session, kcad, arm } = makeArm();
    const shape = kcad.box(10, 10, 10).color('servo');
    arm.part('cover', shape, { material: 'aluminum' });
    // The hue is explicit intent — the material must not shadow it with a
    // metadata.material record.
    expect(colorOf(session, shape.id)).toBe('servo');
    expect(materialOf(session, shape.id)).toBeUndefined();
    // Density still seeded.
    expect(arm.__parts()[0].density).toBe(2700);
  });

  it('a material with no finish (pet) seeds density but applies no finish', () => {
    const { session, kcad, arm } = makeArm();
    const shape = kcad.box(10, 10, 10);
    arm.part('bottle', shape, { material: 'pet' });
    expect(arm.__parts()[0].density).toBe(1380);
    expect(materialOf(session, shape.id)).toBeUndefined();
  });

  it('a raw { density } with no material keeps working exactly as before', () => {
    const { session, kcad, arm } = makeArm();
    const shape = kcad.box(10, 10, 10);
    arm.part('base', shape, { density: 7850 });
    expect(arm.__parts()[0].density).toBe(7850);
    expect(arm.__parts()[0].material).toBeUndefined();
    // No material → no appearance seeded.
    expect(materialOf(session, shape.id)).toBeUndefined();
  });

  it('an unknown material throws, naming the valid materials — no silent fallback', () => {
    const { kcad, arm } = makeArm();
    expect(() => arm.part('x', kcad.box(10, 10, 10), { material: 'inconel' }))
      .toThrow(/inconel.*not a known material|Valid materials/i);
  });
});
