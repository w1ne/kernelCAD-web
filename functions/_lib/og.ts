// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Link previews for app.kernelcad.com (Cloudflare Pages Functions).
//
// A link pasted into a chat app unfurls from the `og:*` and `twitter:*` tags
// in the HTML response. Crawlers do not run JS, so the SPA's client-side
// `<title>` never reaches them. The functions in functions/p, functions/embed
// and functions/gallery.ts rewrite the tag block of the built index.html
// (between the `og:start` and `og:end` comments) before it is served.
//
// Project data comes from the API (GET /api/v1/projects/:slug/og). The API
// answers only for public projects, so a private or unknown slug keeps the
// generic tags that index.html ships with. The lookup is cached per slug in
// the edge cache and has a short timeout, so a slow API never blocks the page.
//
// This file exports no onRequest handler, so it is not a route.

export const SITE_NAME = 'kernelCAD';
export const DEFAULT_API_BASE = 'https://api.kernelcad.com';
/** Generic preview image (the marketing site's). */
export const DEFAULT_IMAGE = 'https://kernelcad.com/og-image.png';
export const MADE_WITH = 'Made with kernelCAD.';
export const PROJECT_DESCRIPTION = `A 3D model you can view, change and download. ${MADE_WITH}`;
export const GALLERY_DESCRIPTION = `Parametric 3D models people made with kernelCAD. Open one, change it, download it.`;

/** Upper bound on the API lookup. On timeout the page keeps the generic tags. */
export const META_TIMEOUT_MS = 1500;
/** Longest title placed in the tags. */
export const TITLE_MAX = 120;

export const OG_START = '<!-- og:start -->';
export const OG_END = '<!-- og:end -->';

export interface OgTags {
  /** Document `<title>`. */
  documentTitle: string;
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
  url: string;
}

/** Project data from GET /api/v1/projects/:slug/og. */
export interface ProjectOg {
  slug: string;
  title: string;
  image: string | null;
}

export interface OgEnv {
  /** API origin. Defaults to DEFAULT_API_BASE. */
  API_BASE_URL?: string;
}

/** The subset of the Pages Functions context these handlers use. */
export interface OgContext {
  request: Request;
  env: OgEnv;
  params: Record<string, string | string[] | undefined>;
  next: () => Promise<Response>;
  waitUntil: (p: Promise<unknown>) => void;
}

/** The subset of the Cache API used for the per-slug lookup cache. */
export interface LookupCache {
  match(key: string): Promise<Response | undefined>;
  put(key: string, res: Response): Promise<void>;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape text for an HTML attribute value or text node. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** Collapse whitespace (incl. newlines) and cut to `max` characters. */
export function clampText(s: string, max = TITLE_MAX): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** The tag block that goes between OG_START and OG_END. Every value is escaped. */
export function ogTagsHtml(tags: OgTags): string {
  const meta = (attr: 'property' | 'name', key: string, value: string) =>
    `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`;
  const lines = [
    meta('name', 'description', tags.description),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:title', tags.title),
    meta('property', 'og:description', tags.description),
    meta('property', 'og:image', tags.image),
    ...(tags.imageAlt ? [meta('property', 'og:image:alt', tags.imageAlt)] : []),
    meta('property', 'og:url', tags.url),
    meta('name', 'twitter:card', 'summary_large_image'),
  ];
  return lines.join('\n    ');
}

/**
 * Put `tags` into an index.html: replace the `<title>` and the block between
 * the og markers. Without the markers, the block goes before `</head>`.
 */
export function injectOgTags(html: string, tags: OgTags): string {
  const block = `${OG_START}\n    ${ogTagsHtml(tags)}\n    ${OG_END}`;
  const title = `<title>${escapeHtml(tags.documentTitle)}</title>`;
  // Function replacers: a `$` in user text must not act as a pattern token.
  let out = /<title>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/i, () => title)
    : html.replace(/<\/head>/i, () => `${title}\n  </head>`);
  const start = out.indexOf(OG_START);
  const end = out.indexOf(OG_END);
  if (start !== -1 && end > start) {
    out = out.slice(0, start) + block + out.slice(end + OG_END.length);
  } else {
    out = out.replace(/<\/head>/i, () => `  ${block}\n  </head>`);
  }
  return out;
}

/** Tags for a public project's /p/ or /embed/ page. */
export function projectTags(project: ProjectOg, pageUrl: string): OgTags {
  const title = clampText(project.title) || 'Untitled model';
  return {
    documentTitle: `${title} · ${SITE_NAME}`,
    title,
    description: PROJECT_DESCRIPTION,
    image: project.image ?? DEFAULT_IMAGE,
    imageAlt: project.image ? `Render of ${title}` : undefined,
    url: pageUrl,
  };
}

export function galleryTags(pageUrl: string): OgTags {
  return {
    documentTitle: `Gallery · ${SITE_NAME}`,
    title: `Gallery · ${SITE_NAME}`,
    description: GALLERY_DESCRIPTION,
    image: DEFAULT_IMAGE,
    url: pageUrl,
  };
}

/** Page URL without query or hash: the shared link's canonical form. */
export function canonicalUrl(request: Request): string {
  const u = new URL(request.url);
  return `${u.origin}${u.pathname}`;
}

function defaultCache(): LookupCache | null {
  const c = (globalThis as { caches?: { default?: LookupCache } }).caches;
  return c?.default ?? null;
}

/**
 * Public project data for `slug`, or null (private, unknown, API error or
 * timeout). A response the API marks cacheable (200 and 404) goes into the
 * edge cache, so repeat unfurls and page loads skip the API.
 */
export async function fetchProjectOg(
  slug: string,
  opts: {
    apiBase?: string;
    fetchImpl?: typeof fetch;
    cache?: LookupCache | null;
    waitUntil?: (p: Promise<unknown>) => void;
    timeoutMs?: number;
  } = {},
): Promise<ProjectOg | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(slug)) return null;
  const base = (opts.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  const url = `${base}/api/v1/projects/${encodeURIComponent(slug)}/og`;
  const cache = opts.cache === undefined ? defaultCache() : opts.cache;
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    let res = cache ? await cache.match(url) : undefined;
    if (!res) {
      res = await doFetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(opts.timeoutMs ?? META_TIMEOUT_MS),
      });
      if (cache && (res.status === 200 || res.status === 404)) {
        const put = cache.put(url, res.clone()).catch(() => undefined);
        if (opts.waitUntil) opts.waitUntil(put);
        else await put;
      }
    }
    if (res.status !== 200) return null;
    const body = (await res.json()) as Partial<ProjectOg>;
    if (typeof body.title !== 'string') return null;
    return {
      slug,
      title: body.title,
      image: typeof body.image === 'string' && /^https:\/\//.test(body.image) ? body.image : null,
    };
  } catch {
    return null;
  }
}

/** Serve the SPA's index.html for this request with `tags` in its head. */
export async function serveWithTags(
  context: Pick<OgContext, 'request' | 'next'>,
  tags: (pageUrl: string) => Promise<OgTags | null> | OgTags | null,
): Promise<Response> {
  const { request } = context;
  if (request.method !== 'GET' && request.method !== 'HEAD') return context.next();
  const [asset, resolved] = await Promise.all([context.next(), tags(canonicalUrl(request))]);
  const type = asset.headers.get('content-type') ?? '';
  if (!resolved || asset.status !== 200 || !type.includes('text/html')) return asset;
  const html = injectOgTags(await asset.text(), resolved);
  const headers = new Headers(asset.headers);
  // The body changed: the asset's length and validator no longer describe it.
  headers.delete('content-length');
  headers.delete('etag');
  return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers });
}

/** Handler body shared by /p/:slug and /embed/:slug. */
export function serveProjectPage(context: OgContext): Promise<Response> {
  const raw = context.params['slug'];
  const slug = (Array.isArray(raw) ? raw[0] : raw) ?? '';
  return serveWithTags(context, async (pageUrl) => {
    const project = await fetchProjectOg(slug, {
      apiBase: context.env.API_BASE_URL,
      waitUntil: (p) => context.waitUntil(p),
    });
    return project ? projectTags(project, pageUrl) : null;
  });
}
