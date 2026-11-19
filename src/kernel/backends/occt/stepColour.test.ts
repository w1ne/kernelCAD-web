// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression: a hex colour is an sRGB value, and STEP `COLOUR_RGB` carries the
// same display-space value. The exporter gave the hex channels to OCCT as
// linear RGB, so `#3366cc` reached the file as (0.4845, 0.6652, 0.9063), and
// the importer returned OCCT's linear channels as hex, so a file from another
// system came back darker than its author set it.

import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from './occtBackend';
import { writeStepBody, writeStepProductTree } from './stepAssemblyExport';
import { importStepAssembly } from '../../import/stepAssemblyImport';

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

function fileColours(text: string): number[][] {
  return [...text.matchAll(/COLOUR_RGB\s*\(\s*'[^']*'\s*,([^)]*)\)/g)]
    .map((m) => m[1].split(',').map((v) => Number(v)));
}

function expectChannels(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(3);
  // 1/510 is half of one 8-bit step.
  actual.forEach((value, i) => expect(Math.abs(value - expected[i])).toBeLessThan(1 / 510));
}

describe('STEP colour space', () => {
  beforeAll(async () => {
    await initOcct();
  }, 120_000);

  it('writes a single-body hex colour as the same sRGB channels', () => {
    const text = decode(writeStepBody({ shape: replicad.makeBaseBox(10, 20, 5).wrapped, name: 'plate', color: '#3366cc' }));
    const colours = fileColours(text);
    expect(colours).toHaveLength(1);
    expectChannels(colours[0], [0x33 / 255, 0x66 / 255, 0xcc / 255]);
  });

  it('writes a product-tree hex colour as the same sRGB channels', () => {
    const at = (x: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 0, 0, 1];
    const text = decode(writeStepProductTree('rack', [{
      shape: replicad.makeCylinder(2, 8).wrapped,
      name: 'pin',
      color: '#cc6633',
      instances: [{ name: 'pin_1', transform: at(0) }, { name: 'pin_2', transform: at(10) }],
    }]));
    const colours = fileColours(text);
    expect(colours.length).toBeGreaterThan(0);
    for (const colour of colours) expectChannels(colour, [0xcc / 255, 0x66 / 255, 0x33 / 255]);
  });

  it('reads the sRGB channels of a STEP file as the same hex colour', async () => {
    const written = decode(writeStepBody({ shape: replicad.makeBaseBox(10, 20, 5).wrapped, name: 'plate', color: '#808080' }));
    // Stand in for a file from another system: state the colour directly.
    const foreign = written.replace(/COLOUR_RGB\s*\(\s*'[^']*'\s*,[^)]*\)/, "COLOUR_RGB('',0.2,0.4,0.8)");
    expect(fileColours(foreign)).toEqual([[0.2, 0.4, 0.8]]);
    const snapshot = await importStepAssembly(new TextEncoder().encode(foreign), 'foreign.step');
    expect(snapshot.occurrences).toHaveLength(1);
    expect(snapshot.occurrences[0].color?.hex).toBe('#3366cc');
  });

  it('returns every 8-bit grey level unchanged after a write and a read', async () => {
    for (const level of [0x00, 0x01, 0x0a, 0x0b, 0x33, 0x80, 0xcc, 0xfe, 0xff]) {
      const channel = level.toString(16).padStart(2, '0');
      const hex = `#${channel}${channel}${channel}`;
      const bytes = writeStepBody({ shape: replicad.makeBaseBox(4, 4, 4).wrapped, name: 'cube', color: hex });
      const snapshot = await importStepAssembly(bytes, 'cube.step');
      expect(snapshot.occurrences[0].color?.hex).toBe(hex);
    }
  });
});
