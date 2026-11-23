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
import { groupStepProducts, writeStepAssembly, writeStepProductTree } from './stepAssemblyExport';

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

  it('groups parts by source geometry and colour, keeping one-off parts apart', () => {
    const parts = [
      { name: 'a', sourceId: 'f1', color: '#FF0000' },
      { name: 'b' },
      { name: 'c', sourceId: 'f1', color: '#ff0000' },
      { name: 'd', sourceId: 'f1', color: '#00ff00' },
      { name: 'e' },
    ];
    expect(groupStepProducts(parts).map((g) => g.map((p) => p.name))).toEqual([['a', 'c'], ['b'], ['d'], ['e']]);
  });

  it('writes a repeated product once with one usage occurrence per instance', () => {
    const pin = replicad.makeCylinder(2, 8);
    const at = (x: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 0, 0, 1];
    const write = () => writeStepProductTree('rack', [{
      shape: pin.wrapped,
      name: 'pin',
      color: '#336699',
      instances: [{ name: 'pin_1', transform: at(0) }, { name: 'pin_2', transform: at(10) }, { name: 'pin_3', transform: at(20) }],
    }]);
    const bytes = write();
    const text = new TextDecoder().decode(bytes);
    expect(text.match(/NEXT_ASSEMBLY_USAGE_OCCURRENCE\s*\(/g)).toHaveLength(3);
    expect(text.match(/MANIFOLD_SOLID_BREP\s*\(/g)).toHaveLength(1);
    for (const name of ['rack', 'pin_1', 'pin_2', 'pin_3']) expect(text).toContain(`'${name}'`);
    // Identical input gives identical bytes.
    expect(Buffer.from(write()).equals(Buffer.from(bytes))).toBe(true);
  });

  it('refuses an instance placement that is not rigid', () => {
    const pin = replicad.makeCylinder(2, 8);
    const scaled = [2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    expect(() => writeStepProductTree('rack', [{
      shape: pin.wrapped,
      name: 'pin',
      instances: [{ name: 'pin_scaled', transform: scaled }],
    }])).toThrow(/pin_scaled.*not a rigid transform/);
    expect(() => writeStepProductTree('rack', [])).toThrow(/at least one instance/);
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
