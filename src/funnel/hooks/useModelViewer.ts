// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect } from 'react';

export const MODEL_VIEWER_CDN =
  'https://cdn.jsdelivr.net/npm/@google/model-viewer/dist/model-viewer.min.js';

/**
 * Lazy-load the `<model-viewer>` web component only when a consumer actually
 * needs it. Matches the static landing page's CDN script-tag approach — keeps
 * the ~1MB npm package out of the main Vite bundle and shares the CDN cache
 * with any other page on kernelcad.com that loads it. Shared by the funnel
 * gallery tiles and the Studio 3D-concept preview.
 *
 * Graceful degrade: if the script fails (offline, CSP) the element falls back
 * to its `poster` attribute, rendering as an `<img>` until/unless the custom
 * element registers.
 */
export function useModelViewer(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (window.customElements?.get('model-viewer')) return;
    if (document.querySelector(`script[src="${MODEL_VIEWER_CDN}"]`)) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = MODEL_VIEWER_CDN;
    try {
      document.head.appendChild(script);
    } catch {
      // Graceful degrade in test/SSR environments where head injection is unavailable.
    }
  }, [enabled]);
}
