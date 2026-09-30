// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { lookupCookbookTool } from './lookupCookbook';

describe('lookupCookbookTool — industry O/P/Q chain cookbooks', () => {
  it('finds planetary-gearbox-shop-release for housed planetary queries', async () => {
    for (const query of [
      'shop-release planetary gearbox machined housing carrier cover',
      'planetary stage fastened pose BOM aluminum not tooth contact',
      'do not animate planetary rotation no gear-pair transmission',
    ]) {
      const r = await lookupCookbookTool({ query, k: 5 });
      expect(r.ok, query).toBe(true);
      const ids = r.hits!.map((h) => h.id);
      expect(ids, query).toContain('planetary-gearbox-shop-release');
    }
  });

  it('finds clamshell-enclosure-release-pack for enclosure release queries', async () => {
    for (const query of [
      'clamshell enclosure release pack clevis spine lid swing',
      'instrument case lidDeg animationView gasket seal not modeled',
      'two walled shells BOM drawing explicit hinge drive',
    ]) {
      const r = await lookupCookbookTool({ query, k: 5 });
      expect(r.ok, query).toBe(true);
      const ids = r.hits!.map((h) => h.id);
      expect(ids, query).toContain('clamshell-enclosure-release-pack');
    }
  });

  it('finds nema-shaft-spur-drive-stack for drive-stack queries', async () => {
    for (const query of [
      'NEMA shaft spur drive stack motor plate bearing pinion',
      'stepper stand-in involute pair cylindrical shaft no USD',
      'manufacturable drive stack geometric mesh not tooth contact',
    ]) {
      const r = await lookupCookbookTool({ query, k: 5 });
      expect(r.ok, query).toBe(true);
      const ids = r.hits!.map((h) => h.id);
      expect(ids, query).toContain('nema-shaft-spur-drive-stack');
    }
  });

  it('finds tslot-frame-fastener-bom for frame-corner queries', async () => {
    for (const query of [
      'T-slot frame corner fastener BOM gusset cap screws',
      'two 2020 rails gusset plate aluminum steel screws',
      'frame joint clearance shank T-nuts not modeled',
    ]) {
      const r = await lookupCookbookTool({ query, k: 5 });
      expect(r.ok, query).toBe(true);
      const ids = r.hits!.map((h) => h.id);
      expect(ids, query).toContain('tslot-frame-fastener-bom');
    }
  });

  it('keeps atomic snippets first on their canonical queries', async () => {
    const cases: Array<{ query: string; id: string }> = [
      { query: 'planetary gear stage sun planets ring carrier', id: 'planetary-stage-internal-ring' },
      { query: 'internalSpurGear ringGear annulus Zring pitch compatibility', id: 'planetary-stage-internal-ring' },
      { query: 'machined housing bearing seat bore mounting boss', id: 'multi-feature-machined-housing' },
      { query: 'gearbox housing', id: 'multi-feature-machined-housing' },
      { query: 'NEMA 17 mounting plate four-bolt motor face', id: 'nema-motor-mounting-plate' },
      { query: 'shaft and bearing cylindrical mate 608', id: 'shaft-and-bearing-cylindrical-mate' },
      { query: 'involute spur gear pair 20 degree pressure angle', id: 'involute-spur-gear-pair' },
      { query: '20x20 B-type T-slot extrusion slot 6', id: 'tslot-extrusion-and-bracket' },
      { query: 'clamshell hinge lid pivots on base', id: 'clamshell-hinge-two-part-assembly' },
      { query: 'enclosure lid screw bosses corner taps', id: 'enclosure-lid-with-screw-bosses' },
      { query: 'sheet metal L-bracket fold along x', id: 'sheet-metal-l-bracket-bend' },
      { query: 'bill of materials part quantity material density', id: 'bom-ready-assembly' },
    ];
    for (const c of cases) {
      const r = await lookupCookbookTool({ query: c.query, k: 3 });
      expect(r.ok, c.query).toBe(true);
      expect(r.hits![0].id, c.query).toBe(c.id);
    }
  });
});
