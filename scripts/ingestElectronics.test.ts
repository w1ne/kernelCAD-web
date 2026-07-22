// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { electronicsPartSidecar, type ElectronicsManifest } from './ingestElectronics';

describe('electronicsPartSidecar', () => {
  it('preserves authored part geometry and interface metadata for catalog ingestion', () => {
    const sidecar = electronicsPartSidecar(
      {
        id: 'sg90-micro-servo',
        name: 'SG90 9 g micro-servo',
        family: 'Servo',
        mpn: 'SG90',
        kcad_source: 'scripts/parts/authored/sg90-micro-servo.kcad.ts',
        tags: ['servo', 'pwm'],
        attributes: {
          packageLengthMm: 22.8,
          pinCount: 3,
          connector: 'JR/Futaba/GWS 3-pin female',
        },
      },
      { license: 'MIT', attribution: 'fixture' },
    );

    expect(sidecar).toMatchObject({
      id: 'sg90-micro-servo',
      category: 'Electronics',
      family: 'Servo',
      tags: ['servo', 'pwm'],
      attributes: {
        mpn: 'SG90',
        packageLengthMm: 22.8,
        pinCount: 3,
        connector: 'JR/Futaba/GWS 3-pin female',
      },
      license: 'MIT',
      attribution: 'fixture',
    });
  });

  it('carries both Plotter catalog additions into their generated record sidecars', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(import.meta.dirname, 'electronics-parts.json'), 'utf8'),
    ) as ElectronicsManifest;

    for (const id of ['a4988-stepstick-carrier', 'sg90-micro-servo']) {
      const part = manifest.parts.find((candidate) => candidate.id === id);
      expect(part, `missing fixture part ${id}`).toBeDefined();

      const sidecar = electronicsPartSidecar(part!, manifest);
      expect(sidecar.attributes).toEqual({
        mpn: part!.mpn,
        ...part!.attributes,
      });
    }
  });
});
