// src/lib/mates/validator.test.ts
import { describe, it, expect } from 'vitest';
import { validateAssembly } from './validator';
import type { FeatureRecord } from '../../intent/featureRecord';
import type { Param, Vec3Param } from '../../intent/types';

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
