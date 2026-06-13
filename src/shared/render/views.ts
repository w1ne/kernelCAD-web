// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/render/views.ts
//
// Single-source-of-truth type for the engineering-view projections used by
// `kernelcad render` and the demo-player's `setRenderView()` API. Lives in
// src/render/ so both the browser-side React component (which can't depend
// on Node-only playwright) and the headless CLI renderer can import it.

export type RenderView = 'front' | 'right' | 'top' | 'iso';
