// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { resolveRootId } from './resolveRootId';
import { Shape } from '../capture/proxy';
import { Scene } from '../validation/scene';

describe('resolveRootId', () => {
  it('resolves a returned Shape to its own feature id', () => {
    const shape = new Shape('body#1', {} as never);
    expect(resolveRootId(shape, 'tail#1')).toBe('body#1');
  });

  it('resolves a returned Scene to its source feature id', () => {
    const scene = new Scene('asm', [], () => ({ min: [0, 0, 0], max: [0, 0, 0] }), undefined, 'solved#1');
    expect(resolveRootId(scene, 'tail#1')).toBe('solved#1');
  });

  it('falls back to the tail for a Scene with no source feature', () => {
    const scene = new Scene('asm', [], () => ({ min: [0, 0, 0], max: [0, 0, 0] }));
    expect(resolveRootId(scene, 'tail#1')).toBe('tail#1');
  });

  it('falls back to the tail for anything not lowerable', () => {
    expect(resolveRootId({ some: 'data' }, 'tail#1')).toBe('tail#1');
    expect(resolveRootId(undefined, undefined)).toBeUndefined();
  });
});
