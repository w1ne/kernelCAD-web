// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';
import { validateParamEdits } from './paramValidation';

const declared: SerializedParamEntry[] = [
  { name: 'width', type: 'number', value: 40, defaultValue: 40, meta: { min: 20, max: 80, step: 1 } },
  { name: 'angle', type: 'number', value: 25, defaultValue: 25, meta: { min: -15, max: 55, step: 2 } },
  { name: 'cutaway', type: 'boolean', value: false, defaultValue: false },
  { name: 'finish', type: 'choice', value: 'matte', defaultValue: 'matte', meta: { choices: ['matte', 'gloss'] } },
];

describe('validateParamEdits', () => {
  it('accepts values the declaration allows', () => {
    expect(validateParamEdits(declared, [
      { name: 'width', value: 55 },
      { name: 'cutaway', value: true },
      { name: 'finish', value: 'gloss' },
    ])).toBeNull();
  });

  it('refuses a value outside the range', () => {
    expect(validateParamEdits(declared, [{ name: 'width', value: 81 }])).toMatch(/width/);
    expect(validateParamEdits(declared, [{ name: 'width', value: 19 }])).toMatch(/width/);
  });

  it('refuses the wrong type, an unknown choice, a non-finite number and an unknown param', () => {
    expect(validateParamEdits(declared, [{ name: 'width', value: 'wide' }])).not.toBeNull();
    expect(validateParamEdits(declared, [{ name: 'finish', value: 'chrome' }])).toMatch(/matte, gloss/);
    expect(validateParamEdits(declared, [{ name: 'width', value: Number.NaN }])).toMatch(/finite/);
    expect(validateParamEdits(declared, [{ name: 'height', value: 3 }])).toMatch(/not declared/);
  });

  it('checks the step from min or from the declared default, with float slack', () => {
    expect(validateParamEdits(declared, [{ name: 'width', value: 40.5 }])).toMatch(/step 1/);
    // angle: on the grid from the default (25 + 2k) though not from min (-15 + 2k is odd too: both fine).
    expect(validateParamEdits(declared, [{ name: 'angle', value: 31 }])).toBeNull();
    expect(validateParamEdits(declared, [{ name: 'angle', value: 30 }])).toMatch(/step 2/);
    expect(validateParamEdits([
      { name: 't', type: 'number', value: 0, defaultValue: 0, meta: { min: 0, max: 1, step: 0.1 } },
    ], [{ name: 't', value: 0.1 + 0.2 }])).toBeNull();
  });

  it('passes everything through before any build has reported its params', () => {
    expect(validateParamEdits([], [{ name: 'anything', value: 1 }])).toBeNull();
  });
});
