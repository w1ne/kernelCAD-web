// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression: a part with no colour in a multi-part STEP export was written
// as red (`DRAUGHTING_PRE_DEFINED_COLOUR('red')`), the default replicad's
// exporter used. The file then stated a colour its author never set, and a
// re-import returned `#ff0000` for the part. A part without a colour must
// stay without one, as the single-body writer already does.

import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from './occtBackend';
import { writeStepAssembly, writeStepProductTree } from './stepAssemblyExport';
import { importStepAssembly } from '../../import/stepAssemblyImport';

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
// OCCT writes pure red as a predefined colour, not as `COLOUR_RGB`.
const colourCount = (text: string) => [...text.matchAll(/(?:COLOUR_RGB|PRE_DEFINED_COLOUR)\s*\(/g)].length;
const at = (x: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 0, 0, 1];

describe('STEP export of a part without a colour', () => {
  beforeAll(async () => {
    await initOcct();
  }, 120_000);

  it('writes no colour for an uncoloured body next to a coloured one', async () => {
    const bytes = writeStepAssembly([
      { shape: replicad.makeBaseBox(10, 20, 5).wrapped, name: 'plate', color: '#3366cc' },
      { shape: replicad.makeCylinder(3, 20).translate([30, 0, 0]).wrapped, name: 'pin' },
    ]);
    expect(colourCount(decode(bytes))).toBe(1);

    const snapshot = await importStepAssembly(bytes, 'bodies.step');
    const byName = new Map(snapshot.occurrences.map((o) => [o.name, o]));
    expect([...byName.keys()].sort()).toEqual(['pin', 'plate']);
    expect(byName.get('plate')?.color?.hex).toBe('#3366cc');
    expect(byName.get('pin')?.color).toBeUndefined();
    // The geometry is unchanged by the missing colour.
    const volumes = snapshot.definitions.map((d) => d.volumeMm3).sort((a, b) => a - b);
    expect(volumes[0]).toBeCloseTo(Math.PI * 9 * 20, 3);
    expect(volumes[1]).toBeCloseTo(1000, 6);
  });

  it('writes no colour at all when no body has one', () => {
    const text = decode(writeStepAssembly([
      { shape: replicad.makeBaseBox(10, 20, 5).wrapped, name: 'plate' },
      { shape: replicad.makeCylinder(3, 20).translate([30, 0, 0]).wrapped, name: 'pin' },
    ]));
    expect(text).toContain('plate');
    expect(text).toContain('pin');
    expect(colourCount(text)).toBe(0);
  });

  it('writes no colour for an uncoloured repeated product in a product tree', async () => {
    const bytes = writeStepProductTree('rack', [
      {
        shape: replicad.makeCylinder(2, 8).wrapped,
        name: 'pin',
        instances: [{ name: 'pin_1', transform: at(0) }, { name: 'pin_2', transform: at(10) }],
      },
      {
        shape: replicad.makeBaseBox(30, 10, 2).wrapped,
        name: 'rail',
        color: '#cc6633',
        instances: [{ name: 'rail_1', transform: at(0) }],
      },
    ]);
    expect(colourCount(decode(bytes))).toBe(1);

    const snapshot = await importStepAssembly(bytes, 'rack.step');
    const byName = new Map(snapshot.occurrences.map((o) => [o.name, o]));
    expect([...byName.keys()].sort()).toEqual(['pin_1', 'pin_2', 'rail_1']);
    expect(byName.get('pin_1')?.color).toBeUndefined();
    expect(byName.get('pin_2')?.color).toBeUndefined();
    expect(byName.get('rail_1')?.color?.hex).toBe('#cc6633');
    // Still one shared definition for the repeated pin, placed 10 mm apart.
    expect(byName.get('pin_1')?.definitionId).toBe(byName.get('pin_2')?.definitionId);
    expect(byName.get('pin_2')!.transform[12] - byName.get('pin_1')!.transform[12]).toBeCloseTo(10, 6);
  });
});
