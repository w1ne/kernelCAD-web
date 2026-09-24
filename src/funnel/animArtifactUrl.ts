// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Derive the sibling CDN animation-bake URL from a revision mesh URL.
 * mesh-artifacts/<slug>/vN.json → anim-artifacts/<slug>/vN.json
 * (also rewrites latest.json). Returns null when the mesh URL is not a
 * mesh-artifacts CDN path.
 */
export function animArtifactUrlFromMeshUrl(meshUrl: string): string | null {
  try {
    const url = new URL(meshUrl);
    if (!url.pathname.includes('/mesh-artifacts/')) return null;
    url.pathname = url.pathname.replace('/mesh-artifacts/', '/anim-artifacts/');
    return url.toString();
  } catch {
    return null;
  }
}
