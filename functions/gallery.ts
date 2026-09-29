// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Cloudflare Pages Function for /gallery: serves the SPA with the gallery's
// static link-preview tags. See functions/_lib/og.ts.

import { galleryTags, serveWithTags, type OgContext } from './_lib/og';

export const onRequest = (context: OgContext): Promise<Response> => serveWithTags(context, galleryTags);
