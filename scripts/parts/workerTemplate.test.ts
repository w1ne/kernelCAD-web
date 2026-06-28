// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { PAGES_WORKER } from './workerTemplate';

// The served _worker.js must support the faceted /v1 API that the MCP
// remote client (remoteClient.ts) and agents navigate by. This is a smoke
// guard so the facet/browse handling can't silently regress out of the template.
describe('PAGES_WORKER served catalog API', () => {
  it('routes the browse endpoints', () => {
    expect(PAGES_WORKER).toContain("/v1/categories");
    expect(PAGES_WORKER).toContain("/v1/families");
  });

  it('honors the faceted search params agents send', () => {
    for (const facet of ['category', 'family', 'standard', 'tag', 'licenseClass', 'pageSize', 'q']) {
      expect(PAGES_WORKER).toContain(`'${facet}'`);
    }
  });

  it('still excludes legal-hold by default', () => {
    expect(PAGES_WORKER).toContain('legal-hold');
    expect(PAGES_WORKER).toContain('includeLegalHold');
  });
});
