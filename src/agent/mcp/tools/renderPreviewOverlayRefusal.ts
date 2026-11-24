// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/renderPreviewOverlayRefusal.ts
//
// A requested display texture or LED state that matched no visible part is a
// REFUSAL, not a silent no-op: the caller asked for an overlay and must never
// be told a render succeeded without it.

import { invalidArgsText } from '../../../shared/intent/invalidArgs';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export /** A requested overlay that matched no visible part is a REFUSAL, not a
 *  silent no-op: the caller asked for a texture/LED state and must not be
 *  told a render succeeded without it. */
function overlayRefusalFor(
  overlays: import('../../render/headlessRender').DisplayOverlayResult | undefined,
): CompilerDiagnostic | undefined {
  if (overlays === undefined) return undefined;
  const missing = [...overlays.displaysMissing, ...overlays.indicatorsMissing];
  if (missing.length === 0) return undefined;
  return {
    target: 'export-occt',
    code: 'cli.invalid-args',
    severity: 'error',
    ...invalidArgsText({
      api: 'render_preview({ displays, indicators })',
      path: 'displays[].part',
      gotText: missing.join(', '),
      requires:
        'a part that is visible in the render, matched case-insensitively against the feature id, assembly part '
        + 'name, display name and filter names',
      example: 'render_preview({ preset: "studio", displays: [{ part: "epaper", image: "fb.png" }] })',
      code: 'cli.invalid-args',
    }),
  };
}
