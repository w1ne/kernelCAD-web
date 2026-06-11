// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { remapSketchNames } from './sketchNaming';

describe('remapSketchNames', () => {
  it('remaps deterministic worker IDs to AST sketch variable names', () => {
    const code = `
      const sketchA = startSketch().hLine(10).close();
      const sketchB = startSketch().hLine(20).close();
      return [sketchA, sketchA.extrude(5)];
    `;

    const sketches = [
      { id: 'sketch-0-seq-0', name: 'sketch1', vertices: new Float32Array([0, 0, 0]) },
      { id: 'sketch-1-seq-1', name: 'sketch2', vertices: new Float32Array([1, 0, 0]) },
      { id: 'return-sketch-0-seq-0', name: 'sketch_ret_1', vertices: new Float32Array([2, 0, 0]) },
    ];

    const remapped = remapSketchNames(sketches, code);
    expect(remapped[0]?.name).toBe('sketchA');
    expect(remapped[1]?.name).toBe('sketchB');
    expect(remapped[2]?.name).toBe('sketchA');
  });

  it('remains stable when code shifts (lines added before)', () => {
    const codeBefore = `const s = startSketch().hLine(10).close(); return s;`;
    const codeAfter = `\n// comment\nconst s = startSketch().hLine(10).close(); return s;`;

    const sketches = [{ id: 'sketch-0-seq-0', name: 'sketch1', vertices: new Float32Array([0]) }];

    const remap1 = remapSketchNames(sketches, codeBefore);
    const remap2 = remapSketchNames(sketches, codeAfter);

    expect(remap1[0]?.name).toBe('s');
    expect(remap2[0]?.name).toBe('s');
  });
});
