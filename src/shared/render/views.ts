// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/render/views.ts
//
// Single-source-of-truth type for the engineering-view projections used by
// `kernelcad render` and the demo-player's `setRenderView()` API. Lives in
// src/render/ so both the browser-side React component (which can't depend
// on Node-only playwright) and the headless CLI renderer can import it.

export type RenderView = 'front' | 'right' | 'top' | 'iso' | 'back' | 'left' | 'bottom';

/** Default engineering views: what `kernelcad render` and `render_preview`
 *  capture when no views are requested (the 2×2 grid). */
export const CANONICAL_VIEWS: readonly RenderView[] = ['front', 'right', 'top', 'iso'];

/** Every view, in inspection-sheet order: the overview first, then the six
 *  orthographic sides. A model that only looks right from the canonical
 *  four can still hide a missing cutout on its back, left or underside. */
export const SHEET_VIEWS: readonly RenderView[] = ['iso', 'front', 'back', 'left', 'right', 'top', 'bottom'];

export function isRenderView(value: string): value is RenderView {
  return (SHEET_VIEWS as readonly string[]).includes(value);
}
