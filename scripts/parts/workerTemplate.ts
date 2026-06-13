// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/workerTemplate.ts
//
// The Cloudflare Pages advanced-mode `_worker.js` served from a deployed parts
// catalog. Serves `/v1/parts?q=...` (search) and `/v1/parts/{id}` (detail) over
// the static `/v1/catalog/parts.index.json` asset; everything else (the .step
// blobs, per-part .json) falls through to `env.ASSETS`.
//
// Ingestion-engine extensions over the original ingestParts.ts shim:
//   - GATE G4 / legal-hold: records tagged 'legal-hold' (share-alike collections
//     pending sign-off) are EXCLUDED from `/v1/parts` search results by default.
//     Pass `?includeLegalHold=1` to include them. Direct `/v1/parts/{id}` detail
//     is NOT filtered (an explicit id lookup is an intentional fetch).
//   - `?licenseClass=` filter passthrough on search.
//
// Exported as a string so both ingestParts.ts and the engine write the same
// `_worker.js`.

export const PAGES_WORKER = `// SPDX-License-Identifier: MIT
// Serves /v1/parts?q=... (search) and /v1/parts/{id} (detail) from the static
// /v1/catalog/parts.index.json asset; all other paths fall through to static
// assets. Deploy this directory to Cloudflare Pages and point
// KERNELCAD_PARTS_BASE_URL at it.
//
// Legal-hold records (share-alike collections behind a sign-off gate) are tagged
// 'legal-hold' and excluded from search by default. Pass ?includeLegalHold=1 to
// include them; an explicit /v1/parts/{id} lookup is never filtered.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\\/v1\\/parts(?:\\/(.+))?$/);
    if (!m) return env.ASSETS.fetch(request);

    const idxReq = new Request(url.origin + '/v1/catalog/parts.index.json');
    const res = await env.ASSETS.fetch(idxReq);
    if (!res.ok) return new Response('catalog index unavailable', { status: 502 });
    const items = (await res.json()).items;

    const id = m[1] ? m[1].replace(/\\.json$/, '') : '';
    if (id) {
      // Explicit id lookup: intentional fetch, not filtered by legal-hold.
      const rec = items.find((r) => r.id === id);
      return rec
        ? Response.json(rec)
        : new Response('not found', { status: 404 });
    }

    const includeLegalHold = url.searchParams.get('includeLegalHold') === '1';
    const licenseClass = (url.searchParams.get('licenseClass') || '').toLowerCase();
    const q = (url.searchParams.get('q') || '').toLowerCase();

    const isLegalHold = (r) => (r.tags || []).includes('legal-hold');

    let hits = items;
    if (!includeLegalHold) hits = hits.filter((r) => !isLegalHold(r));
    if (licenseClass) hits = hits.filter((r) => (r.licenseClass || '').toLowerCase() === licenseClass);
    if (q) {
      hits = hits.filter((r) =>
        [r.id, r.name, ...(r.tags || [])].join(' ').toLowerCase().includes(q),
      );
    }
    return Response.json({ items: hits, total: hits.length });
  },
};
`;
