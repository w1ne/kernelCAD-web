import { describe, it, expect } from 'vitest';
import { mateToUrdfJoint } from '../../../../../src/modeling/export/urdf/mateToJoint';
import type { MateRecord } from '../../../../../src/modeling/mates/mate';

function mate(over: Partial<MateRecord>): MateRecord {
  return {
    name: 'm',
    a: 'p1.c1',
    b: 'p2.c2',
    type: 'revolute',
    ...over,
  } as MateRecord;
}

// Connector resolver stub: returns a deterministic origin + axis.
const stubResolver = (ref: string) => ({
  partName: ref.split('.')[0],
  origin: [0, 0, 0] as [number, number, number],
  axis: [0, 0, 1] as [number, number, number],
});

describe('mateToUrdfJoint — §2.5 mapping table (Task B3.A)', () => {
  it('maps fastened -> fixed with no axis or limits', () => {
    const r = mateToUrdfJoint(mate({ type: 'fastened' }), stubResolver);
    expect(r.diagnostics).toEqual([]);
    expect(r.jointBlocks).toHaveLength(1);
    expect(r.jointBlocks[0]).toMatch(/<joint name="m" type="fixed">/);
    expect(r.jointBlocks[0]).not.toMatch(/<axis/);
    expect(r.jointBlocks[0]).not.toMatch(/<limit/);
  });

  it('maps revolute with limitsDeg -> revolute with radian limits', () => {
    const r = mateToUrdfJoint(mate({ type: 'revolute', limitsDeg: [-90, 90] }), stubResolver);
    expect(r.diagnostics).toEqual([]);
    expect(r.jointBlocks[0]).toMatch(/<joint name="m" type="revolute">/);
    expect(r.jointBlocks[0]).toMatch(/lower="-1\.570/);
    expect(r.jointBlocks[0]).toMatch(/upper="1\.570/);
  });

  it('maps revolute without limits -> continuous', () => {
    const r = mateToUrdfJoint(mate({ type: 'revolute' }), stubResolver);
    expect(r.diagnostics).toEqual([]);
    expect(r.jointBlocks[0]).toMatch(/<joint name="m" type="continuous">/);
    expect(r.jointBlocks[0]).not.toMatch(/<limit/);
  });

  it('maps prismatic with limitsMm -> prismatic with metre limits', () => {
    const r = mateToUrdfJoint(mate({ type: 'prismatic', limitsMm: [-50, 50] }), stubResolver);
    expect(r.diagnostics).toEqual([]);
    expect(r.jointBlocks[0]).toMatch(/<joint name="m" type="prismatic">/);
    expect(r.jointBlocks[0]).toMatch(/lower="-0\.05/);
    expect(r.jointBlocks[0]).toMatch(/upper="0\.05/);
  });

  it('maps planar -> planar (URDF native)', () => {
    const r = mateToUrdfJoint(mate({ type: 'planar' }), stubResolver);
    expect(r.diagnostics).toEqual([]);
    expect(r.jointBlocks[0]).toMatch(/<joint name="m" type="planar">/);
  });

  it('maps cylindrical -> revolute + lossy diagnostic', () => {
    const r = mateToUrdfJoint(mate({ type: 'cylindrical', limitsDeg: [0, 360] }), stubResolver);
    expect(r.jointBlocks[0]).toMatch(/<joint name="m" type="revolute">/);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0].code).toBe('export.urdf.cylindrical-lossy');
    expect(r.diagnostics[0].severity).toBe('warn');
  });

  it('maps pin_slot -> revolute + lossy diagnostic', () => {
    const r = mateToUrdfJoint(mate({ type: 'pin_slot' }), stubResolver);
    expect(r.jointBlocks[0]).toMatch(/type="revolute"|type="continuous"/);
    expect(r.diagnostics.map(d => d.code)).toContain('export.urdf.pin-slot-lossy');
  });

  it('maps ball -> 3 chained revolute joints + ball-decomposed diagnostic', () => {
    const r = mateToUrdfJoint(mate({ type: 'ball', name: 'shoulder' }), stubResolver);
    // 3 chained revolutes + 2 dummy links (URDF requires intermediate links).
    expect(r.jointBlocks).toHaveLength(3);
    expect(r.jointBlocks[0]).toMatch(/type="revolute"|type="continuous"/);
    expect(r.diagnostics.map(d => d.code)).toContain('export.urdf.ball-decomposed');
    expect(r.dummyLinks).toBeDefined();
    expect(r.dummyLinks!.length).toBe(2);
  });

  it('every diagnostic carries mandatory hint and nextAction fields', () => {
    const r = mateToUrdfJoint(mate({ type: 'cylindrical' }), stubResolver);
    const d = r.diagnostics[0];
    expect(typeof d.hint).toBe('string');
    expect(d.hint.length).toBeGreaterThan(20);
    expect(d.nextAction).toBeDefined();
  });
});
