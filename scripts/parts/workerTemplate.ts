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
// Serves the /v1 catalog API from the static /v1/catalog/parts.index.json asset;
// all other paths fall through to static assets. Deploy this directory to
// Cloudflare Pages and point KERNELCAD_PARTS_BASE_URL at it.
//
//   GET /v1/parts?q=&category=&family=&standard=&tag=&licenseClass=&pageSize=
//        faceted search. Tokens/facets AND-combine. ?includeLegalHold=1 to
//        include legal-hold (share-alike, pending sign-off) records.
//   GET /v1/parts/{id}      detail (never filtered — explicit fetch)
//   GET /v1/categories      [{ category, count }] for browsing
//   GET /v1/families?category=   [{ family, category, count }] for browsing
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    const loadItems = async () => {
      const res = await env.ASSETS.fetch(new Request(url.origin + '/v1/catalog/parts.index.json'));
      if (!res.ok) return null;
      return (await res.json()).items;
    };

    // --- Browse: categories ---
    if (p === '/v1/categories') {
      const items = await loadItems();
      if (!items) return new Response('catalog index unavailable', { status: 502 });
      const counts = {};
      for (const r of items) {
        if ((r.tags || []).includes('legal-hold')) continue;
        counts[r.category] = (counts[r.category] || 0) + 1;
      }
      const categories = Object.keys(counts).sort().map((c) => ({ category: c, count: counts[c] }));
      return Response.json({ categories, total: categories.length });
    }

    // --- Browse: families (optionally within a category) ---
    if (p === '/v1/families') {
      const items = await loadItems();
      if (!items) return new Response('catalog index unavailable', { status: 502 });
      const cat = (url.searchParams.get('category') || '').toLowerCase();
      const counts = {};
      for (const r of items) {
        if ((r.tags || []).includes('legal-hold')) continue;
        if (cat && (r.category || '').toLowerCase() !== cat) continue;
        const key = r.category + '\\u0000' + r.family;
        counts[key] = (counts[key] || 0) + 1;
      }
      const families = Object.keys(counts).sort().map((k) => {
        const [category, family] = k.split('\\u0000');
        return { family, category, count: counts[k] };
      });
      return Response.json({ families, total: families.length });
    }

    const m = p.match(/^\\/v1\\/parts(?:\\/(.+))?$/);
    if (!m) return env.ASSETS.fetch(request);

    const items = await loadItems();
    if (!items) return new Response('catalog index unavailable', { status: 502 });

    const id = m[1] ? m[1].replace(/\\.json$/, '') : '';
    if (id) {
      const rec = items.find((r) => r.id === id);
      return rec ? Response.json(rec) : new Response('not found', { status: 404 });
    }

    const sp = url.searchParams;
    const includeLegalHold = sp.get('includeLegalHold') === '1';
    const lc = (sp.get('licenseClass') || '').toLowerCase();
    const q = (sp.get('q') || '').toLowerCase();
    const category = (sp.get('category') || '').toLowerCase();
    const family = (sp.get('family') || '').toLowerCase();
    const standard = (sp.get('standard') || '').toLowerCase();
    const tag = (sp.get('tag') || '').toLowerCase();
    const pageSize = Math.max(0, parseInt(sp.get('pageSize') || '0', 10) || 0);

    let hits = items;
    if (!includeLegalHold) hits = hits.filter((r) => !(r.tags || []).includes('legal-hold'));
    if (lc) hits = hits.filter((r) => (r.licenseClass || '').toLowerCase() === lc);
    if (category) hits = hits.filter((r) => (r.category || '').toLowerCase() === category);
    if (family) hits = hits.filter((r) => (r.family || '').toLowerCase() === family);
    if (standard) hits = hits.filter((r) => (r.standard || '').toLowerCase() === standard);
    if (tag) hits = hits.filter((r) => (r.tags || []).some((t) => String(t).toLowerCase() === tag));
    if (q) hits = hits.filter((r) =>
      [r.id, r.name, r.category, r.family, ...(r.tags || [])].join(' ').toLowerCase().includes(q));

    const total = hits.length;
    if (pageSize > 0) hits = hits.slice(0, pageSize);
    return Response.json({ items: hits, total });
  },
};
`;
