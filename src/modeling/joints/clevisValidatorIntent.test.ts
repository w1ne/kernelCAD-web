// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/joints/clevisValidatorIntent.test.ts
//
// joint.clevis declares two of its own design choices to the validators, so
// a correct clevis is not rejected by gates meant for authoring mistakes:
//   - the tongue-clearance pocket may find no parent material to remove
//     (a parent that carries its fork on spines), which is not a cutter miss;
//   - the fork is fused into the parent by design, so a fork in the same
//     material as the parent is not two same-stock members overlapping.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../agent/mcp/tools/evaluateScript';

const errors = (diags: Array<{ code: string; severity: string }>) =>
  diags.filter(d => d.severity === 'error').map(d => d.code);

describe('joint.clevis — validator intent', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('a parent that carries its fork on spines has no pocket material and still evaluates', async () => {
    // Body ends 8 mm behind the pivot; two spines in the plate slabs carry the
    // fork, so nothing sits between the plates for the pocket to clear.
    const code = `
      const style = { knuckleR: 6, tongueY: 6, forkGapY: 10.2, plateT: 2.4, pinR: 1.6, pinCapR: 2.6, pinCapThickness: 1.9 };
      const slab = style.forkGapY / 2 + style.plateT / 2;
      let parent = box(40, 14, 14, true).translate(-28, 0, 0);
      for (const s of [1, -1]) parent = parent.union(box(16, style.plateT, 8, true).translate(-6, s * slab, 0));
      const child = box(30, 5, 5, true).translate(20, 0, 0);
      const j = joint.clevis({
        parentBody: parent, childBody: child, axis: [0, -1, 0],
        pivotParent: [0, 0, 0], pivotChild: [0, 0, 0], limitsDeg: [0, 90], liftPivot: false, style,
      });
      return j.parentGeometry;
    `;
    const r = await evaluateScriptTool({ code });
    expect(errors(r.diagnostics)).not.toContain('feature.subtractive-noop');
    expect(r.ok).toBe(true);
  });

  it('a fork in the same material as its parent is not flagged as a same-stock overlap', async () => {
    const code = `
      const bone = { baseColor: '#f1efe9', roughness: 0.6 };
      const parent = box(40, 20, 12, true).translate(-20, 0, 0).material(bone);
      const child = box(30, 5, 5, true).translate(20, 0, 0);
      const j = joint.clevis({
        parentBody: parent, childBody: child, axis: [0, -1, 0],
        pivotParent: [0, 0, 6], pivotChild: [0, 0, 0], limitsDeg: [0, 90],
        style: { knuckleR: 6, tongueY: 6, forkGapY: 10.2, plateT: 2.4, pinR: 1.6, forkMaterial: bone },
      });
      return j.parentGeometry;
    `;
    const r = await evaluateScriptTool({ code });
    expect(errors(r.diagnostics)).not.toContain('union.member-overlap');
    expect(r.ok).toBe(true);
  });

  it('an ordinary subtract that removes nothing still fails', async () => {
    const r = await evaluateScriptTool({ code: 'return box(10, 10, 10).subtract(box(2, 2, 2).translate(50, 50, 50));' });
    expect(errors(r.diagnostics)).toContain('feature.subtractive-noop');
  });
});
