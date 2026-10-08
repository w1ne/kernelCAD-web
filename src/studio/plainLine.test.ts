// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { plainLine } from './plainLine';

describe('plainLine', () => {
  it('leaves an ordinary sentence alone', () => {
    expect(plainLine('boom')).toBe('boom');
    expect(plainLine('Syntax error at line 1')).toBe('Syntax error at line 1');
    expect(plainLine('WASM failed to initialize')).toBe('WASM failed to initialize');
    expect(plainLine('Part lid floats\nstack')).toBe('Part lid floats');
    expect(plainLine('Export STEP.')).toBe('Export STEP.');
  });

  it('replaces a kernel banner with one line', () => {
    expect(plainLine('OpenCascade Error (Code: 103). This often means an invalid geometric operation.\nstack'))
      .toBe('This shape did not build.');
    expect(plainLine('7')).toBe('This shape did not build.');
    expect(plainLine('')).toBe('This shape did not build.');
  });

  it('turns a kernel failure into the operation that failed', () => {
    expect(plainLine('OCCT fillet failed: StdFail_NotDone')).toBe('Fillet failed.');
    expect(plainLine('loft rails: OCCT MakePipeShell accepts at most 2 rails; got 4.')).toBe('A loft takes two rails at most.');
    expect(plainLine('OCCT could not apply that fillet — try a smaller radius (typically less than half of the face).'))
      .toBe('Try a smaller radius.');
  });

  it('shortens the lectures the checks panel prints', () => {
    expect(plainLine('OCCT rejected the operation. Retry with different params: smaller fillet/chamfer radius, thinner shell wall, translated mirror source, smaller sweep profile, etc.'))
      .toBe('Try a smaller radius, a thinner wall, or a smaller profile.');
    expect(plainLine("Open3d's is_watertight() rejected the STL because OCCT's BRepMesh emits self-intersecting triangles."))
      .toBe('The mesh crosses itself on a cone. Raise the mesh deflection.');
    expect(plainLine('Extend the parent body geometry so its OCCT solid reaches the joint origin at rest pose. Most commonly: increase the height.'))
      .toBe('The joint sits off the part. Lengthen the boss, or move the connector onto it.');
  });

  it('drops a kernel class name and keeps the sentence', () => {
    expect(plainLine('sheetMetalBend: could not access the underlying OCCT shape of the input.'))
      .toBe('sheetMetalBend: could not access the underlying shape of the input.');
  });

  it('stops a long line at a word', () => {
    const shown = plainLine(`Cannot place the hole ${'because the face is too small '.repeat(8)}`, 96);
    expect(shown.startsWith('Cannot place the hole')).toBe(true);
    expect(shown.endsWith('…')).toBe(true);
    expect(shown.length).toBeLessThanOrEqual(96);
  });
});
