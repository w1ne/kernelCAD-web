// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type ElectronicsPart = {
  id: string;
  kcad_source?: string;
  attributes?: Record<string, string | number>;
};

const repoRoot = resolve(__dirname, '..');
const manifest = JSON.parse(
  readFileSync(resolve(repoRoot, 'scripts/electronics-parts.json'), 'utf8'),
) as { parts: ElectronicsPart[] };

const requiredUniversalPackages = [
  {
    id: 'nrf54l15-qfn48',
    dimensions: {
      package: 'QFN48 (QFAA)',
      packageLengthMm: 6,
      packageWidthMm: 6,
      packageHeightMm: 0.85,
      pinCount: 48,
      pinPitchMm: 0.4,
    },
  },
  {
    id: 'bmi270-lga14',
    dimensions: {
      package: 'LGA-14',
      packageLengthMm: 3,
      packageWidthMm: 2.5,
      packageHeightMm: 0.83,
      pinCount: 14,
      pinPitchMm: 0.4,
    },
  },
  {
    id: 'max30102-optical',
    dimensions: {
      package: 'optical module',
      packageLengthMm: 5.6,
      packageWidthMm: 3.3,
      packageHeightMm: 1.55,
      pinCount: 14,
      pinPitchMm: 0.8,
    },
  },
  {
    id: 'tmp117-dsbga',
    dimensions: {
      package: 'DSBGA-6 (YBG)',
      packageLengthMm: 1.488,
      packageWidthMm: 0.95,
      packageHeightMm: 0.531,
      pinCount: 6,
      pinPitchMm: 0.4,
    },
  },
  {
    id: 'drv2605-yzf',
    dimensions: {
      package: 'DSBGA-9 (YZF)',
      packageLengthMm: 1.44,
      packageWidthMm: 1.44,
      packageHeightMm: 0.625,
      pinCount: 9,
      pinPitchMm: 0.5,
    },
  },
] as const;

describe('electronics parts catalog', () => {
  it('declares each reusable package with physical metadata and an orientation marker', () => {
    const byId = new Map(manifest.parts.map((part) => [part.id, part]));

    for (const expected of requiredUniversalPackages) {
      const part = byId.get(expected.id);
      expect(part, `missing ${expected.id}`).toBeDefined();
      expect(part?.attributes).toMatchObject(expected.dimensions);
      expect(part?.attributes?.dimensionSource).toMatch(/^https:\/\//);
      expect(part?.kcad_source).toBe(`scripts/parts/authored/${expected.id}.kcad.ts`);

      const source = resolve(repoRoot, part?.kcad_source ?? '');
      expect(existsSync(source), `missing ${source}`).toBe(true);
      expect(readFileSync(source, 'utf8')).toContain('pin-1-marker');
    }
  });
});
