// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mjcfInertiaTriangle.test.ts
//
// MuJoCo rejects a body whose principal moments break A + B >= C. A thin
// plate sits exactly on that boundary (perpendicular axis theorem: C = A + B),
// so DRAW 01 v8's 3 mm plywood lid failed the gravity check with
// "inertia must satisfy A + B >= C" once the emitter rounded its tensor to 6
// decimals. The emitter now writes the tensor at full precision and corrects
// it to the nearest valid one, and honours a declared massKg.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { assemblyToMjcf, jacobiEigenSymmetric3, validInertia6 } from './mjcfExport';
import { loadMujocoSession } from './mujocoSession';

type I6 = [number, number, number, number, number, number];

function principal(i: I6): number[] {
  const [xx, xy, xz, yy, yz, zz] = i;
  return [...jacobiEigenSymmetric3([[xx, xy, xz], [xy, yy, yz], [xz, yz, zz]]).values].sort((a, b) => a - b);
}

/** `[ixx, iyy, izz, ixy, ixz, iyz]` of every `<inertial fullinertia>` → I6. */
function emittedInertias(mjcf: string): Map<string, { mass: number; i6: I6 }> {
  const out = new Map<string, { mass: number; i6: I6 }>();
  for (const m of mjcf.matchAll(/<body name="([^"]+)"[^>]*>\s*<inertial[^>]*mass="([^"]+)" fullinertia="([^"]+)"/g)) {
    const [xx, yy, zz, xy, xz, yz] = m[3]!.trim().split(/\s+/).map(Number) as number[];
    out.set(m[1]!, { mass: Number(m[2]), i6: [xx!, xy!, xz!, yy!, yz!, zz!] });
  }
  return out;
}

/** One free body with the given inertial attributes. */
function oneBodyMjcf(fullinertia: string): string {
  return `<mujoco model="t"><option gravity="0 0 -9.81"/><worldbody>
  <body name="plate" pos="0 0 0.1"><freejoint/><inertial pos="0 0 0" mass="0.013282" fullinertia="${fullinertia}"/></body>
</worldbody></mujoco>`;
}

describe('validInertia6 — triangle inequality', () => {
  it('corrects a thin-plate tensor that breaks A + B >= C, keeping it SPD and close', () => {
    // DRAW 01 v8 lid as the old emitter wrote it: C rounded up to 0.000102.
    const broken: I6 = [1.129354e-5, -6.236125e-7, 0, 9.050729e-5, 0, 0.000102];
    const before = principal(broken);
    expect(before[0]! + before[1]!).toBeLessThan(before[2]!);
    const { inertia6, note } = validInertia6(broken);
    const after = principal(inertia6);
    expect(after[0]! + after[1]!).toBeGreaterThanOrEqual(after[2]!);
    expect(after[0]).toBeGreaterThan(0);
    // Largest moment kept; the smaller ones grow by half the excess each.
    expect(after[2]).toBeCloseTo(before[2]!, 12);
    expect(Math.abs(after[0]! - before[0]!)).toBeLessThan(1e-6);
    expect(note).toMatch(/break A \+ B >= C; corrected/);
  });

  it('corrects a rotated plate tensor (off-diagonal terms) the same way', () => {
    // Principal (1, 2, 3.01) rotated 30° about Z: C > A + B by 1/3 %.
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    const [a, b, z] = [1e-5, 2e-5, 3.01e-5];
    const rotated: I6 = [a * c * c + b * s * s, (a - b) * c * s, 0, a * s * s + b * c * c, 0, z];
    const { inertia6, note } = validInertia6(rotated);
    const after = principal(inertia6);
    expect(after[0]! + after[1]!).toBeGreaterThanOrEqual(after[2]!);
    expect(after[2]).toBeCloseTo(z, 15);
    expect(note).toBeDefined();
  });

  it('NEGATIVE CONTROL: a valid tensor comes back bit for bit, with no note', () => {
    // Solid box 10 × 20 × 30: principal moments ∝ (b²+c², a²+c², a²+b²).
    const box: I6 = [1.3e-4, 0, 0, 1.0e-4, 0, 5e-5];
    const { inertia6, note } = validInertia6(box);
    expect(inertia6).toEqual(box);
    expect(note).toBeUndefined();
  });

  it('NEGATIVE CONTROL: MuJoCo rejects the old rounded lid tensor and loads the corrected one', async () => {
    // The check would be vacuous if MuJoCo accepted the broken tensor.
    await expect(loadMujocoSession(oneBodyMjcf('1.129354e-5 9.050729e-5 0.000102 -6.236125e-7 0 0'), ['plate'], []))
      .rejects.toThrow(/A \+ B >= C/);
    const [xx, xy, xz, yy, yz, zz] = validInertia6([1.129354e-5, -6.236125e-7, 0, 9.050729e-5, 0, 0.000102]).inertia6;
    const session = await loadMujocoSession(oneBodyMjcf([xx, yy, zz, xy, xz, yz].map((v) => v.toExponential(9)).join(' ')), ['plate'], []);
    session.dispose();
  }, 60_000);
});

describe('assemblyToMjcf — thin plate with massKg', () => {
  it('emits a 3 mm plate with a declared massKg that MuJoCo loads', async () => {
    await initOcct();
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('thin-plate');
    // A 142 × 50 × 3 mm lid with a slot and a hole, like DRAW 01's lid-3mm.
    const lidShape = kcad.box(142, 50, 3)
      .subtract(kcad.box(20, 12, 5).translate(20, 15, -1))
      .subtract(kcad.cylinder(5, 4.5, 48).translate(56, 20, -1));
    const frame = { type: 'frame' as const, origin: { kind: 'vec3' as const, value: [70, 25, 0] as [number, number, number] }, normal: [0, 0, 1] as [number, number, number] };
    arm.part('base', kcad.box(142, 50, 3).translate(0, 0, -3)).connector('lid', frame);
    arm.part('lid', lidShape, { massKg: 0.013282 }).connector('seat', frame);
    arm.mate('lid-fixed', 'base.lid', 'lid.seat', 'fastened');
    const r = await assemblyToMjcf(arm);
    const lid = emittedInertias(r.mjcf).get('lid');
    expect(lid).toBeDefined();
    // massKg wins over volume × density (1000 kg/m³ would give ~0.02 kg).
    expect(lid!.mass).toBeCloseTo(0.013282, 6);
    const p = principal(lid!.i6);
    expect(p[0]).toBeGreaterThan(0);
    expect(p[0]! + p[1]!).toBeGreaterThanOrEqual(p[2]!);
    const mj = await loadMujocoSession(r.mjcf, r.bodyOrder, r.jointOrder);
    mj.dispose();
  }, 120_000);
});
