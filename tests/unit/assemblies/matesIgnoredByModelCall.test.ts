// tests/unit/assemblies/matesIgnoredByModelCall.test.ts
//
// Regression test for the `assembly.mates-ignored-by-model-call`
// diagnostic. Surfaced by Exp-D four-bolt-flange-v2: when an agent
// declares mates then ends the script with `arm.model()` (not
// `solvedModel({})`), mate FK never runs and parts stack at their local
// origin. The downstream symptom is bolt-bolt interferences; the root
// cause (model() skips FK) is two reasoning steps removed.
//
// The diagnostic fires at the `assemblyModel` lowering when the captured
// metadata carries `declaredMateCount > 0`.

import { describe, expect, it, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

describe('assembly.mates-ignored-by-model-call diagnostic', () => {
  beforeAll(async () => { await initOcct(); });

  it('fires when arm.model() is used on a mate-bearing assembly', async () => {
    const model = await buildModel({
      fileName: 'model-with-mates.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('base', box(10, 10, 10))
           .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        arm.part('child', box(10, 10, 10))
           .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
        arm.mate('m', 'base.p', 'child.q', 'fastened');
        // Footgun: ends with arm.model(), not arm.solvedModel({})
        return arm.model();
      `,
    });
    const matesIgnored = model.diagnostics.filter(
      (d) => d.code === 'assembly.mates-ignored-by-model-call',
    );
    expect(matesIgnored.length).toBe(1);
    expect(matesIgnored[0].severity).toBe('info');
    expect(matesIgnored[0].message).toContain('1 mate');
    expect(matesIgnored[0].hint).toMatch(/solvedModel/i);
  });

  it('does NOT fire when arm.model() is used on a mate-free assembly', async () => {
    const model = await buildModel({
      fileName: 'model-no-mates.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('a', box(10, 10, 10));
        arm.part('b', box(10, 10, 10), { at: [20, 0, 0] });
        return arm.model();
      `,
    });
    expect(
      model.diagnostics.some((d) => d.code === 'assembly.mates-ignored-by-model-call'),
    ).toBe(false);
  });

  it('does NOT fire when arm.solvedModel({}) is used', async () => {
    const model = await buildModel({
      fileName: 'solvedmodel-with-mates.kcad.ts',
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
      model.diagnostics.some((d) => d.code === 'assembly.mates-ignored-by-model-call'),
    ).toBe(false);
  });
});
