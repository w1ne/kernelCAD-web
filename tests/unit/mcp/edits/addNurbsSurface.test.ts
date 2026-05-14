import { describe, it, expect } from 'vitest';
import { addNurbsSurface } from '../../../../src/mcp/edits/addNurbsSurface';

// The plan's existing add_feature helper inserts before the last top-level
// `return` (brace depth 0). The eval entry point is a `return` at the file
// top level — same shape as cookbook scripts.
const seedCode = [
  "const base = box(10, 10, 10);",
  "return base;",
].join('\n');

describe('add_nurbs_surface AST edit', () => {
  it('inserts nurbsSurface call with controls + degree', () => {
    const r = addNurbsSurface({
      code: seedCode,
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toMatch(/const surface_1 = nurbsSurface\(/);
    expect(r.new_code).toContain('return base;');
  });

  it('inserts surfaceFromCurves call', () => {
    const r = addNurbsSurface({
      code: seedCode,
      section_sketch_ids: ['sketch_1', 'sketch_2'],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('const surface_1 = surfaceFromCurves([sketch_1, sketch_2]);');
  });

  it('numbers consecutive bindings deterministically', () => {
    const codeWithOne = `const surface_1 = nurbsSurface({});\n${seedCode}`;
    const r = addNurbsSurface({
      code: codeWithOne,
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toMatch(/const surface_2 = nurbsSurface/);
  });

  it('respects a user-provided binding_name', () => {
    const r = addNurbsSurface({
      code: seedCode,
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
      binding_name: 'panel',
    });
    expect(r.new_code).toContain('const panel = nurbsSurface(');
  });

  it('serializes weights, knots, and periodic into the call', () => {
    const r = addNurbsSurface({
      code: seedCode,
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
      weights: [[1, 1], [1, 1]],
      knots: { u: [0, 1], v: [0, 1] },
      periodic: { u: false, v: false },
    });
    expect(r.new_code).toContain('weights:');
    expect(r.new_code).toContain('knots:');
    expect(r.new_code).toContain('periodic:');
  });

  it('fails cleanly when neither controls nor section_sketch_ids provided', () => {
    const r = addNurbsSurface({ code: seedCode });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/provide either/);
  });
});
