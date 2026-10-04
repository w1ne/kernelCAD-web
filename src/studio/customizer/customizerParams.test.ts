// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';
import {
  bakeParamValues,
  changedValues,
  customizerParamsFrom,
  defaultValues,
  downloadFileName,
  readUrlValues,
  writeUrlValues,
} from './customizerParams';

const entries: SerializedParamEntry[] = [
  { name: 'Width', type: 'number', value: 40, defaultValue: 40, meta: { min: 10, max: 80, description: 'outer width' } },
  { name: 'HasLid', type: 'boolean', value: true, defaultValue: true },
  { name: 'Screw', type: 'choice', value: 'M4', defaultValue: 'M4', meta: { choices: ['M3', 'M4', 'M5'] } },
  { name: 'Label', type: 'string', value: 'KCAD', defaultValue: 'KCAD', meta: { maxLength: 8 } },
];

const code = [
  "const w = param('Width', 40, { min: 10, max: 80 });",
  "const lid = param('HasLid', true);",
  "const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });",
  "const label = param('Label', 'KCAD', { maxLength: 8 });",
].join('\n');

const params = customizerParamsFrom(entries, [{ name: 'Width', unit: 'mm', step: 5 }, { name: 'Label', unit: 'x' }]);

describe('customizerParamsFrom', () => {
  it('keeps declaration order, type, range, options, and project hints', () => {
    expect(params.map((p) => [p.name, p.type])).toEqual([
      ['Width', 'number'], ['HasLid', 'boolean'], ['Screw', 'choice'], ['Label', 'string'],
    ]);
    expect(params[0]).toMatchObject({ min: 10, max: 80, step: 5, unit: 'mm', description: 'outer width', defaultValue: 40 });
    expect(params[2].choices).toEqual(['M3', 'M4', 'M5']);
    expect(params[3]).toMatchObject({ maxLength: 8, unit: 'x' });
    expect(params[3].step).toBeUndefined();
  });

  it('takes the step 1 for an integer hint and derives one from the range otherwise', () => {
    const [integer] = customizerParamsFrom([entries[0]], [{ name: 'Width', kind: 'integer' }]);
    expect(integer.step).toBe(1);
    // 10–80 declared: a step of 0.1 would be finer than any user needs; 40 is whole.
    expect(customizerParamsFrom([entries[0]])[0].step).toBe(1);
  });
});

describe('customizerParamsFrom presentation', () => {
  const num = (name: string, value: number, meta?: SerializedParamEntry['meta']): SerializedParamEntry =>
    ({ name, type: 'number', value, defaultValue: value, ...(meta ? { meta } : {}) });

  it('humanises raw names into labels, and a declared label wins', () => {
    const [plateW, m4, declared] = customizerParamsFrom([
      num('plateW', 50),
      num('m4HeadDia', 7.2),
      num('earOverlap', 6, { label: '  Ear overlap (each side) ' }),
    ]);
    expect(plateW.label).toBe('Plate width');
    expect(m4.label).toBe('M4 head diameter');
    expect(declared.label).toBe('Ear overlap (each side)');
  });

  it('takes unit, step and group from param() metadata before project hints and guesses', () => {
    const [p] = customizerParamsFrom(
      [num('plateT', 4, { min: 2, max: 12, unit: 'in', step: 0.5, group: 'Plate' })],
      [{ name: 'plateT', unit: 'mm', step: 1 }],
    );
    expect(p).toMatchObject({ unit: 'in', step: 0.5, group: 'Plate', range: { min: 2, max: 12 } });
  });

  it('guesses a unit and derives a slider range and step when none is declared', () => {
    const [bore, angle, count, ratio] = customizerParamsFrom([
      num('boreDia', 30.2), num('slotAngle', 0), num('holeCount', 4), num('gearRatio', 2.5),
    ]);
    expect(bore).toMatchObject({ unit: 'mm', range: { min: 0, max: 100 }, step: 0.1 });
    expect(bore.min).toBeUndefined();
    expect(bore.max).toBeUndefined();
    expect(angle).toMatchObject({ unit: '°', range: { min: 0, max: 360 }, step: 1 });
    expect(count).toMatchObject({ range: { min: 0, max: 10 }, step: 1 });
    expect(count.unit).toBeUndefined();
    expect(ratio.unit).toBeUndefined();
  });

  it('adds no slider data to non-number params', () => {
    const [lid] = customizerParamsFrom([entries[1]]);
    expect(lid).toEqual({ name: 'HasLid', label: 'Has lid', type: 'boolean', defaultValue: true });
  });
});

describe('URL values', () => {
  it('round-trips a configuration and keeps other query keys', () => {
    const values = { ...defaultValues(params), Width: 62.5, HasLid: false, Screw: 'M5', Label: 'A B&C' };
    const search = writeUrlValues('?version=3&p.Stale=1', params, values);
    expect(search).toContain('version=3');
    expect(search).not.toContain('Stale');
    expect(readUrlValues(search, params)).toEqual({ values: { Width: 62.5, HasLid: false, Screw: 'M5', Label: 'A B&C' }, ignored: [] });
  });

  it('writes nothing for default values', () => {
    expect(writeUrlValues('?p.Width=50', params, defaultValues(params))).toBe('');
  });

  it('ignores unknown names and values outside the declaration, with a reason', () => {
    const { values, ignored } = readUrlValues(
      '?p.Width=500&p.HasLid=maybe&p.Screw=M9&p.Label=TOOLONGTEXT&p.Nope=1&p.Width=abc&other=1',
      params,
    );
    expect(values).toEqual({});
    expect(ignored).toEqual([
      'Width=500: above 80',
      'HasLid=maybe: not true/false',
      'Screw=M9: not one of the options',
      'Label=TOOLONGTEXT: longer than 8 characters',
      'Nope: no such parameter',
      'Width=abc: not a number',
    ]);
  });

  it('accepts 1/0 for booleans and range edges for numbers', () => {
    expect(readUrlValues('?p.HasLid=0&p.Width=10', params).values).toEqual({ HasLid: false, Width: 10 });
  });
});

describe('bakeParamValues', () => {
  it('writes the values into the param() defaults', () => {
    const baked = bakeParamValues(code, { Width: 60, HasLid: false, Screw: 'M5' });
    expect(baked).toContain("param('Width', 60,");
    expect(baked).toContain("param('HasLid', false)");
    expect(baked).toContain("param('Screw', 'M5',");
    expect(baked).toContain("param('Label', 'KCAD',");
  });

  it('fails loudly when a param cannot be written', () => {
    expect(() => bakeParamValues(code, { Missing: 1 })).toThrow(/not found/);
  });
});

describe('downloadFileName', () => {
  it('names the file after the slug and the changed values', () => {
    const values = { ...defaultValues(params), Width: 60, Label: 'A B/C' };
    expect(changedValues(params, values)).toEqual({ Width: 60, Label: 'A B/C' });
    expect(downloadFileName('my-bracket', params, values, 'stl')).toBe('my-bracket-Width60_LabelA_B_C.stl');
  });

  it('names a drawing <slug>-drawing.pdf, keeping the changed values when there are any', () => {
    expect(downloadFileName('my-bracket', params, defaultValues(params), 'pdf-drawing')).toBe('my-bracket-drawing.pdf');
    const values = { ...defaultValues(params), Width: 60 };
    expect(downloadFileName('my-bracket', params, values, 'pdf-drawing')).toBe('my-bracket-Width60-drawing.pdf');
  });

  it('marks an all-default configuration', () => {
    expect(downloadFileName('my-bracket', params, defaultValues(params), '3mf')).toBe('my-bracket-default.3mf');
  });
});
