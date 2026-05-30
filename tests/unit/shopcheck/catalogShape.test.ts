import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const CATALOG = JSON.parse(readFileSync(
  'src/agent/skills/kernelcad-shopcheck/catalogs/vendors/sendcutsend/catalog.json', 'utf-8',
));
const SPECS = JSON.parse(readFileSync(
  'src/agent/skills/kernelcad-shopcheck/catalogs/vendors/sendcutsend/specs.json', 'utf-8',
));
const RULES = JSON.parse(readFileSync(
  'src/agent/skills/kernelcad-shopcheck/catalogs/vendors/sendcutsend/rules.json', 'utf-8',
));
const REGISTRY = JSON.parse(readFileSync(
  'src/agent/skills/kernelcad-shopcheck/catalogs/sources-manifest.json', 'utf-8',
));

describe('sendcutsend catalog shape', () => {
  it('catalog ships the four starter SKUs', () => {
    expect(Object.keys(CATALOG.skus).sort()).toEqual([
      'acrylic-cast', 'aluminum-6061-t6', 'delrin', 'mild-steel-1018',
    ]);
  });

  it('every catalog SKU has matching specs', () => {
    for (const sku of Object.keys(CATALOG.skus)) {
      expect(SPECS.skus[sku], `missing specs for ${sku}`).toBeDefined();
    }
  });

  it('rules.json is exactly 21 rules', () => {
    expect(RULES.rules).toHaveLength(21);
  });

  it('every rule cites a valid dfm.* diagnostic code', async () => {
    const { DIAGNOSTIC_REGISTRY } = await import('../../../src/shared/diagnostics/registry');
    for (const rule of RULES.rules) {
      expect(
        DIAGNOSTIC_REGISTRY[rule.diagnosticCode as keyof typeof DIAGNOSTIC_REGISTRY],
        `unknown code ${rule.diagnosticCode}`,
      ).toBeDefined();
    }
  });

  it('sources-manifest pins the same vendor as the rules.json header', () => {
    expect(REGISTRY.vendors.sendcutsend).toBeDefined();
    expect(RULES.vendor).toBe('sendcutsend');
  });

  it('every source entry has a non-placeholder sha256', () => {
    for (const src of REGISTRY.vendors.sendcutsend.sources) {
      expect(src.sha256).not.toMatch(/^fillme/);
      expect(src.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
