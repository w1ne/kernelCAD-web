import { describe, it, expect } from 'vitest';
import { dfmPreflightTool } from '../../../src/agent/mcp/tools/dfmPreflight';

describe('dfm_preflight DXF file-input path (Slice E Phase 4)', () => {
  it('passes a clean DXF (mm units, LWPOLYLINE only, BEND layer present)', async () => {
    const r = await dfmPreflightTool({
      dxf: 'tests/fixtures/shopcheck/passing-bracket.dxf',
      vendor: 'sendcutsend', material: 'aluminum-6061-t6', thicknessMm: 3.175,
    });
    expect(r.findings.filter(f => f.severity === 'error')).toHaveLength(0);
  });

  it('flags inches-unit DXF with dfm.units.dxf-not-mm', async () => {
    const r = await dfmPreflightTool({
      dxf: 'tests/fixtures/shopcheck/failing-inches-bracket.dxf',
      vendor: 'sendcutsend', material: 'aluminum-6061-t6', thicknessMm: 3.175,
    });
    expect(r.findings.find(f => f.code === 'dfm.units.dxf-not-mm')).toBeDefined();
    expect(r.ok).toBe(false);
  });

  it('flags SPLINE-on-cut DXF with dfm.dxf.spline-present', async () => {
    const r = await dfmPreflightTool({
      dxf: 'tests/fixtures/shopcheck/failing-spline-bracket.dxf',
      vendor: 'sendcutsend', material: 'aluminum-6061-t6', thicknessMm: 3.175,
    });
    expect(r.findings.find(f => f.code === 'dfm.dxf.spline-present')).toBeDefined();
    expect(r.ok).toBe(false);
  });
});
