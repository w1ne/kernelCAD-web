// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/directEdit/saveSource.ts
//
// Dev-only save-back for the example script currently open in Studio.
// The `/__kernelcad/source` PUT route is served by the vite dev middleware
// (see src/server/middleware/sourceEndpoint.ts); it is same-origin and has
// no hosted counterpart, so this uses plain `fetch` rather than the
// `apiCall()`/`rewritePath` hosted-routing helper.

import { currentStudioScript } from '../scriptSource';

export async function saveSourceToScript(script: string, source: string): Promise<void> {
  const response = await fetch(`/__kernelcad/source?script=${encodeURIComponent(script)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source }),
  });
  if (!response.ok) {
    throw new Error(`save failed (${response.status})`);
  }
}

export { currentStudioScript };
