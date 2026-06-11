// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { createUserGlobals } from './userGlobals';

describe('createUserGlobals', () => {
  it('exposes both Sketcher and sketcher()', () => {
    class DummySketcher {
      public plane: unknown;
      constructor(plane?: unknown) {
        this.plane = plane;
      }
    }

    const globals = createUserGlobals({ Sketcher: DummySketcher as any });
    expect(globals.Sketcher).toBe(DummySketcher);
    expect(typeof globals.sketcher).toBe('function');

    const inst = globals.sketcher('XY') as any;
    expect(inst).toBeInstanceOf(DummySketcher);
    expect(inst.plane).toBe('XY');
  });
});

