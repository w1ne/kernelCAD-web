// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/lib/mates/validator.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateAssembly,
  validateAssemblyWithMates,
  type ValidatorDiagnostic,
  type ValidatorDiagnosticCode,
} from './validator';
import type { MateLoadLimit, MateRecord } from './mate';
import type { PoseEnvelopeReviewResult } from './poseEnvelope';
import { CaptureSession } from '../capture/captureSession';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { Param, Vec3Param } from '../../shared/intent/types';
import { createApi } from '../api';

const p = (n: number): Param => ({ expression: String(n), unit: 'mm', evaluated: n });
const v = (x: number, y: number, z: number): Vec3Param => ({ x: p(x), y: p(y), z: p(z) });

let nextId = 0;
function mkPart(name: string): FeatureRecord {
  return {
    id: `assemblyPart_${++nextId}`,
    kind: 'assemblyPart',
    params: {},
    inputs: { shape: { kind: 'feature', id: `dummy_${nextId}` } },
    transforms: [],
    suppressed: false,
    metadata: { assemblyName: 'test', partName: name },
  };
}

function mkJoint(name: string, a: FeatureRecord, b: FeatureRecord, kind = 'fixed'): FeatureRecord {
  return {
    id: `assemblyJoint_${++nextId}`,
    kind: 'assemblyJoint',
    params: {},
    inputs: {
      a: { kind: 'feature', id: a.id },
      b: { kind: 'feature', id: b.id },
    },
    transforms: [],
    suppressed: false,
    metadata: { assemblyName: 'test', jointName: name, jointKind: kind, origin: v(0, 0, 0) },
  };
}

describe('validateAssembly', () => {
  it('reports solved on a fully connected tree', () => {
    nextId = 0;
    const base = mkPart('base');
    const link = mkPart('link');
    const tip = mkPart('tip');
    const j1 = mkJoint('base-link', base, link);
    const j2 = mkJoint('link-tip', link, tip);
    const r = validateAssembly({ records: [base, link, tip, j1, j2] });
    expect(r.status).toBe('solved');
    expect(r.diagnostics).toEqual([]);
    expect(r.partCount).toBe(3);
    expect(r.jointCount).toBe(2);
  });

  it('flags a part with zero joints as floating', () => {
    nextId = 0;
    const base = mkPart('base');
    const arm = mkPart('arm');
    const floating = mkPart('floating-bracket');
    const j = mkJoint('base-arm', base, arm);
    const r = validateAssembly({ records: [base, arm, floating, j] });
    expect(r.status).toBe('warning');
    const floatingDiag = r.diagnostics.find((d) => d.partName === 'floating-bracket');
    expect(floatingDiag?.code).toBe('assembly.part.floating');
    expect(floatingDiag?.hint).toContain("arm.mate");
  });

  it('flags every part of a multi-part assembly when none have joints', () => {
    nextId = 0;
    const parts = ['base', 'servo', 'horn', 'bracket', 'gripper', 'jaw'].map(mkPart);
    const r = validateAssembly({ records: parts });
    expect(r.status).toBe('warning');
    const floatingCodes = r.diagnostics.filter((d) => d.code === 'assembly.part.floating');
    expect(floatingCodes.length).toBe(6);
  });

  // Issue #448 — mate edges must reach the record-level validator through
  // BOTH scene-producing record kinds. `Assembly.solvedModel` writes mates
  // onto a `solvedAssembly` record; `Assembly.model()` writes the identical
  // metadata onto an `assemblyModel` record. The validator used to walk only
  // `solvedAssembly`, so the same mated assembly validated clean via
  // `solvedModel({})` but emitted spurious floating warnings via `.model()`.
  it('sees mate edges on an assemblyModel record — .model() path (issue #448)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('t');
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 1] } });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('a-b', 'a.top', 'b.bot', 'fastened');
    arm.model(); // records `assemblyModel` (NOT `solvedAssembly`) with mate metadata
    const r = validateAssembly({ records: session.getRecords() });
    expect(r.diagnostics.filter((d) => d.code === 'assembly.part.floating')).toEqual([]);
    expect(r.status).toBe('solved');
  });

  it('still flags a genuinely unmated part when siblings are mated via .model()', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('t');
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 1] } });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.part('stray', kcad.box(1, 1, 1)); // authored but never mated — must warn
    arm.mate('a-b', 'a.top', 'b.bot', 'fastened');
    arm.model();
    const r = validateAssembly({ records: session.getRecords() });
    const floating = r.diagnostics.filter((d) => d.code === 'assembly.part.floating');
    expect(floating.map((d) => d.partName)).toEqual(['stray']);
    expect(r.status).toBe('warning');
  });

  it('flags an orphan sub-assembly disconnected from the main mechanism', () => {
    nextId = 0;
    const base = mkPart('base');
    const arm = mkPart('arm');
    const j1 = mkJoint('base-arm', base, arm);
    // A separate sub-assembly: gripper-jaw joined to each other but not to base
    const gripper = mkPart('gripper');
    const jaw = mkPart('jaw');
    const j2 = mkJoint('gripper-jaw', gripper, jaw);
    const r = validateAssembly({ records: [base, arm, gripper, jaw, j1, j2] });
    expect(r.status).toBe('warning');
    // base + arm = main mechanism (contains the first-declared part, 'base').
    // gripper + jaw = orphan cluster.
    const orphan = r.diagnostics.filter((d) => d.code === 'assembly.part.orphan').map((d) => d.partName);
    expect(orphan.sort()).toEqual(['gripper', 'jaw']);
    // No part should be flagged BOTH floating AND orphan.
    const floating = r.diagnostics.filter((d) => d.code === 'assembly.part.floating');
    expect(floating).toHaveLength(0);
  });

  it('promotes interference pairs into assembly.interference.overlap errors', () => {
    nextId = 0;
    const a = mkPart('a');
    const b = mkPart('b');
    const j = mkJoint('a-b', a, b);
    const r = validateAssembly({
      records: [a, b, j],
      interferencePairs: [{ a: 'a', b: 'b', volumeMm3: 142.5 }],
    });
    expect(r.status).toBe('error');
    const overlap = r.diagnostics.find((d) => d.code === 'assembly.interference.overlap');
    expect(overlap?.severity).toBe('error');
    expect(overlap?.partA).toBe('a');
    expect(overlap?.partB).toBe('b');
    expect(overlap?.volumeMm3).toBeCloseTo(142.5, 3);
    expect(overlap?.message).toContain('142.50 mm³');
  });

  it('returns solved on a single-part assembly (no orphan check)', () => {
    nextId = 0;
    const lone = mkPart('lone');
    const r = validateAssembly({ records: [lone] });
    // A single part has no neighbours so it's floating-as-warning.
    expect(r.status).toBe('warning');
    expect(r.diagnostics.length).toBe(1);
    expect(r.diagnostics[0].code).toBe('assembly.part.floating');
  });

  it('errors take priority over warnings in status', () => {
    nextId = 0;
    const a = mkPart('a');
    const b = mkPart('b');
    const j = mkJoint('a-b', a, b);
    const floating = mkPart('floating');
    const r = validateAssembly({
      records: [a, b, j, floating],
      // Above the uniform 20 mm³ contact-noise threshold (decision #1) so it
      // registers as a real interference error, which must win over the
      // floating-part warning in the aggregate status.
      interferencePairs: [{ a: 'a', b: 'b', volumeMm3: 142.5 }],
    });
    expect(r.status).toBe('error');
  });

  it('filters interference pairs listed in `ignore` from the diagnostic stream', () => {
    nextId = 0;
    const a = mkPart('a');
    const b = mkPart('b');
    const j = mkJoint('a-b', a, b);
    const r = validateAssembly({
      records: [a, b, j],
      interferencePairs: [{ a: 'a', b: 'b', volumeMm3: 42 }],
      ignore: [['a', 'b']],
    });
    // The ignored pair must NOT emit a diagnostic. Without other errors, the
    // assembly is solved (no floating, no orphan).
    expect(r.diagnostics.find((d) => d.code === 'assembly.interference.overlap')).toBeUndefined();
    expect(r.status).toBe('solved');
  });

  it('symmetric ignore: `[a, b]` also filters `(b, a)`', () => {
    nextId = 0;
    const a = mkPart('a');
    const b = mkPart('b');
    const j = mkJoint('a-b', a, b);
    // detection happens to emit (b, a) — validator must still suppress it.
    const r = validateAssembly({
      records: [a, b, j],
      interferencePairs: [{ a: 'b', b: 'a', volumeMm3: 5 }],
      ignore: [['a', 'b']],
    });
    expect(r.diagnostics.find((d) => d.code === 'assembly.interference.overlap')).toBeUndefined();
  });

  it('only ignored pairs are filtered; other pairs still emit diagnostics', () => {
    nextId = 0;
    const a = mkPart('a');
    const b = mkPart('b');
    const c = mkPart('c');
    const j1 = mkJoint('a-b', a, b);
    const j2 = mkJoint('b-c', b, c);
    const r = validateAssembly({
      records: [a, b, c, j1, j2],
      interferencePairs: [
        { a: 'a', b: 'b', volumeMm3: 50 }, // ignored (would otherwise error: > 20 mm³)
        { a: 'b', b: 'c', volumeMm3: 50 }, // NOT ignored — must error (> 20 mm³)
      ],
      ignore: [['a', 'b']],
    });
    const overlaps = r.diagnostics.filter((d) => d.code === 'assembly.interference.overlap');
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].partA).toBe('b');
    expect(overlaps[0].partB).toBe('c');
    expect(r.status).toBe('error');
  });
});

// v0.6 mate-aware entry point. Builds an Assembly via the public capture
// API (parallel to solver.test.ts's `makeArm()` helper — don't duplicate
// FeatureRecord factories above, those exercise the v0.5 path).
function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('t'), kcad };
}

describe('validateAssembly — v0.6 mate-aware codes', () => {
  it('returns solved on a clean fastened 2-part assembly', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 1] } });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('bot', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('a-b', 'a.top', 'b.bot', 'fastened');
    const result = await validateAssemblyWithMates(arm);
    expect(result.status).toBe('solved');
    // v0.7.4 Gate 1 emits info-severity "deferred" notes for vec3-origin
    // sides on fastened mates (the v0.7.x followup wires vec3-origin face
    // inference). Filter those out — this test is about clean-status, not
    // about Gate 1's deferred-note behaviour (covered in mountingHoleConsistency.test.ts).
    const nonDeferred = result.diagnostics.filter((d) => d.severity !== 'info');
    expect(nonDeferred).toHaveLength(0);
  });

  it('reports assembly.mate.over-constrained on an inconsistent triangle', async () => {
    // Inconsistent triangle pattern (mirrors solver.test.ts:89-111).
    // m3 wants c.t (world (2,0,0)) to coincide with a.p (world (0,0,0)) —
    // residual 2 mm, no DOF to absorb it ⇒ over-constrained.
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('r', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm
      .part('c', kcad.box(1, 1, 1))
      .connector('s', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('t', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm.mate('m1', 'a.p', 'b.q', 'fastened');
    arm.mate('m2', 'b.r', 'c.s', 'fastened');
    arm.mate('m3', 'c.t', 'a.p', 'fastened');
    const result = await validateAssemblyWithMates(arm);
    expect(result.diagnostics.find((d) => d.code === 'assembly.mate.over-constrained')).toBeDefined();
    expect(result.status).toBe('over-constrained');
  });

  it('reports assembly.solver.did-not-converge on a non-fastened loop (T7 punt)', async () => {
    // T7 punts articulated closed loops to T7.x: any non-fastened mate in a
    // loop returns 'did-not-converge' with iterations=0. Build a triangle
    // where m3 is revolute — exercises that branch.
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('axis', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('r', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm
      .part('c', kcad.box(1, 1, 1))
      .connector('s', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('axis', {
        type: 'axis',
        origin: { kind: 'vec3', value: [1, 0, 0] },
        axis: [0, 0, 1],
      });
    arm.mate('m1', 'a.p', 'b.q', 'fastened');
    arm.mate('m2', 'b.r', 'c.s', 'fastened');
    arm.mate('m3', 'c.axis', 'a.axis', 'revolute'); // non-fastened loop edge
    const result = await validateAssemblyWithMates(arm);
    expect(result.diagnostics.find((d) => d.code === 'assembly.solver.did-not-converge')).toBeDefined();
    expect(result.status).toBe('did-not-converge');
  });

  it('reports redundant-ok on a consistent triangle of fastened mates', async () => {
    // Consistent triangle (mirrors solver.test.ts:61-87). m3 agrees with the
    // tree-FK at zero-pose ⇒ residual ≈ 0 ⇒ redundant-ok.
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('r', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm
      .part('c', kcad.box(1, 1, 1))
      .connector('s', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } })
      .connector('t', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('m1', 'a.p', 'b.q', 'fastened');
    arm.mate('m2', 'b.r', 'c.s', 'fastened');
    arm.mate('m3', 'c.t', 'a.p', 'fastened');
    const result = await validateAssemblyWithMates(arm);
    expect(result.status).toBe('redundant-ok');
    const info = result.diagnostics.find((d) => d.code === 'assembly.mate.over-constrained');
    expect(info?.severity).toBe('info');
  });

  it('does not report used contact-target parts as floating structure', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('frame', kcad.box(1, 1, 1))
      .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm
      .part('palm', kcad.box(10, 10, 2))
      .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('pad', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 1] } });
    arm
      .part('target-bar', kcad.cylinder(20, 3), { role: 'contact-target' })
      .connector('contact', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 1] } });
    arm.part('stray', kcad.box(1, 1, 1));
    arm.mate('palm-frame', 'frame.mount', 'palm.mount', 'fastened');
    arm.physicalUseCase('touch-target', {
      stableParts: ['palm'],
      loads: [{ part: 'target-bar', force: [0, 0, -1] }],
      contacts: [
        { a: 'palm.pad', b: 'target-bar.contact', normal: [0, 0, 1], friction: 0.5, normalForceN: 1 },
      ],
      actuatorLimits: [],
    });

    const result = await validateAssemblyWithMates(arm);

    const floatingPartNames = result.diagnostics
      .filter((diagnostic) => diagnostic.code === 'assembly.part.floating')
      .map((diagnostic) => diagnostic.partName);
    expect(floatingPartNames).toEqual(['stray']);
  });

  it('type-system accepts the 17 v0.6 + v0.6.2 + v0.7.4 diagnostic codes', () => {
    // Capture-time codes (`type-mismatch`, `connector-not-found`) are thrown
    // as `KernelError` by `arm.mate(...)` and never surface through the
    // validator — but external consumers (lowerer, MCP error-chain echoes)
    // still need them in the union. This test pins the union shape so a
    // future refactor can't silently drop them.
    //
    // v0.6.2 grew the union by 5: 4 envelope-folded codes
    // (assembly.pose.out-of-limits, assembly.pose-envelope.{solve-failed,
    // interference, connector-unresolved}) + 1 new code
    // (assembly.mate.limit-missing).
    //
    // v0.7.4 grew the union by 3 kinematic-grounding gates:
    // assembly.mounting-hole.mismatch, assembly.joint-axis.unbound,
    // assembly.joint.load-exceeded.
    const codes: ValidatorDiagnosticCode[] = [
      'assembly.part.floating',
      'assembly.part.orphan',
      'assembly.interference.overlap',
      'assembly.part.under-constrained',
      'assembly.mate.over-constrained',
      'assembly.mate.type-mismatch',
      'assembly.mate.connector-not-found',
      'assembly.loop.unclosed',
      'assembly.solver.did-not-converge',
      'assembly.pose.out-of-limits',
      'assembly.pose-envelope.solve-failed',
      'assembly.pose-envelope.interference',
      'assembly.pose-envelope.connector-unresolved',
      'assembly.mate.limit-missing',
      'assembly.mounting-hole.mismatch',
      'assembly.joint-axis.unbound',
      'assembly.joint.load-exceeded',
    ];
    // When bumping this number: update the literal, the it(...) title above,
    // AND the inline comment listing what's in the union.
    expect(
      codes.length,
      'ValidatorDiagnosticCode union changed — update count, it() title, and member-list comment together',
    ).toBe(17);
    // Smoke-check that the capture-time codes survive on a hand-crafted
    // `ValidatorDiagnostic` (compile-time check; runtime is trivial).
    const typeMismatch: ValidatorDiagnostic = {
      code: 'assembly.mate.type-mismatch',
      severity: 'error',
      message: 'fixture',
      hint: 'invalid-args.assembly.mate-type-mismatch — fixture',
    };
    const connectorMissing: ValidatorDiagnostic = {
      code: 'assembly.mate.connector-not-found',
      severity: 'error',
      message: 'fixture',
      hint: 'invalid-args.assembly.mate-connector-not-found — fixture',
    };
    expect(typeMismatch.code).toBe('assembly.mate.type-mismatch');
    expect(connectorMissing.code).toBe('assembly.mate.connector-not-found');
  });

  // G0 (2026-05-31): the legacy-joint-only regression case was removed
  // when `arm.fixed(...)` was deleted from the public API. The v0.5
  // forwardKinematics fallback path in `validateAssemblyWithMates` is now
  // unreachable from script callers; if it becomes the focus of a future
  // slice it should be exercised via a hand-built FeatureRecord[] fixture
  // (mirroring the upstream `validateAssembly` test above) rather than
  // through the removed Assembly methods.
});

describe('validateAssemblyWithMates — v0.6.2 envelope fold + limit-missing', () => {
  it('folds PoseEnvelopeDiagnostic codes into ValidatorDiagnostic', async () => {
    const { arm, kcad } = makeArm();
    arm.part('p', kcad.box(1, 1, 1)).connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.part('q', kcad.box(1, 1, 1)).connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('m', 'p.o', 'q.o', 'fastened');

    const envelope: PoseEnvelopeReviewResult = {
      samples: [],
      diagnostics: [
        { code: 'assembly.pose-envelope.interference', severity: 'error',
          message: 'at limit', hint: 'hint-int',
          sampleName: 'm:max', mateName: 'm', partA: 'p', partB: 'q', volumeMm3: 50 },
        { code: 'assembly.pose-envelope.solve-failed', severity: 'error',
          message: 'solver fail', hint: 'hint-solve', sampleName: 'm:min' },
      ],
      interferencePairs: [],
      connectorPoses: [],
      connectorWorkspace: [],
    };

    const result = await validateAssemblyWithMates(arm, undefined, envelope);
    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain('assembly.pose-envelope.interference');
    expect(codes).toContain('assembly.pose-envelope.solve-failed');
  });

  it('emits assembly.mate.limit-missing warning per articulated mate without declared limits', async () => {
    const { arm, kcad } = makeArm();
    arm.part('p', kcad.box(1, 1, 1)).connector('o', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.part('q', kcad.box(1, 1, 1)).connector('o', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('m', 'p.o', 'q.o', 'revolute');   // no limitsDeg

    const result = await validateAssemblyWithMates(arm);
    const limitMissing = result.diagnostics.filter((d) => d.code === 'assembly.mate.limit-missing');
    expect(limitMissing).toHaveLength(1);
    expect(limitMissing[0].severity).toBe('warning');
    expect(limitMissing[0].mateName).toBe('m');
  });

  it('does not emit limit-missing for fastened/planar mates', async () => {
    const { arm, kcad } = makeArm();
    arm.part('p', kcad.box(1, 1, 1)).connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.part('q', kcad.box(1, 1, 1)).connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('m', 'p.o', 'q.o', 'fastened');

    const result = await validateAssemblyWithMates(arm);
    const limitMissing = result.diagnostics.filter((d) => d.code === 'assembly.mate.limit-missing');
    expect(limitMissing).toHaveLength(0);
  });

  it('does not emit limit-missing for revolute mate WITH declared limitsDeg', async () => {
    const { arm, kcad } = makeArm();
    arm.part('p', kcad.box(1, 1, 1)).connector('o', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.part('q', kcad.box(1, 1, 1)).connector('o', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('m', 'p.o', 'q.o', 'revolute', { limitsDeg: [-90, 90] });

    const result = await validateAssemblyWithMates(arm);
    expect(result.diagnostics.filter((d) => d.code === 'assembly.mate.limit-missing')).toHaveLength(0);
  });
});

describe('validateAssemblyWithMates — v0.7.4 externalLoads flow-through (Phase 6)', () => {
  it('emits assembly.joint.load-exceeded when externalLoads flow through to Gate 3, absent otherwise', async () => {
    // Phase 6 integration check: `validateAssemblyWithMates(arm, ifaces,
    // envelope, externalLoads)` must hand the 4th arg to
    // `validateJointLoadCapacity` so the gate fires on exceed. Building the
    // same fixture twice (once with externalLoads, once without) and
    // asserting the diagnostic-count delta pins the wiring — if the 4th
    // arg were dropped on the floor (the Phase 2 placeholder behaviour), the
    // "with" call would have the same zero-load-exceeded count as the
    // "without" call.
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(10, 10, 10), { at: [50, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [-50, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('b', kcad.box(10, 10, 10), { at: [0, 0, 0] })
      .connector('c', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('hinge', 'a.c', 'b.c', 'revolute', { limitsDeg: [-90, 90] });
    // Patch maxLoad onto the just-pushed mate. `arm.mate(...)` doesn't yet
    // accept `maxLoad`; see the parallel pattern in jointLoadCapacity.test.ts.
    const mates = arm.__mates() as MateRecord[];
    (mates[0] as { maxLoad?: MateLoadLimit }).maxLoad = { torque: 10 };

    // r = 50 mm, F = 1000 N perpendicular → 50 N·m > 10 N·m cap.
    const externalLoads = { a: { force: [0, 0, -1000] as [number, number, number] } };

    const withLoads = await validateAssemblyWithMates(arm, undefined, undefined, externalLoads);
    const withoutLoads = await validateAssemblyWithMates(arm, undefined, undefined, undefined);

    const exceededWith = withLoads.diagnostics.filter((d) => d.code === 'assembly.joint.load-exceeded' && d.severity === 'error');
    const exceededWithout = withoutLoads.diagnostics.filter((d) => d.code === 'assembly.joint.load-exceeded' && d.severity === 'error');
    expect(exceededWith).toHaveLength(1);
    expect(exceededWithout).toHaveLength(0);
    expect(exceededWith[0].mateName).toBe('hinge');
    expect(exceededWith[0].hint).toMatch(/joint-load-exceeded/);
  });
});

describe('v0.7.4 diagnostic codes — compile-time check', () => {
  it('declares assembly.mounting-hole.mismatch, assembly.joint-axis.unbound, assembly.joint.load-exceeded in ValidatorDiagnosticCode', () => {
    // `satisfies` enforces at compile-time that each literal is a member of
    // `ValidatorDiagnosticCode`. The runtime `.toHaveLength(3)` exists only
    // so vitest counts this as a real test; the type-level guarantee is the
    // load-bearing part.
    const codes = [
      'assembly.mounting-hole.mismatch',
      'assembly.joint-axis.unbound',
      'assembly.joint.load-exceeded',
    ] as const satisfies readonly ValidatorDiagnosticCode[];
    expect(codes).toHaveLength(3);
  });
});
