// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { stlStats } from '../../helpers/stlStats';
import {
  assertPlanetaryToothCompatibility,
  internalSpurGearBoreOutline,
  spurGearRadii,
  SpurGearProfileError,
} from '../../../src/modeling/spurGear';
import { createModelingApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { KernelError } from '../../../src/shared/intent/kernelError';

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('internalSpurGear profile math', () => {
  it('inverts tip/root around the pitch circle', () => {
    const bore = internalSpurGearBoreOutline({
      module: 1,
      teeth: 54,
      pressureAngleDeg: 20,
      backlash: 0.05,
    });
    const external = spurGearRadii(1, 54, 20);
    expect(bore.radii.pitch).toBeCloseTo(external.pitch, 9);
    expect(bore.radii.tip).toBeCloseTo(2 * external.pitch - external.tip, 9);
    expect(bore.radii.root).toBeCloseTo(2 * external.pitch - external.root, 9);
    expect(bore.radii.tip).toBeLessThan(bore.radii.pitch);
    expect(bore.radii.root).toBeGreaterThan(bore.radii.pitch);
  });
});

describe('planetaryToothCompatibility', () => {
  it('accepts Zring = Zsun + 2·Zplanet', () => {
    expect(() =>
      assertPlanetaryToothCompatibility({ sunTeeth: 18, planetTeeth: 18, ringTeeth: 54 }),
    ).not.toThrow();
  });

  it('rejects incompatible ring tooth counts', () => {
    expect(() =>
      assertPlanetaryToothCompatibility({ sunTeeth: 18, planetTeeth: 18, ringTeeth: 53 }),
    ).toThrow(SpurGearProfileError);
  });

  it('is exposed on the modeling API (and aliases resolve)', () => {
    const kcad = createModelingApi({ session: new CaptureSession() });
    expect(() =>
      kcad.planetaryToothCompatibility({ sunTeeth: 12, planetTeeth: 8, ringTeeth: 28 }),
    ).not.toThrow();
    expect(() =>
      kcad.planetaryToothCompatibility({ sunTeeth: 12, planetTeeth: 8, ringTeeth: 27 }),
    ).toThrow(KernelError);
    // Aliases are bound.
    expect(typeof kcad.internalSpurGear).toBe('function');
    expect(typeof kcad.ringGear).toBe('function');
    expect(typeof kcad.internalGear).toBe('function');
  });
});

describe('internalSpurGear solids', () => {
  it('z=54 ring is one connected, watertight solid', async () => {
    const code = `return internalSpurGear({ module: 1, teeth: 54, faceWidth: 6, rimThickness: 4, backlash: 0.05 });`;
    const stl = await runAndExport({ code, fileName: 'ring-54.kcad.ts', format: 'stl' });
    expect(stl.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(stl.diagnostics.map((d) => d.code)).not.toContain('export.mesh.not-watertight');
    const { components, volume } = stlStats(stl.bytes);
    expect(components).toBe(1);
    const { tip, root, pitch } = (() => {
      const external = spurGearRadii(1, 54, 20);
      return {
        tip: 2 * external.pitch - external.tip,
        root: 2 * external.pitch - external.root,
        pitch: external.pitch,
      };
    })();
    const outerR = root + 4;
    // Volume between a tip-hole disk and the outer rim (rough bracket).
    expect(volume).toBeGreaterThan(Math.PI * (outerR * outerR - root * root) * 6 * 0.2);
    expect(volume).toBeLessThan(Math.PI * (outerR * outerR - tip * tip) * 6);
    expect(pitch).toBeCloseTo(27, 9);
  }, 180_000);

  it('ringGear / internalGear aliases evaluate', async () => {
    for (const name of ['ringGear', 'internalGear'] as const) {
      const code = `return ${name}({ module: 1, teeth: 40, faceWidth: 5, rimThickness: 3 });`;
      const stl = await runAndExport({ code, fileName: `${name}.kcad.ts`, format: 'stl' });
      expect(stl.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(stlStats(stl.bytes).components).toBe(1);
    }
  }, 180_000);
});

describe('internalSpurGear mesh with external planet', () => {
  it('18T planet inside 54T ring at m(Zr−Zp)/2 has zero intersection volume', async () => {
    const code = `
const m = 1;
const zR = 54;
const zP = 18;
const a = assembly('internal-mesh');
a.part('ring', internalSpurGear({ module: m, teeth: zR, faceWidth: 5, backlash: 0.05, rimThickness: 4 }));
a.part('planet', spurGear({ module: m, teeth: zP, faceWidth: 5, backlash: 0.05 })
  .rotateZ(zP % 2 === 0 ? 180 / zP : 0)
  .translate(m * (zR - zP) / 2, 0, 0));
return a.model();
`;
    const result = await checkInterference({
      code,
      fileName: 'internal-mesh.kcad.ts',
      epsilonMm3: 1e-9,
    });
    expect(result.partCount).toBe(2);
    expect(result.pairs).toEqual([]);
  }, 180_000);
});
