// tests/unit/modeling/capture/assemblyCrossSection.test.ts
//
// T6.1 — round-trip the optional `crossSection` field on `arm.part(...)`.
// The closed-form beam path in `kc.kinematic.checkLoadCapacity` reads
// `AssemblyPartStored.crossSection` to derive (c, I) for the bending-stress
// equation; absence falls back to K7 `kinematic.load.beam-not-applicable`.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';

describe('arm.part(name, shape, { crossSection }) — T6.1', () => {
  beforeAll(async () => {
    await initOcct();
  });

  function makeArm() {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    return { kcad, arm };
  }

  it('round-trips a rectangle cross-section onto AssemblyPartStored', () => {
    const { kcad, arm } = makeArm();
    arm.part('beam', kcad.box(50, 5, 200), {
      crossSection: {
        kind: 'rectangle',
        widthMm: 50,
        heightMm: 5,
        lengthMm: 200,
      },
    });
    const stored = arm.__parts()[0];
    expect(stored.crossSection).toEqual({
      kind: 'rectangle',
      widthMm: 50,
      heightMm: 5,
      lengthMm: 200,
    });
  });

  it('round-trips a circle cross-section onto AssemblyPartStored', () => {
    const { kcad, arm } = makeArm();
    arm.part('shaft', kcad.cylinder(10, 100), {
      crossSection: { kind: 'circle', radiusMm: 10, lengthMm: 100 },
    });
    const stored = arm.__parts()[0];
    expect(stored.crossSection).toEqual({
      kind: 'circle',
      radiusMm: 10,
      lengthMm: 100,
    });
  });

  it('round-trips an i-beam cross-section onto AssemblyPartStored', () => {
    const { kcad, arm } = makeArm();
    arm.part('rail', kcad.box(50, 50, 300), {
      crossSection: {
        kind: 'i-beam',
        flangeWidthMm: 50,
        flangeThicknessMm: 5,
        webHeightMm: 40,
        webThicknessMm: 3,
        lengthMm: 300,
      },
    });
    const stored = arm.__parts()[0];
    expect(stored.crossSection?.kind).toBe('i-beam');
  });

  it('records undefined crossSection when the option is omitted', () => {
    const { kcad, arm } = makeArm();
    arm.part('base', kcad.box(10, 10, 10));
    expect(arm.__parts()[0].crossSection).toBeUndefined();
  });

  it('rejects a non-positive length on a rectangle cross-section', () => {
    const { kcad, arm } = makeArm();
    expect(() =>
      arm.part('beam', kcad.box(10, 10, 10), {
        crossSection: {
          kind: 'rectangle',
          widthMm: 5,
          heightMm: 5,
          lengthMm: 0,
        },
      }),
    ).toThrow(/lengthMm.*positive|lengthMm.*finite/i);
  });

  it('rejects a NaN radius on a circle cross-section', () => {
    const { kcad, arm } = makeArm();
    expect(() =>
      arm.part('shaft', kcad.cylinder(10, 100), {
        crossSection: {
          kind: 'circle',
          radiusMm: Number.NaN,
          lengthMm: 100,
        },
      }),
    ).toThrow(/radiusMm/i);
  });
});
