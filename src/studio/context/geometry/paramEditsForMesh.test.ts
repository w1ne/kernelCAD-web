// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { paramEditsForMesh } from './paramEditsForMesh';

const code = [
  "const w = param('Width', 40, { min: 10, max: 80 });",
  "const lid = param('HasLid', true);",
  "const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });",
].join('\n');

describe('paramEditsForMesh', () => {
  it('sends numbers and booleans as overrides and writes text values into the source', () => {
    const { source, params } = paramEditsForMesh(code, { Width: 60, HasLid: false, Screw: 'M5' });
    expect(params).toEqual({ Width: 60, HasLid: false });
    expect(source).toContain("param('Screw', 'M5'");
    expect(source).toContain("param('Width', 40");
  });

  it('leaves the source untouched without text values', () => {
    expect(paramEditsForMesh(code, { Width: 60 }).source).toBe(code);
  });

  it('bakeAll writes every value into the source and sends no overrides', () => {
    const { source, params } = paramEditsForMesh(code, { Width: 60, HasLid: false, Screw: 'M5' }, true);
    expect(params).toEqual({});
    expect(source).toContain("param('Width', 60");
    expect(source).toContain("param('HasLid', false");
    expect(source).toContain("param('Screw', 'M5'");
  });

  it('throws for a param it cannot find', () => {
    expect(() => paramEditsForMesh(code, { Nope: 'x' })).toThrow(/not found/);
  });
});
