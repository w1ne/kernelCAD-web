// SPDX-License-Identifier: MIT
// Pure profile and compatibility math; geometry/kernel coverage lives elsewhere.
import { describe, expect, it } from 'vitest';
import {
  assertPlanetaryToothCompatibility,
  internalSpurGearBoreOutline,
  spurGearRadii,
  SpurGearProfileError,
} from '../../../src/modeling/spurGear';

describe('internalSpurGear profile math', () => {
  it('inverts tip/root around the pitch circle', () => {
    const bore = internalSpurGearBoreOutline({ module: 1, teeth: 54, pressureAngleDeg: 20, backlash: 0.05 });
    const external = spurGearRadii(1, 54, 20);
    expect(bore.radii.pitch).toBeCloseTo(external.pitch, 9);
    expect(bore.radii.tip).toBeCloseTo(2 * external.pitch - external.tip, 9);
    expect(bore.radii.root).toBeCloseTo(2 * external.pitch - external.root, 9);
    expect(bore.radii.tip).toBeLessThan(bore.radii.pitch);
    expect(bore.radii.root).toBeGreaterThan(bore.radii.pitch);
  });
  it('accepts compatible planetary teeth and rejects incompatible counts', () => {
    expect(() => assertPlanetaryToothCompatibility({ sunTeeth: 18, planetTeeth: 18, ringTeeth: 54 })).not.toThrow();
    expect(() => assertPlanetaryToothCompatibility({ sunTeeth: 18, planetTeeth: 18, ringTeeth: 53 })).toThrow(SpurGearProfileError);
  });
});
