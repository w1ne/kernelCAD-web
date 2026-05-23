import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';

describe('Assembly planning-group capture-time API (Task B4.A)', () => {
  function makeArm() {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('two-link');
    arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    arm.part('upper', kcad.box(80, 10, 10), { density: 2700 });
    return arm;
  }

  it('arm.planningGroup stores a chain-form group', () => {
    const arm = makeArm();
    arm.planningGroup('main', { chain: { baseLink: 'base', tipLink: 'upper' } });
    const groups = arm.__planningGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].chain).toEqual({ baseLink: 'base', tipLink: 'upper' });
  });

  it('arm.planningGroup stores a joint-list-form group', () => {
    const arm = makeArm();
    arm.planningGroup('gripper', { joints: ['gripper-open'] });
    const groups = arm.__planningGroups();
    expect(groups[0].joints).toEqual(['gripper-open']);
  });

  it('arm.endEffector stores name + parentLink + group references', () => {
    const arm = makeArm();
    arm.planningGroup('main', { chain: { baseLink: 'base', tipLink: 'upper' } });
    arm.endEffector('tool', { parentLink: 'upper', group: 'gripper', parentGroup: 'main' });
    const ees = arm.__endEffectors();
    expect(ees[0].name).toBe('tool');
    expect(ees[0].parentLink).toBe('upper');
    expect(ees[0].group).toBe('gripper');
    expect(ees[0].parentGroup).toBe('main');
  });

  it('arm.virtualJoint accepts fixed type with parentFrame and childLink', () => {
    const arm = makeArm();
    arm.virtualJoint('world_joint', { type: 'fixed', parentFrame: 'world', childLink: 'base' });
    const vj = arm.__virtualJoints();
    expect(vj[0]).toEqual({ name: 'world_joint', type: 'fixed', parentFrame: 'world', childLink: 'base' });
  });

  it('arm.groupState stores a named pose snapshot tied to a group', () => {
    const arm = makeArm();
    arm.planningGroup('main', { chain: { baseLink: 'base', tipLink: 'upper' } });
    arm.groupState('home', 'main', { shoulder: 0 });
    const states = arm.__groupStates();
    expect(states[0]).toEqual({ name: 'home', group: 'main', values: { shoulder: 0 } });
  });

  it('arm.disableCollision records a user-forced ACM entry with reason', () => {
    const arm = makeArm();
    arm.disableCollision('base', 'upper', { reason: 'User' });
    const dc = arm.__disabledCollisions();
    expect(dc[0]).toEqual({ link1: 'base', link2: 'upper', reason: 'User' });
  });

  it('rejects arm.endEffector with an unknown parentLink', () => {
    const arm = makeArm();
    expect(() => arm.endEffector('tool', { parentLink: 'ghost', group: 'g', parentGroup: 'p' }))
      .toThrow(/parentLink|not found|unknown/i);
  });

  it('rejects duplicate planningGroup names', () => {
    const arm = makeArm();
    arm.planningGroup('main', { chain: { baseLink: 'base', tipLink: 'upper' } });
    expect(() => arm.planningGroup('main', { joints: [] }))
      .toThrow(/duplicate|already/i);
  });
});
