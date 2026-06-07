import { describe, expect, it, beforeEach } from 'vitest';
import { shellStore } from './shellStore';

describe('shellStore section state', () => {
  beforeEach(() => shellStore.reset());

  it('defaults: off, z axis, unflipped, position 0', () => {
    const s = shellStore.getSnapshot();
    expect(s.sectionMode).toBe(false);
    expect(s.sectionAxis).toBe('z');
    expect(s.sectionFlip).toBe(false);
    expect(s.sectionPosition).toBe(0);
  });

  it('toggleSectionMode flips the boolean and notifies', () => {
    let hits = 0;
    const unsub = shellStore.subscribe(() => { hits += 1; });
    shellStore.toggleSectionMode();
    expect(shellStore.getSnapshot().sectionMode).toBe(true);
    shellStore.toggleSectionMode();
    expect(shellStore.getSnapshot().sectionMode).toBe(false);
    expect(hits).toBe(2);
    unsub();
  });

  it('setSectionMode is idempotent (no fan-out on same value)', () => {
    let hits = 0;
    const unsub = shellStore.subscribe(() => { hits += 1; });
    shellStore.setSectionMode(false); // already false
    expect(hits).toBe(0);
    shellStore.setSectionMode(true);
    expect(hits).toBe(1);
    unsub();
  });

  it('setSectionAxis / setSectionFlip / setSectionPosition update fields', () => {
    shellStore.setSectionAxis('x');
    shellStore.setSectionFlip(true);
    shellStore.setSectionPosition(12.5);
    const s = shellStore.getSnapshot();
    expect(s.sectionAxis).toBe('x');
    expect(s.sectionFlip).toBe(true);
    expect(s.sectionPosition).toBe(12.5);
  });

  it('setSectionPosition is idempotent on equal value', () => {
    shellStore.setSectionPosition(5);
    let hits = 0;
    const unsub = shellStore.subscribe(() => { hits += 1; });
    shellStore.setSectionPosition(5);
    expect(hits).toBe(0);
    unsub();
  });
});

describe('shellStore cutaway state', () => {
  beforeEach(() => shellStore.reset());

  it('defaults: plane shape, positive sides removed, zero offsets, z quarter axis, empty keep-whole', () => {
    const s = shellStore.getSnapshot();
    expect(s.sectionShape).toBe('plane');
    expect(s.sectionSides).toEqual({ x: true, y: true, z: true });
    expect(s.sectionOffsets).toEqual({ x: 0, y: 0, z: 0 });
    expect(s.sectionQuarterAxis).toBe('z');
    expect(s.sectionKeepWhole.size).toBe(0);
  });

  it('setSectionShape switches and is idempotent', () => {
    let hits = 0;
    const unsub = shellStore.subscribe(() => { hits += 1; });
    shellStore.setSectionShape('octant');
    expect(shellStore.getSnapshot().sectionShape).toBe('octant');
    shellStore.setSectionShape('octant'); // same value → no fan-out
    expect(hits).toBe(1);
    unsub();
  });

  it('setSectionSide / setSectionOffset update one axis immutably', () => {
    const before = shellStore.getSnapshot().sectionSides;
    shellStore.setSectionSide('y', false);
    expect(shellStore.getSnapshot().sectionSides).toEqual({ x: true, y: false, z: true });
    expect(before).toEqual({ x: true, y: true, z: true }); // old object untouched
    shellStore.setSectionOffset('x', 12.5);
    expect(shellStore.getSnapshot().sectionOffsets).toEqual({ x: 12.5, y: 0, z: 0 });
  });

  it('setSectionQuarterAxis switches', () => {
    shellStore.setSectionQuarterAxis('x');
    expect(shellStore.getSnapshot().sectionQuarterAxis).toBe('x');
  });

  it('toggleSectionKeepWhole adds then removes a key', () => {
    shellStore.toggleSectionKeepWhole('servo_left');
    expect(shellStore.getSnapshot().sectionKeepWhole.has('servo_left')).toBe(true);
    shellStore.toggleSectionKeepWhole('servo_left');
    expect(shellStore.getSnapshot().sectionKeepWhole.has('servo_left')).toBe(false);
  });

  it('pruneSectionKeepWhole drops stale keys only, no fan-out when all valid', () => {
    shellStore.toggleSectionKeepWhole('a');
    shellStore.toggleSectionKeepWhole('b');
    let hits = 0;
    const unsub = shellStore.subscribe(() => { hits += 1; });
    shellStore.pruneSectionKeepWhole(['a', 'b', 'c']);
    expect(hits).toBe(0);
    shellStore.pruneSectionKeepWhole(['a']);
    expect([...shellStore.getSnapshot().sectionKeepWhole]).toEqual(['a']);
    expect(hits).toBe(1);
    unsub();
  });

  it('turning section mode off clears keep-whole', () => {
    shellStore.setSectionMode(true);
    shellStore.toggleSectionKeepWhole('housing');
    shellStore.setSectionMode(false);
    expect(shellStore.getSnapshot().sectionKeepWhole.size).toBe(0);
    shellStore.toggleSectionMode();        // on
    shellStore.toggleSectionKeepWhole('housing');
    shellStore.toggleSectionMode();        // off via toggle clears too
    expect(shellStore.getSnapshot().sectionKeepWhole.size).toBe(0);
  });
});
