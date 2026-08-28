// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// KC-10: lookup_cookbook could not see any mechanism/assembly content — every
// query about connectors, mates, or hinges returned single-body geometry
// snippets (top hit for "assembly with parts, connectors and mates" was
// mirror-half-part). This asserts the cookbook corpus now surfaces the
// mechanism snippets for the queries that used to fall through to
// single-body geometry.
import { describe, it, expect } from 'vitest';
import { lookupCookbookTool } from './lookupCookbook';

const MECHANISM_SNIPPET_IDS = new Set([
  'assembly-connector-and-revolute-mate',
  'clamshell-hinge-two-part-assembly',
]);

describe('lookupCookbookTool — mechanism/assembly coverage (KC-10)', () => {
  const queries = [
    'assembly with parts connectors and mates',
    'hinge',
    'revolute joint',
    'how do I declare a connector',
  ];

  for (const query of queries) {
    it(`returns a mechanism snippet for "${query}"`, async () => {
      const r = await lookupCookbookTool({ query });
      expect(r.ok).toBe(true);
      expect(r.hits!.length).toBeGreaterThan(0);
      const ids = r.hits!.map((h) => h.id);
      expect(ids.some((id) => MECHANISM_SNIPPET_IDS.has(id))).toBe(true);
    });
  }

  it('the returned mechanism snippet shows the tagged connector-origin form, not a bare array', async () => {
    const r = await lookupCookbookTool({ query: 'how do I declare a connector' });
    const hit = r.hits!.find((h) => MECHANISM_SNIPPET_IDS.has(h.id));
    expect(hit).toBeDefined();
    expect(hit!.body).toContain("origin: { kind: 'vec3', value:");
    expect(hit!.body).toMatch(/type: 'axis'/);
    expect(hit!.body).toMatch(/'revolute'/);
  });
});
