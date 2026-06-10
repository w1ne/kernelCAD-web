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

describe('mateToSdfJoint — child-frame joint pose convention', () => {
  it('emits the joint <pose> and <axis> from the CHILD-side connector (SDFormat joint poses are child-frame-relative)', () => {
    // An SDFormat <joint> <pose> is resolved relative to the child link
    // frame and <axis><xyz> is expressed in the joint frame, which shares
    // the child link orientation. Parent connector at [10,0,0]/+Z, child
    // connector at [2,3,4]/+Y: the emitted pose must be the child-side
    // origin (in metres) and the axis the child-side axis — emitting the
    // parent side anchors the joint at the wrong point in the simulator.
    const resolver = (ref: string) => ref.startsWith('p1.')
      ? { partName: 'p1', origin: [10, 0, 0] as [number, number, number], axis: [0, 0, 1] as [number, number, number] }
      : { partName: 'p2', origin: [2, 3, 4] as [number, number, number], axis: [0, 1, 0] as [number, number, number] };
    const r = mateToSdfJoint(mate({ type: 'revolute' }), resolver);
    expect(r.jointBlocks[0]).toMatch(/<pose>0\.002000 0\.003000 0\.004000 0 0 0<\/pose>/);
    expect(r.jointBlocks[0]).toMatch(/<axis><xyz>0\.000000 1\.000000 0\.000000<\/xyz>/);
  });
});
