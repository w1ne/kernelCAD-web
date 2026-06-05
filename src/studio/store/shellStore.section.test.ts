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
