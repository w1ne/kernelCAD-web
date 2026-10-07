// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { lookupCookbookTool } from './lookupCookbook';

describe('lookupCookbookTool — freight trailer roof solar cookbook', () => {
  it('finds the trailer for roof solar-battery placement queries', async () => {
    for (const query of [
      'freight trailer roof solar batteries optimal placement',
      'box semi-trailer solar battery cabinets on the roof',
      'kingpin bogie load share roof module keep-out',
    ]) {
      const r = await lookupCookbookTool({ query, k: 5 });
      expect(r.ok, query).toBe(true);
      const ids = r.hits!.map((h) => h.id);
      expect(ids, query).toContain('freight-trailer-roof-solar-batteries');
    }
  });
});
