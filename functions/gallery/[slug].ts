// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Cloudflare Pages Function for /gallery/:slug. The SPA has no /gallery/$slug
// route, but curated gallery links of this shape have been shared publicly.
// Send them to the hosted Studio view of that curated entry, which is the
// same target as the entry's `studioUrl` in gallery.json.

import type { OgContext } from '../_lib/og';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

export function galleryEntryRedirect(request: Request, slug: unknown): Response | null {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return null;
  const target = new URL('/studio', request.url);
  target.searchParams.set('gallery', slug);
  return new Response(null, {
    status: 302,
    headers: { Location: target.toString(), 'Cache-Control': 'public, max-age=300' },
  });
}

export const onRequest = (context: OgContext): Promise<Response> =>
  Promise.resolve(galleryEntryRedirect(context.request, context.params.slug) ?? context.next());
