import { describe, it, expect, beforeAll } from 'vitest';
import { dfmPreflightTool } from '../../../src/agent/mcp/tools/dfmPreflight';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

describe('dfm_preflight (Slice E)', () => {
  beforeAll(async () => { await initOcct(); });

  it('fails closed with dfm.input.vendor-required when vendor is omitted', async () => {
    const r = await dfmPreflightTool({ file: 'tests/fixtures/shopcheck/passing-bracket.kcad.ts' });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.find(d => d.code === 'dfm.input.vendor-required')).toBeDefined();
  });

  it('fails closed with dfm.input.material-required when material is omitted', async () => {
    const r = await dfmPreflightTool({
      file: 'tests/fixtures/shopcheck/passing-bracket.kcad.ts',
      vendor: 'sendcutsend',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.find(d => d.code === 'dfm.input.material-required')).toBeDefined();
  });

  it('fails closed with dfm.input.thickness-required when neither thicknessIn nor thicknessMm', async () => {
    const r = await dfmPreflightTool({
      file: 'tests/fixtures/shopcheck/passing-bracket.kcad.ts',
      vendor: 'sendcutsend', material: 'aluminum-6061-t6',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.find(d => d.code === 'dfm.input.thickness-required')).toBeDefined();
  });

  it('emits dfm.material.unknown-sku for an off-catalog material', async () => {
    const r = await dfmPreflightTool({
      file: 'tests/fixtures/shopcheck/passing-bracket.kcad.ts',
      vendor: 'sendcutsend', material: 'unobtanium', thicknessIn: 0.125,
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.find(d => d.code === 'dfm.material.unknown-sku')).toBeDefined();
  });

  it('returns ok:true on the passing bracket fixture', async () => {
    const r = await dfmPreflightTool({
      file: 'tests/fixtures/shopcheck/passing-bracket.kcad.ts',
      vendor: 'sendcutsend', material: 'aluminum-6061-t6', thicknessIn: 0.125,
    });
    expect(r.ok).toBe(true);
    expect(r.findings.filter(f => f.severity === 'error')).toHaveLength(0);
  });

  it('reports dfm.bend.radius-below-minimum with @kc[...] ref on the failing-bend fixture', async () => {
    const r = await dfmPreflightTool({
      file: 'tests/fixtures/shopcheck/failing-bend-bracket.kcad.ts',
      vendor: 'sendcutsend', material: 'aluminum-6061-t6', thicknessIn: 0.125,
      service: 'bending',
    });
    expect(r.ok).toBe(false);
    const finding = r.findings.find(f => f.code === 'dfm.bend.radius-below-minimum');
    expect(finding).toBeDefined();
    expect(finding?.measured?.ref).toMatch(/^@kc\[[^\]]+\/(face\/bend|bend)\/\d+\]$/);
    expect(finding?.repairHint?.action).toBe('enlarge');
  });

  it('emits every dfm.* finding into the standard diagnostics stream too', async () => {
    const r = await dfmPreflightTool({
      file: 'tests/fixtures/shopcheck/failing-bend-bracket.kcad.ts',
      vendor: 'sendcutsend', material: 'aluminum-6061-t6', thicknessIn: 0.125,
      service: 'bending',
    });
    for (const f of r.findings) {
      const matched = r.diagnostics.find(d => d.code === f.code);
      expect(matched, `finding ${f.code} not in diagnostics`).toBeDefined();
    }
  });

  it('passes-bracket finding includes vendor, material, service, catalogVersion', async () => {
    const r = await dfmPreflightTool({
      file: 'tests/fixtures/shopcheck/passing-bracket.kcad.ts',
      vendor: 'sendcutsend', material: 'aluminum-6061-t6', thicknessIn: 0.125,
    });
    expect(r.vendor).toBe('sendcutsend');
    expect(r.material?.sku).toBe('aluminum-6061-t6');
    expect(r.material?.displayName).toBe('6061 T6 Aluminum');
    expect(r.service).toBeDefined();
    expect(r.catalogVersion).toBeDefined();
  });
});
