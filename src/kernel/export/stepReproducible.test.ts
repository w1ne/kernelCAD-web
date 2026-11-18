// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { makeStepReproducible, renumberStepAutoProductNames, STEP_REPRODUCIBLE_TIME_STAMP } from './stepReproducible';

const NAME = 'Open CASCADE STEP translator 7.6';
const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

function occtStep(timeStamp: string, index: number): string {
  return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Open CASCADE Model'),'2;1');
FILE_NAME('Open CASCADE Shape Model','${timeStamp}',('Author'),(
    'Open CASCADE'),'Open CASCADE STEP processor 7.6','Open CASCADE 7.6'
  ,'Unknown');
ENDSEC;
DATA;
#7 = PRODUCT('${NAME} ${index}',
  '${NAME} ${index}','',(#8));
#20 = PRODUCT('${NAME} ${index}.1','${NAME} ${index}.1','',(#8));
#21 = PRODUCT('${NAME} ${index}.2','${NAME} ${index}.2','',(#8));
#30 = PRODUCT('bracket 12','bracket 12','',(#8));
ENDSEC;
END-ISO-10303-21;
`;
}

describe('makeStepReproducible', () => {
  it('maps exports that differ only in counter and clock to the same bytes', () => {
    const first = makeStepReproducible(enc(occtStep('2026-11-01T13:07:40', 3)), NAME);
    const later = makeStepReproducible(enc(occtStep('2026-11-02T09:00:01', 11)), NAME);
    expect(dec(later)).toBe(dec(first));
    expect(dec(first)).toBe(occtStep(STEP_REPRODUCIBLE_TIME_STAMP, 1));
  });

  it('keeps sub-indices and leaves non-auto names alone', () => {
    const out = dec(renumberStepAutoProductNames(enc(occtStep('t', 7)), NAME));
    expect(out).toContain(`'${NAME} 1.2'`);
    expect(out).toContain("'bracket 12'");
  });

  it('returns the input untouched when already normalized or unrecognised', () => {
    const bytes = enc(occtStep('t', 1));
    expect(renumberStepAutoProductNames(bytes, NAME)).toBe(bytes);
    const junk = enc('not a step file');
    expect(makeStepReproducible(junk, NAME)).toBe(junk);
  });
});
