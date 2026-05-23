import { describe, it, expect } from 'vitest';
import { mateToSdfJoint } from '../../../../../src/modeling/export/sdformat/mateToSdfJoint';
import type { MateRecord } from '../../../../../src/modeling/mates/mate';

function mate(over: Partial<MateRecord>): MateRecord {
  return { name: 'm', a: 'p1.c1', b: 'p2.c2', type: 'revolute', ...over } as MateRecord;
}
const stub = (ref: string) => ({
  partName: ref.split('.')[0],
  origin: [0, 0, 0] as [number, number, number],
  axis: [0, 0, 1] as [number, number, number],
});

describe('mateToSdfJoint — SDFormat mate mapping (Task B5.A)', () => {
  it('emits ball type natively (no decomposition, no diagnostic)', () => {
    const r = mateToSdfJoint(mate({ type: 'ball' }), stub);
    expect(r.diagnostics).toEqual([]);
    expect(r.jointBlocks).toHaveLength(1);
    expect(r.jointBlocks[0]).toMatch(/<joint name="m" type="ball">/);
  });

  it('emits revolute for revolute mates with limits in radians', () => {
    const r = mateToSdfJoint(mate({ type: 'revolute', limitsDeg: [-90, 90] }), stub);
    expect(r.jointBlocks[0]).toMatch(/<joint name="m" type="revolute">/);
    expect(r.jointBlocks[0]).toMatch(/<lower>-1\.570/);
  });

  it('emits prismatic with metre limits', () => {
    const r = mateToSdfJoint(mate({ type: 'prismatic', limitsMm: [-50, 50] }), stub);
    expect(r.jointBlocks[0]).toMatch(/<joint name="m" type="prismatic">/);
    expect(r.jointBlocks[0]).toMatch(/<lower>-0\.05/);
  });

  it('emits fixed for fastened', () => {
    const r = mateToSdfJoint(mate({ type: 'fastened' }), stub);
    expect(r.jointBlocks[0]).toMatch(/<joint name="m" type="fixed">/);
  });

  it('cylindrical stays lossy in SDF (no native cylindrical joint type)', () => {
    const r = mateToSdfJoint(mate({ type: 'cylindrical' }), stub);
    expect(r.diagnostics.map(d => d.code)).toContain('export.sdf-gazebo.cylindrical-lossy');
  });

  it('pin_slot stays lossy in SDF', () => {
    const r = mateToSdfJoint(mate({ type: 'pin_slot' }), stub);
    expect(r.diagnostics.map(d => d.code)).toContain('export.sdf-gazebo.pin-slot-lossy');
  });
});
