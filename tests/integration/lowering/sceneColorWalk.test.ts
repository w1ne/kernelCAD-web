// tests/integration/lowering/sceneColorWalk.test.ts
//
// Integration coverage for `lookupSourceColor`, the SceneBackend emission
// helper used by the solvedAssembly / assemblyModel cases of OcctLowerer.
//
// The helper walks an `assemblyPart` record's upstream input chain
// (shape → base → target) to find the nearest `metadata.color`
// attribution. We exercise it against records produced by the real
// script-runtime so the test reflects the exact FeatureRecord shapes
// agents will actually generate (ColorToken landing on the most-recent
// shape via Shape.color() mutation).
//
// Cases covered:
//   1. Color sits directly on the source Shape.
//   2. Color is set on a deep upstream box behind two fillets.
//   3. No color anywhere upstream → returns undefined.

import { describe, it, expect } from 'vitest';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { lookupSourceColor } from '../../../src/kernel/backends/occt/lookupSourceColor';

describe('lookupSourceColor', () => {
  it('returns color set directly on the source Shape (after a fillet)', async () => {
    // .color() mutates the most-recent record in place — here the fillet,
    // which is the source Shape passed to arm.part('p', ...). The walker
    // hits the color on the very first upstream record.
    const { records } = await runScript({
      fileName: 'color-on-source.kcad.ts',
      code: `
        const arm = assembly('test');
        const p = arm.part('p', box(10, 10, 10).fillet(1).color('plate'));
        return arm.solvedModel({});
      `,
    });
    const part = records.find(r => r.kind === 'assemblyPart');
    expect(part).toBeDefined();
    expect(lookupSourceColor(part!, records)).toBe('plate');
  });

  it('finds color on a deep upstream box behind two fillets', async () => {
    // .color() lands on the box record, then two fillets layer on top
    // without copying the color. The walker must traverse fillet → fillet
    // → box via inputs.base to reach the color.
    const { records } = await runScript({
      fileName: 'color-deep-upstream.kcad.ts',
      code: `
        const arm = assembly('test');
        const colored = box(10, 10, 10).color('plate');
        const filletedOnce = colored.fillet(1);
        const filletedTwice = filletedOnce.fillet(0.5);
        const p = arm.part('p', filletedTwice);
        return arm.solvedModel({});
      `,
    });
    const part = records.find(r => r.kind === 'assemblyPart');
    expect(part).toBeDefined();
    expect(lookupSourceColor(part!, records)).toBe('plate');
  });

  it('returns undefined when no color is set anywhere upstream', async () => {
    const { records } = await runScript({
      fileName: 'no-color.kcad.ts',
      code: `
        const arm = assembly('test');
        const p = arm.part('p', box(10, 10, 10).fillet(1));
        return arm.solvedModel({});
      `,
    });
    const part = records.find(r => r.kind === 'assemblyPart');
    expect(part).toBeDefined();
    expect(lookupSourceColor(part!, records)).toBeUndefined();
  });

  it('returns undefined when called with a non-assemblyPart record', async () => {
    // Defensive guard: the helper is documented as assemblyPart-only.
    // Passing a box record returns undefined regardless of upstream colors.
    const { records } = await runScript({
      fileName: 'guard.kcad.ts',
      code: `
        const arm = assembly('test');
        const p = arm.part('p', box(10, 10, 10).color('plate'));
        return arm.solvedModel({});
      `,
    });
    const boxRecord = records.find(r => r.kind === 'box');
    expect(boxRecord).toBeDefined();
    expect(lookupSourceColor(boxRecord!, records)).toBeUndefined();
  });
});
