// tests/unit/assemblies/placementIgnoredByMateFk.test.ts
//
// Regression test for the `assembly.placement-ignored-by-mate-fk`
// diagnostic. Surfaced by Exp-B four-bolt-flange — an agent authored a
// part with both `at:` and a mate that reaches it via FK; the `at:` was
// silently dropped because mate FK overrides authored placements. The
// agent only learned about the override two reasoning steps later when
// the joint-axis-binding gate flagged a BREP mismatch. The new info-
// severity diagnostic surfaces the conflict at the override point.

import { describe, expect, it, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

describe('assembly.placement-ignored-by-mate-fk diagnostic', () => {
  beforeAll(async () => { await initOcct(); });

  it('emits info-severity when a mated part also declares `at:`', async () => {
    const model = await buildModel({
      fileName: 'placement-ignored.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('base', box(10, 10, 10))
           .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        // Part 'child' has BOTH at: AND is mate-positioned. mate FK
        // will override the at:; the diag flags this conflict.
        arm.part('child', box(10, 10, 10), { at: [100, 100, 100] })
           .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
        arm.mate('m', 'base.p', 'child.q', 'fastened');
        return arm.solvedModel({});
      `,
    });
    const placementIgnored = model.diagnostics.filter(
      (d) => d.code === 'assembly.placement-ignored-by-mate-fk',
    );
    expect(placementIgnored.length).toBeGreaterThanOrEqual(1);
    expect(placementIgnored[0].severity).toBe('info');
    expect(placementIgnored[0].message).toContain('child');
    expect(placementIgnored[0].hint).toMatch(/mate connector/i);
  });

  it('does NOT emit when the mated part has no `at:`', async () => {
    const model = await buildModel({
      fileName: 'no-at.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('base', box(10, 10, 10))
           .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        arm.part('child', box(10, 10, 10))
           .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
        arm.mate('m', 'base.p', 'child.q', 'fastened');
        return arm.solvedModel({});
      `,
    });
    expect(
      model.diagnostics.some((d) => d.code === 'assembly.placement-ignored-by-mate-fk'),
    ).toBe(false);
  });

  // The first declared part is where the mate walk starts. No mate places
  // it, so it keeps its `at` and the parts mated to it follow; telling the
  // author that its `at` is ignored would be false.
  it('does NOT emit for the first declared part, which keeps its `at:`', async () => {
    const model = await buildModel({
      fileName: 'root-at.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('base', box(10, 10, 10), { at: [50, 0, 0] })
           .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        arm.part('child', box(10, 10, 10))
           .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
        arm.mate('m', 'base.p', 'child.q', 'fastened');
        return arm.solvedModel({});
      `,
    });
    expect(
      model.diagnostics.filter((d) => d.code === 'assembly.placement-ignored-by-mate-fk'),
    ).toEqual([]);
  });

  it('emits for the mated child with its own `at:` when the root also has `at:`', async () => {
    const model = await buildModel({
      fileName: 'root-and-child-at.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('base', box(10, 10, 10), { at: [50, 0, 0] })
           .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        arm.part('child', box(10, 10, 10), { at: [100, 100, 100] })
           .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
        arm.mate('m', 'base.p', 'child.q', 'fastened');
        return arm.solvedModel({});
      `,
    });
    const placementIgnored = model.diagnostics.filter(
      (d) => d.code === 'assembly.placement-ignored-by-mate-fk',
    );
    expect(placementIgnored.length).toBeGreaterThanOrEqual(1);
    for (const d of placementIgnored) {
      expect(d.message).toContain("'child'");
      expect(d.message).not.toContain("'base'");
    }
  });

  // The walk starts at the first declared part. When that part is in no
  // mate, the mate between `a` and `b` is not solved and both stay at their
  // `at`, so neither `at` is ignored.
  it('does NOT emit for mated parts the walk from the first part does not reach', async () => {
    const model = await buildModel({
      fileName: 'unreached-at.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('fixture', box(10, 10, 10));
        arm.part('a', box(10, 10, 10), { at: [0, 40, 0] })
           .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        arm.part('b', box(10, 10, 10), { at: [0, 40, 5] })
           .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
        arm.mate('m', 'a.p', 'b.q', 'fastened');
        return arm.solvedModel({}, { validate: 'off' });
      `,
    });
    expect(
      model.diagnostics.filter((d) => d.code === 'assembly.placement-ignored-by-mate-fk'),
    ).toEqual([]);
  });

  it('does NOT emit when a part has `at:` but is NOT mated', async () => {
    const model = await buildModel({
      fileName: 'at-no-mate.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('floating', box(10, 10, 10), { at: [50, 0, 0] });
        return arm.solvedModel({});
      `,
    });
    expect(
      model.diagnostics.some((d) => d.code === 'assembly.placement-ignored-by-mate-fk'),
    ).toBe(false);
  });
});
