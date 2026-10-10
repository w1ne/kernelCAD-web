// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression: replicad.exportSTEP leaves the STEP work session to two GC
// finalizers (raw object + handle), so a collection after a scene STEP export
// double-frees it and the next OCCT call dies with `memory access out of
// bounds`. writeStepAssembly owns every object explicitly; a forced GC after
// repeated exports must leave the heap usable.

import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { initOcct } from './occtBackend';
import { writeStepAssembly } from './stepAssemblyExport';

setFlagsFromString('--expose-gc');
const gc = runInNewContext('gc') as () => void;
const settle = () => new Promise((r) => setTimeout(r, 10));

describe('writeStepAssembly', () => {
  beforeAll(async () => {
    await initOcct();
  }, 120_000);

  it('writes one named body per part', () => {
    const base = replicad.makeBaseBox(10, 10, 10);
    const pin = replicad.makeCylinder(3, 20).translate([30, 0, 0]);
    const text = new TextDecoder().decode(
      writeStepAssembly([
        { shape: base.wrapped, name: 'base_plate', color: '#336699' },
        { shape: pin.wrapped, name: 'guide_pin' },
      ]),
    );
    expect(text).toContain('ISO-10303-21');
    expect(text).toContain('base_plate');
    expect(text).toContain('guide_pin');
    expect(text).toContain('COLOUR_RGB');
  });

  it('leaves the wasm heap intact after garbage collection', async () => {
    const finalizerErrors: unknown[] = [];
    const origError = console.error;
    console.error = (e: unknown) => {
      finalizerErrors.push(e);
    };
    try {
      for (let i = 0; i < 10; i++) {
        const box = replicad.makeBaseBox(10, 10, 10);
        writeStepAssembly([{ shape: box.wrapped, name: `b${i}` }]);
        gc();
        await settle();
        gc();
        await settle();
      }
      for (let i = 0; i < 10; i++) {
        const mesh = replicad.makeSphere(5 + i).mesh({ tolerance: 0.1, angularTolerance: 0.3 });
        expect(mesh.triangles.length).toBeGreaterThan(0);
      }
    } finally {
      console.error = origError;
    }
    expect(finalizerErrors).toEqual([]);
  }, 120_000);
});
