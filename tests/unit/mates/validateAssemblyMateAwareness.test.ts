// tests/unit/mates/validateAssemblyMateAwareness.test.ts
//
// Regression test for the v0.6 mate-graph awareness of the synchronous
// `validateAssembly` function (the path `kernelcad validate` CLI uses).
//
// Surfaced 4× across Exp-B/C/D agent runs (ball-joint, gear-pair,
// robotic-arm, screw-in-block): the v0.5 floating-part walk doesn't see
// v0.6 mate edges, so otherwise-correct mate-only assemblies trip
// `assembly.part.floating` warnings on every part. Fix: read mate edges
// from solvedAssembly records' metadata.mates and fold them into the
// adjacency map.

import { describe, expect, it, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { validateAssembly } from '../../../src/modeling/mates/validator';

describe('validateAssembly is v0.6 mate-aware', () => {
  beforeAll(async () => { await initOcct(); });

  it('does NOT flag floating for a part connected only via a v0.6 mate', async () => {
    const model = await buildModel({
      fileName: 'mate-only.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('base', box(10, 10, 10))
           .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        arm.part('child', box(10, 10, 10))
           .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
        // Only a v0.6 mate. No legacy joints. Pre-fix: validateAssembly
        // would flag both parts as floating.
        arm.mate('m', 'base.p', 'child.q', 'fastened');
        return arm.solvedModel({});
      `,
    });
    const result = validateAssembly({ records: model.records });
    const floating = result.diagnostics.filter((d) => d.code === 'assembly.part.floating');
    expect(floating).toHaveLength(0);
  });

  it('still flags floating for parts that are genuinely disconnected', async () => {
    const model = await buildModel({
      fileName: 'one-floating.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('base', box(10, 10, 10))
           .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        arm.part('child', box(10, 10, 10))
           .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
        // 'lonely' has no mate at all — should still get floating warning.
        arm.part('lonely', box(5, 5, 5));
        arm.mate('m', 'base.p', 'child.q', 'fastened');
        return arm.solvedModel({});
      `,
    });
    const result = validateAssembly({ records: model.records });
    const floating = result.diagnostics.filter((d) => d.code === 'assembly.part.floating');
    expect(floating).toHaveLength(1);
    expect(floating[0].partName).toBe('lonely');
  });

  it('handles a 3-part chain wired entirely by mates (no floating warnings)', async () => {
    const model = await buildModel({
      fileName: 'mate-chain.kcad.ts',
      code: `
        const arm = assembly('chain');
        arm.part('a', box(10, 10, 10))
           .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [5, 0, 0] }, axis: [0, 0, 1] });
        arm.part('b', box(10, 10, 10))
           .connector('in',  { type: 'axis', origin: { kind: 'vec3', value: [-5, 0, 0] }, axis: [0, 0, 1] })
           .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [5, 0, 0] }, axis: [0, 0, 1] });
        arm.part('c', box(10, 10, 10))
           .connector('in',  { type: 'axis', origin: { kind: 'vec3', value: [-5, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('m1', 'a.out', 'b.in', 'revolute', { limitsDeg: [0, 90] });
        arm.mate('m2', 'b.out', 'c.in', 'revolute', { limitsDeg: [0, 90] });
        return arm.solvedModel({});
      `,
    });
    const result = validateAssembly({ records: model.records });
    expect(result.diagnostics.filter((d) => d.code === 'assembly.part.floating')).toHaveLength(0);
    expect(result.diagnostics.filter((d) => d.code === 'assembly.part.orphan')).toHaveLength(0);
  });
});
