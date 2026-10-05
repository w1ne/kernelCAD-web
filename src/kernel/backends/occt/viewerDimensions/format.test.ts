// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { formatMm, groupLabel } from './format';

describe('formatMm', () => {
  it.each([[30, '30'], [12.46, '12.5'], [0.04, '0'], [-3.25, '-3.3'], [99.95, '100']])('%s -> %s', (v, s) => expect(formatMm(v)).toBe(s));
});

describe('groupLabel', () => {
  it('prefixes counts above one', () => {
    expect(groupLabel(4, 'Ø5')).toBe('4× Ø5');
    expect(groupLabel(1, 'Ø5')).toBe('Ø5');
  });
});
