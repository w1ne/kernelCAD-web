// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it, vi } from 'vitest';
import { forEachSubShape } from './subShapeWalk';

function fakeWalker(downcast: (current: FakeHandle) => FakeHandle) {
  const current = new FakeHandle();
  const explorers: FakeExplorer[] = [];
  class ExplorerConstructor extends FakeExplorer {
    constructor() {
      super(current);
      explorers.push(this);
    }
  }
  const oc = {
    TopAbs_ShapeEnum: { TopAbs_FACE: 'face', TopAbs_SHAPE: 'shape' },
    TopExp_Explorer_2: ExplorerConstructor,
    TopoDS: { Face_1: vi.fn(downcast) },
  };
  return { oc, current, get explorer() { return explorers[0]; } };
}

class FakeHandle {
  deleted = false;
  delete = vi.fn(() => {
    this.deleted = true;
  });
}

class FakeExplorer {
  private visited = false;
  delete = vi.fn();

  constructor(private readonly current: FakeHandle) {}

  More(): boolean {
    return !this.visited;
  }

  Current(): FakeHandle {
    return this.current;
  }

  Next(): void {
    this.visited = true;
  }
}

describe('forEachSubShape handle cleanup', () => {
  it('deletes Current() and the explorer when downcast throws', () => {
    const failure = new Error('downcast failed');
    const walker = fakeWalker(() => {
      throw failure;
    });

    expect(() => forEachSubShape(walker.oc, {}, 'FACE', () => undefined)).toThrow(failure);
    expect(walker.current.deleted).toBe(true);
    expect(walker.explorer.delete).toHaveBeenCalledOnce();
  });

  it('deletes Current() and the explorer when deleting the downcast throws', () => {
    const sub = new FakeHandle();
    sub.delete.mockImplementation(() => {
      throw new Error('sub delete failed');
    });
    const walker = fakeWalker(() => sub);

    expect(() => forEachSubShape(walker.oc, {}, 'FACE', () => undefined)).toThrow('sub delete failed');
    expect(sub.delete).toHaveBeenCalledOnce();
    expect(walker.current.deleted).toBe(true);
    expect(walker.explorer.delete).toHaveBeenCalledOnce();
  });

  it('deletes both sub-shape handles when the visitor throws', () => {
    const sub = new FakeHandle();
    const walker = fakeWalker(() => sub);

    expect(() => forEachSubShape(walker.oc, {}, 'FACE', () => {
      throw new Error('visitor failed');
    })).toThrow('visitor failed');
    expect(sub.deleted).toBe(true);
    expect(walker.current.deleted).toBe(true);
    expect(walker.explorer.delete).toHaveBeenCalledOnce();
  });
});
