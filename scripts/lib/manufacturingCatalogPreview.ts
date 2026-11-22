// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Manufacturing catalog cards must match the existing native gallery poster
// preset. Source geometry is evaluated, then captured by render_preview's
// deterministic publish renderer; no text is baked into the image.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { renderPreviewTool, type RenderPreviewInput, type RenderPreviewOutput } from '../../src/agent/mcp/tools/renderPreview';

export const MANUFACTURING_PREVIEW = Object.freeze({
  preset: 'publish' as const,
  background: '#F4ECD7',
  width: 720,
  height: 540,
});
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

type Renderer = (input: RenderPreviewInput) => Promise<RenderPreviewOutput>;

export async function renderManufacturingCatalogPreview(source: string, renderer: Renderer = renderPreviewTool): Promise<Buffer> {
  const outDir = mkdtempSync(join(tmpdir(), 'kernelcad-manufacturing-preview-'));
  try {
    const result = await renderer({
      file: resolve(source),
      out_dir: outDir,
      ...MANUFACTURING_PREVIEW,
      // Publishing images is not assembly acceptance. Some catalog stand-ins
      // intentionally have unverified contact; render their actual CAD source
      // without stamping an unrelated mechanism-review warning into the card.
      no_mechanism_check: true,
    });
    const hero = result.images.find(image => image.name === 'hero');
    if (!result.ok || result.mechanism === 'broken' || !hero) {
      throw new Error(`Manufacturing preview failed for ${source}: ${result.error ?? result.mechanism ?? 'missing hero'}`);
    }
    const png = readFileSync(hero.path);
    if (png.length <= PNG_SIGNATURE.length || !png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
      throw new Error(`Manufacturing preview returned invalid PNG for ${source}`);
    }
    return png;
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}
