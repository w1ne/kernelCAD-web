// src/lib/mates/validator.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateAssembly,
  validateAssemblyWithMates,
  type ValidatorDiagnostic,
  type ValidatorDiagnosticCode,
} from './validator';
import type { PoseEnvelopeReviewResult } from './poseEnvelope';
import { CaptureSession } from '../../capture/captureSession';
import type { FeatureRecord } from '../../intent/featureRecord';
import type { Param, Vec3Param } from '../../intent/types';
import { createApi } from '../../modules/api';

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
    expect(floatingDiag?.hint).toContain("arm.fixed");
  });

  it('flags every part of a multi-part assembly when none have joints', () => {
    nextId = 0;
    const parts = ['base', 'servo', 'horn', 'bracket', 'gripper', 'jaw'].map(mkPart);
    const r = validateAssembly({ records: parts });
    expect(r.status).toBe('warning');
    const floatingCodes = r.diagnostics.filter((d) => d.code === 'assembly.part.floating');
    expect(floatingCodes.length).toBe(6);
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
      interferencePairs: [{ a: 'a', b: 'b', volumeMm3: 1 }],
    });
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
    expect(result.diagnostics).toHaveLength(0);
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

  it('type-system accepts the 14 v0.6 + v0.6.2 diagnostic codes', () => {
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
    ];
    expect(codes).toHaveLength(14);
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

  it('falls back to v0.5 validateAssembly for legacy joint-only scenes (regression check)', async () => {
    // No mates declared — should pass through to v0.5 behavior. Build a
    // clean joint-only chain (base-link via fixed) and expect 'solved'.
    const { arm, kcad } = makeArm();
    const base = arm.part('base', kcad.box(10, 10, 10));
    const link = arm.part('link', kcad.box(5, 5, 5));
    arm.fixed('base-link', base, link);
    const result = await validateAssemblyWithMates(arm);
    expect(result.status).toBe('solved');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.partCount).toBe(2);
    expect(result.jointCount).toBe(1);
  });
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
