// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Link-preview Pages Functions (functions/). No Cloudflare runtime: the API,
// the edge cache and the static asset (`context.next()`) are fakes. The tests
// sit outside functions/ because wrangler bundles every file there as a route.

import { readFileSync } from 'node:fs';
import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_IMAGE,
  OG_END,
  OG_START,
  PROJECT_DESCRIPTION,
  escapeHtml,
  fetchProjectOg,
  injectOgTags,
  type LookupCache,
  type OgContext,
} from '../../../functions/_lib/og';
import { onRequest as onProjectPage } from '../../../functions/p/[slug]';
import { onRequest as onEmbedPage } from '../../../functions/embed/[slug]';
import { onRequest as onGalleryPage } from '../../../functions/gallery';

const INDEX_HTML = readFileSync('index.html', 'utf8');
const API = 'https://api.example.test';
const IMAGE = `${API}/api/v1/projects/bracket-abc/og.png?v=2026-09-28T10%3A11%3A12.000Z`;
const HOSTILE_TITLE = `Bracket "v2" </title><script>alert('x')</script> & $& co`;

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
}

function htmlAsset(): Response {
  return new Response(INDEX_HTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ETag: '"static"', 'Content-Length': '1' },
  });
}

function memoryCache(): LookupCache & { store: Map<string, Response> } {
  const store = new Map<string, Response>();
  return {
    store,
    match: async (k) => store.get(k)?.clone(),
    put: async (k, r) => {
      store.set(k, r);
    },
  };
}

function context(path: string, apiFetch: typeof fetch, method = 'GET'): OgContext {
  vi.stubGlobal('fetch', apiFetch);
  const slug = path.split('/')[2] ?? '';
  return {
    request: new Request(`https://app.kernelcad.com${path}?utm_source=chat`, { method }),
    env: { API_BASE_URL: API },
    params: { slug },
    next: async () => htmlAsset(),
    waitUntil: () => undefined,
  };
}

function metaContent(html: string, key: string): string | null {
  const m = html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)" />`));
  return m ? m[1] : null;
}

const publicApi = (title = HOSTILE_TITLE, image: string | null = IMAGE) =>
  vi.fn(async () => jsonResponse(200, { slug: 'bracket-abc', title, image })) as unknown as typeof fetch;
const notFoundApi = () => vi.fn(async () => jsonResponse(404, { error: 'not_found' })) as unknown as typeof fetch;

describe('index.html', () => {
  it('ships generic tags inside the replaceable block', () => {
    const start = INDEX_HTML.indexOf(OG_START);
    const end = INDEX_HTML.indexOf(OG_END);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = INDEX_HTML.slice(start, end);
    expect(metaContent(block, 'og:title')).toBe('kernelCAD — CAD for agents');
    expect(metaContent(block, 'og:image')).toBe(DEFAULT_IMAGE);
    expect(metaContent(block, 'twitter:card')).toBe('summary_large_image');
  });
});

describe('/p/:slug', () => {
  it('injects escaped per-project tags for a public project', async () => {
    const api = publicApi();
    const res = await onProjectPage(context('/p/bracket-abc', api));
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(api).toHaveBeenCalledWith(`${API}/api/v1/projects/bracket-abc/og`, expect.anything());
    // The hostile title is escaped everywhere; it never closes a tag.
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('</title><script>');
    const escaped = escapeHtml(HOSTILE_TITLE);
    expect(html).toContain(`<title>${escaped} · kernelCAD</title>`);
    expect(metaContent(html, 'og:title')).toBe(escaped);
    expect(metaContent(html, 'og:description')).toBe(PROJECT_DESCRIPTION);
    expect(metaContent(html, 'og:image')).toBe(escapeHtml(IMAGE));
    expect(metaContent(html, 'og:url')).toBe('https://app.kernelcad.com/p/bracket-abc');
    expect(metaContent(html, 'twitter:card')).toBe('summary_large_image');
    // One tag block and one title: the generic ones were replaced, not added to.
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/<title>/g)).toHaveLength(1);
    // The SPA still boots.
    expect(html).toContain('<div id="root"></div>');
    expect(res.headers.get('etag')).toBeNull();
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('falls back to the generic image when the project has no render', async () => {
    const res = await onProjectPage(context('/p/bracket-abc', publicApi('Bracket', null)));
    const html = await res.text();
    expect(metaContent(html, 'og:title')).toBe('Bracket');
    expect(metaContent(html, 'og:image')).toBe(DEFAULT_IMAGE);
  });

  it('keeps the generic tags for a private or unknown project', async () => {
    const res = await onProjectPage(context('/p/secret-abc', notFoundApi()));
    expect(await res.text()).toBe(INDEX_HTML);
  });

  it('keeps the generic tags when the API fails or times out', async () => {
    const failing = vi.fn(async () => {
      throw new DOMException('timed out', 'TimeoutError');
    }) as unknown as typeof fetch;
    const res = await onProjectPage(context('/p/bracket-abc', failing));
    expect(await res.text()).toBe(INDEX_HTML);
  });

  it('does not call the API for a malformed slug', async () => {
    const api = publicApi();
    const res = await onProjectPage(context('/p/..%2Fadmin', api));
    expect(await res.text()).toBe(INDEX_HTML);
    expect(api).not.toHaveBeenCalled();
  });

  it('answers HEAD without a body', async () => {
    const res = await onProjectPage(context('/p/bracket-abc', publicApi(), 'HEAD'));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });
});

describe('/embed/:slug', () => {
  it('injects the same per-project tags with the embed URL', async () => {
    const res = await onEmbedPage(context('/embed/bracket-abc', publicApi('Bracket')));
    const html = await res.text();
    expect(metaContent(html, 'og:title')).toBe('Bracket');
    expect(metaContent(html, 'og:url')).toBe('https://app.kernelcad.com/embed/bracket-abc');
  });
});

describe('/gallery', () => {
  it('injects static gallery tags without an API call', async () => {
    const api = publicApi();
    const res = await onGalleryPage(context('/gallery', api));
    const html = await res.text();
    expect(html).toContain('<title>Gallery · kernelCAD</title>');
    expect(metaContent(html, 'og:url')).toBe('https://app.kernelcad.com/gallery');
    expect(metaContent(html, 'og:image')).toBe(DEFAULT_IMAGE);
    expect(api).not.toHaveBeenCalled();
  });
});

describe('fetchProjectOg', () => {
  it('caches the lookup per slug, including a 404', async () => {
    const cache = memoryCache();
    const api = publicApi('Bracket');
    await fetchProjectOg('bracket-abc', { apiBase: API, fetchImpl: api, cache });
    const again = await fetchProjectOg('bracket-abc', { apiBase: API, fetchImpl: api, cache });
    expect(again?.title).toBe('Bracket');
    expect(api).toHaveBeenCalledTimes(1);

    const missing = notFoundApi();
    await fetchProjectOg('secret-abc', { apiBase: API, fetchImpl: missing, cache });
    expect(await fetchProjectOg('secret-abc', { apiBase: API, fetchImpl: missing, cache })).toBeNull();
    expect(missing).toHaveBeenCalledTimes(1);
  });

  it('does not cache a server error', async () => {
    const cache = memoryCache();
    const api = vi.fn(async () => jsonResponse(502, { error: 'lookup_failed' })) as unknown as typeof fetch;
    await fetchProjectOg('bracket-abc', { apiBase: API, fetchImpl: api, cache });
    expect(cache.store.size).toBe(0);
  });

  it('drops a non-https image URL', async () => {
    const api = publicApi('Bracket', 'javascript:alert(1)');
    const got = await fetchProjectOg('bracket-abc', { apiBase: API, fetchImpl: api, cache: null });
    expect(got?.image).toBeNull();
  });
});

describe('injectOgTags', () => {
  it('adds the block before </head> when the markers are missing', () => {
    const html = '<html><head><title>x</title></head><body></body></html>';
    const out = injectOgTags(html, {
      documentTitle: 'T',
      title: 'T',
      description: 'D',
      image: DEFAULT_IMAGE,
      url: 'https://app.kernelcad.com/',
    });
    expect(out).toContain('<title>T</title>');
    expect(out.indexOf(OG_START)).toBeLessThan(out.indexOf('</head>'));
  });
});
