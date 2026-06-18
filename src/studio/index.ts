// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Public entry for kernelCAD Studio when consumed as a library (e.g. embedded
// inside proto.cat). The standalone Vite app still mounts via `main.tsx` →
// `App.tsx`; this barrel exists so hosts can `import { StudioApp,
// StudioConfigProvider } from 'kernelcad/studio'` without reaching into the
// internal module tree.
//
// Phase 1 keeps the surface deliberately small: the `StudioApp` component,
// the embed-time config provider, the controlled-mode props, and the brush
// report payload. Selection events, streaming animation hooks, etc. are not
// part of this release.

export { StudioApp } from './App';
export { StudioConfigProvider, useStudioConfig } from './config/StudioConfigContext';
export type { StudioConfig, BrushReport } from './config/types';
