// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Render iso stills of revision A and B through the same headless
// render_preview pipeline the diff overlay uses.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPreviewTool } from '../../../src/agent/mcp/tools/renderPreview';

const dir = dirname(fileURLToPath(import.meta.url));
for (const side of ['before', 'after'] as const) {
  const r = await renderPreviewTool({
    file: resolve(dir, `${side}.kcad.ts`),
    out_dir: resolve(dir, 'stills', side),
    views: ['iso'],
    no_mechanism_check: true,
  });
  if (!r.ok) throw new Error(r.error ?? `render of ${side} failed`);
  console.log(side, (r.images ?? []).map((i) => i.path).join(', '));
}
