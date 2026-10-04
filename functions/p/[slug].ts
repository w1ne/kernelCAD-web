// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Cloudflare Pages Function for /p/:slug: serves the SPA with the project's
// link-preview tags. See functions/_lib/og.ts.

import { serveProjectPage, type OgContext } from '../_lib/og';

export const onRequest = (context: OgContext): Promise<Response> => serveProjectPage(context);
