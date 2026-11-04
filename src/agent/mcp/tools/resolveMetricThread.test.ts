// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { callMcpTool } from '../toolRegistry';
import { resolveMetricThreadTool } from './resolveMetricThread';

describe('resolve_metric_thread', () => {
  it('maps 12 mm to M12 coarse', async () => {
    const result = await callMcpTool('resolve_metric_thread', { diameter_mm: 12 });
    expect(result).toMatchObject({
      ok: true,
      spec: 'M12x1.75',
      diameter_mm: 12,
      pitch_mm: 1.75,
      coarse: true,
      tap_drill_mm: 10.25,
      kind_matched: 'nominal',
    });
  });

  it('maps a tap drill and refuses an unknown diameter', () => {
    expect(resolveMetricThreadTool({ diameter_mm: 5, kind: 'tap_drill' })).toMatchObject({
      ok: true,
      spec: 'M6x1',
      diameter_mm: 6,
      kind_matched: 'tap_drill',
    });
    const refused = resolveMetricThreadTool({ diameter_mm: 7.3 });
    expect(refused.ok).toBe(false);
    expect(refused.errorCode).toBe('feature.invalid-args');
    expect(refused.error).toMatch(/clearanceFitForHoleDiameter/);
  });

  it('lists both specs when the diameter is equidistant', () => {
    const refused = resolveMetricThreadTool({ diameter_mm: 1.1, kind: 'nominal', tolerance_mm: 0.1 });
    expect(refused.ok).toBe(false);
    expect(refused.candidates).toEqual(expect.arrayContaining(['M1x0.25', 'M1.2x0.25']));
  });

  it('does not treat a clearance bore as a nominal M12', () => {
    const refused = resolveMetricThreadTool({ diameter_mm: 13.5, kind: 'nominal' });
    expect(refused.ok).toBe(false);
    expect(refused.spec).toBeUndefined();
    expect(refused.error).not.toMatch(/M12x1\.75/);
  });
});
