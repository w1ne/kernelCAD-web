// tests/integration/lowering/sceneMaterialWalk.test.ts
//
// Integration coverage for `lookupSourceMaterial`, the SceneBackend emission
// helper used by the solvedAssembly / assemblyModel cases of OcctLowerer to
// carry full PBR materials from `.material({...})` through the assembly
// fan-out (peer to `lookupSourceColor` for legacy color strings).
//
// Without this propagation, `.material()` on a shape passed to
// `assembly.part(name, shape)` is silently dropped — transmission glass,
// metalness brass, sheen fabric all render with the renderer default.
//
// Cases covered:
//   1. Material sits directly on the source Shape.
//   2. Material is set on a deep upstream box behind two fillets.
//   3. No material anywhere upstream → returns undefined.
//   4. Defensive guard for non-assemblyPart records.

import { describe, it, expect } from 'vitest';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { lookupSourceMaterial } from '../../../src/kernel/backends/occt/lookupSourceColor';

describe('lookupSourceMaterial', () => {
  it('returns the PBR material set directly on the source Shape', async () => {
    const { records } = await runScript({
      fileName: 'material-on-source.kcad.ts',
      code: `
        const arm = assembly('test');
        const p = arm.part('p', box(10, 10, 10).fillet(1).material({
          baseColor: '#ffffff',
          transmission: 0.95,
          ior: 1.76,
          roughness: 0.04,
        }));
        return arm.solvedModel({});
      `,
    });
    const part = records.find(r => r.kind === 'assemblyPart');
    expect(part).toBeDefined();
    const m = lookupSourceMaterial(part!, records);
    expect(m).toBeDefined();
    expect(m!.baseColor).toBe('#ffffff');
    expect(m!.transmission).toBe(0.95);
    expect(m!.ior).toBe(1.76);
    expect(m!.roughness).toBe(0.04);
  });

  it('finds material on a deep upstream box behind two fillets', async () => {
    const { records } = await runScript({
      fileName: 'material-deep-upstream.kcad.ts',
      code: `
        const arm = assembly('test');
        const seeded = box(10, 10, 10).material({ baseColor: '#e6f1f5', transmission: 0.9 });
        const filletedOnce = seeded.fillet(1);
        const filletedTwice = filletedOnce.fillet(0.5);
        arm.part('p', filletedTwice);
        return arm.solvedModel({});
      `,
    });
    const part = records.find(r => r.kind === 'assemblyPart');
    expect(part).toBeDefined();
    const m = lookupSourceMaterial(part!, records);
    expect(m).toBeDefined();
    expect(m!.baseColor).toBe('#e6f1f5');
    expect(m!.transmission).toBe(0.9);
  });

  it('returns undefined when no material is set anywhere upstream', async () => {
    const { records } = await runScript({
      fileName: 'no-material.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('p', box(10, 10, 10).fillet(1));
        return arm.solvedModel({});
      `,
    });
    const part = records.find(r => r.kind === 'assemblyPart');
    expect(part).toBeDefined();
    expect(lookupSourceMaterial(part!, records)).toBeUndefined();
  });

  it('returns undefined when called with a non-assemblyPart record', async () => {
    const { records } = await runScript({
      fileName: 'guard.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('p', box(10, 10, 10).material({ baseColor: '#ffffff' }));
        return arm.solvedModel({});
      `,
    });
    const boxRecord = records.find(r => r.kind === 'box');
    expect(boxRecord).toBeDefined();
    expect(lookupSourceMaterial(boxRecord!, records)).toBeUndefined();
  });
});
