// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';
import { customizerParamsFrom, defaultValues } from './customizerParams';
import { customizerLayout } from './customizerSections';

const entries: SerializedParamEntry[] = Array.from({ length: 10 }, (_, i) => ({
  name: `p${i}`,
  type: 'number' as const,
  value: i,
  defaultValue: i,
  ...(i >= 3 && i <= 4 ? { meta: { group: 'Holes' } } : {}),
  ...(i === 9 ? { meta: { group: 'Lid' } } : {}),
}));
const params = customizerParamsFrom(entries);
const names = (layout: ReturnType<typeof customizerLayout>) =>
  layout.sections.map((s) => [s.group ?? '-', s.params.map((p) => p.name).join(',')]);

describe('customizerLayout', () => {
  it('shows the first six params, grouped, and counts the rest', () => {
    const layout = customizerLayout(params, defaultValues(params), false);
    expect(names(layout)).toEqual([['-', 'p0,p1,p2,p5'], ['Holes', 'p3,p4']]);
    expect(layout.hiddenCount).toBe(4);
  });

  it('always shows a changed value, so a shared configuration is never hidden', () => {
    const layout = customizerLayout(params, { ...defaultValues(params), p9: 99 }, false);
    expect(names(layout)).toEqual([['-', 'p0,p1,p2,p5'], ['Holes', 'p3,p4'], ['Lid', 'p9']]);
    expect(layout.hiddenCount).toBe(3);
  });

  it('shows everything on request, and when only one row would hide', () => {
    expect(customizerLayout(params, defaultValues(params), true).hiddenCount).toBe(0);
    const seven = params.slice(0, 7);
    expect(customizerLayout(seven, defaultValues(seven), false).hiddenCount).toBe(0);
  });
});
