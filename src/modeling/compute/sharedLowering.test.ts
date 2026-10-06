// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { computeGeometryKeys } from './geometryIdentity';
import { __geometryKeyComputesForTests, planSharedLowering, prepareSharing } from './sharedLowering';

type Kc = ReturnType<typeof createModelingApi>;

function plan(build: (kc: Kc) => void) {
  const session = new CaptureSession();
  build(createModelingApi({ session }));
  const records = session.getRecords();
  return { records, aliasable: planSharedLowering(records, computeGeometryKeys(records, session.paramTable)) };
}

const rack = (kc: Kc) => kc.box(40, 20, 4).subtract(kc.cylinder(10, 2).translate(10, 10, -1));

describe('planSharedLowering', () => {
  it('aliases every follower part and its private subgraph, never the leader', () => {
    const ids: string[] = [];
    const { records, aliasable } = plan((kc) => {
      const arm = kc.assembly('row');
      for (let i = 0; i < 3; i++) ids.push(arm.part(`r${i}`, rack(kc), { at: [i * 50, 0, 0] }).id);
      arm.model();
    });
    expect(aliasable.has(ids[0])).toBe(false);
    expect(aliasable.has(ids[1])).toBe(true);
    expect(aliasable.has(ids[2])).toBe(true);
    // The leader's source shape lowers normally; each follower's source is aliased.
    const sourceOf = (partId: string) => {
      const ref = records.find((r) => r.id === partId)!.inputs.shape;
      return ref.kind === 'feature' ? ref.id : '';
    };
    expect(aliasable.has(sourceOf(ids[0]))).toBe(false);
    expect(aliasable.has(sourceOf(ids[1]))).toBe(true);
    expect(aliasable.has(sourceOf(ids[2]))).toBe(true);
  });

  it('does not alias a follower whose source shape is also used outside the part', () => {
    const ids: string[] = [];
    const { aliasable } = plan((kc) => {
      const arm = kc.assembly('row');
      ids.push(arm.part('r0', rack(kc)).id);
      const shared = rack(kc);
      ids.push(arm.part('r1', shared, { at: [50, 0, 0] }).id);
      shared.union(kc.box(1, 1, 1)); // second consumer of the follower's source
      arm.model();
    });
    expect(aliasable.has(ids[1])).toBe(false);
  });

  it('does not alias a follower with a topology-origin connector', () => {
    const ids: string[] = [];
    const { aliasable } = plan((kc) => {
      const arm = kc.assembly('row');
      const r0 = arm.part('r0', rack(kc));
      r0.connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 4] } });
      ids.push(r0.id);
      const r1 = arm.part('r1', rack(kc), { at: [50, 0, 0] });
      r1.connector('top', { type: 'frame', origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } } });
      ids.push(r1.id);
      // connectorsByPartId is only recorded for mate-referenced connectors.
      arm.mate('m', 'r0.top', 'r1.top', 'fastened');
      arm.model();
    });
    expect(aliasable.has(ids[1])).toBe(false);
  });

  it('aliases nothing when parts differ', () => {
    const { aliasable } = plan((kc) => {
      const arm = kc.assembly('row');
      arm.part('a', kc.box(10, 10, 10));
      arm.part('b', kc.box(10, 10, 11));
      arm.model();
    });
    expect(aliasable.size).toBe(0);
  });
});

describe('assemblyPart transforms', () => {
  it('captured assembly parts never carry record transforms', () => {
    const { records } = plan((kc) => {
      const arm = kc.assembly('row');
      for (let i = 0; i < 2; i++) arm.part(`r${i}`, rack(kc).translate(1, 2, 3), { at: [i * 50, 0, 0] });
      arm.model();
    });
    const parts = records.filter((r) => r.kind === 'assemblyPart');
    expect(parts.length).toBe(2);
    for (const p of parts) expect(p.transforms).toEqual([]);
  });

  it('an assemblyPart record with transforms gets no key and is never aliased', () => {
    const session = new CaptureSession();
    const kc = createModelingApi({ session });
    const arm = kc.assembly('row');
    const ids = [0, 1].map((i) => arm.part(`r${i}`, rack(kc), { at: [i * 50, 0, 0] }).id);
    arm.model();
    session.appendTransform(ids[1], { op: 'translate', vec: { x: n(1), y: n(0), z: n(0) } } as never);
    const keys = computeGeometryKeys(session.getRecords(), session.paramTable);
    expect(keys.get(ids[0])).toBeDefined();
    expect(keys.get(ids[1])).toBeUndefined();
    expect(planSharedLowering(session.getRecords(), keys).has(ids[1])).toBe(false);
  });
});

function n(v: number) {
  return { expression: String(v), unit: 'mm', evaluated: v };
}

describe('prepareSharing memoisation', () => {
  function poseScript() {
    const session = new CaptureSession();
    const kc = createModelingApi({ session });
    const gap = kc.param('gap', 50);
    const width = kc.param('width', 40);
    const arm = kc.assembly('row');
    for (let i = 0; i < 3; i++) {
      arm.part(`r${i}`, kc.box(width, 20, 4), { at: [gap.multiply(i), 0, 0] });
    }
    arm.model();
    return { session, records: session.getRecords() };
  }

  it('reuses keys when only placement params change (pose-only update)', () => {
    const { session, records } = poseScript();
    const first = prepareSharing(records, session.paramTable);
    const before = __geometryKeyComputesForTests();
    session.paramTable.set('gap', 80);
    const second = prepareSharing(records, session.paramTable);
    expect(__geometryKeyComputesForTests()).toBe(before);
    expect(second?.keys).toBe(first?.keys);
    // Each run gets its own leader table.
    expect(second?.firstByKey).not.toBe(first?.firstByKey);
  });

  it('recomputes keys when a geometry param changes', () => {
    const { session, records } = poseScript();
    const first = prepareSharing(records, session.paramTable);
    const before = __geometryKeyComputesForTests();
    session.paramTable.set('width', 41);
    const second = prepareSharing(records, session.paramTable);
    expect(__geometryKeyComputesForTests()).toBe(before + 1);
    expect(second?.keys).not.toBe(first?.keys);
  });

  it('recomputes keys when records are appended', () => {
    const session = new CaptureSession();
    const kc = createModelingApi({ session });
    const arm = kc.assembly('row');
    arm.part('a', kc.box(1, 1, 1));
    const records = session.getRecords();
    prepareSharing(records, session.paramTable);
    const before = __geometryKeyComputesForTests();
    arm.part('b', kc.box(1, 1, 1));
    prepareSharing(records, session.paramTable);
    expect(__geometryKeyComputesForTests()).toBe(before + 1);
  });

  it('recomputes keys when a transform is appended to an existing record', () => {
    const session = new CaptureSession();
    const kc = createModelingApi({ session });
    const arm = kc.assembly('row');
    const b = kc.box(1, 1, 1);
    arm.part('a', kc.box(1, 1, 1));
    arm.part('b', b);
    const records = session.getRecords();
    const first = prepareSharing(records, session.paramTable);
    expect(first?.aliasable.size).toBeGreaterThan(0);
    b.translate(5, 0, 0); // in place: same records array, same length
    const second = prepareSharing(records, session.paramTable);
    expect(second?.aliasable.size).toBe(0);
  });

  it('is undefined for scripts without assembly parts', () => {
    const session = new CaptureSession();
    createModelingApi({ session }).box(1, 1, 1);
    expect(prepareSharing(session.getRecords(), session.paramTable)).toBeUndefined();
  });
});
