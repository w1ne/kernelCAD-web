// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { stepBodyName } from './singleBodyStepExport';

describe('stepBodyName', () => {
  it('drops the directory and the script extension', () => {
    expect(stepBodyName('bracket.kcad.ts')).toBe('bracket');
    expect(stepBodyName('/work/parts/motor-mount.kcad.ts')).toBe('motor-mount');
    expect(stepBodyName('C:\\work\\parts\\motor mount.ts')).toBe('motor mount');
    expect(stepBodyName('plate.kcad.js')).toBe('plate');
  });

  it('keeps a dot that is part of the name', () => {
    expect(stepBodyName('housing.v2.kcad.ts')).toBe('housing.v2');
  });

  it("falls back to 'part' when no name is left", () => {
    expect(stepBodyName('')).toBe('part');
    expect(stepBodyName('.kcad.ts')).toBe('part');
    expect(stepBodyName('dir/')).toBe('part');
  });
});
