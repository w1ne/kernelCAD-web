import { describe, it, expect } from 'vitest';
import { parseDxfInput } from '../../../src/agent/shopcheck/parseDxfInput';

describe('parseDxfInput (Slice E Phase 4)', () => {
  it('flags inches-units DXF with dfm.units.dxf-not-mm', () => {
    const result = parseDxfInput('tests/fixtures/shopcheck/failing-inches-bracket.dxf');
    expect(result.ok).toBe(false);
    expect(result.findings.find(f => f.code === 'dfm.units.dxf-not-mm')).toBeDefined();
  });

  it('emits dfm.dxf.spline-present when SPLINE found on the cut layer', () => {
    const result = parseDxfInput('tests/fixtures/shopcheck/failing-spline-bracket.dxf');
    expect(result.findings.find(f => f.code === 'dfm.dxf.spline-present')).toBeDefined();
  });

  it('returns a valid Region for a clean Slice A-shaped DXF', () => {
    const result = parseDxfInput('tests/fixtures/shopcheck/passing-bracket.dxf');
    expect(result.ok).toBe(true);
    expect(result.region).toBeDefined();
    expect(result.region!.outer.length).toBeGreaterThanOrEqual(3);
    expect(result.region!.bendLines.length).toBe(1);
  });

  it('parses tessellation tolerance from the 999 comment block', () => {
    const result = parseDxfInput('tests/fixtures/shopcheck/passing-bracket.dxf');
    expect(result.tolerance).toBeCloseTo(0.05, 3);
  });
});
