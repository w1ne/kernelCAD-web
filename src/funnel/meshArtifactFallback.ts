// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/**
 * When a revision-pinned CDN URL 404s (historical ChatGPT embeds pointing at
 * never-uploaded v1.json), fall back to the mutable latest.json alias — but
 * only when latest is at least as new as the request. A newer pin still
 * building must keep polling vN, not paint a stale latest.
 */

const PINNED_MESH_PATH = /^\/mesh-artifacts\/([^/]+)\/v([1-9][0-9]*)\.json$/i;

export function meshArtifactLatestUrl(meshUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(meshUrl);
  } catch {
    return null;
  }
  const match = PINNED_MESH_PATH.exec(parsed.pathname);
  if (!match) return null;
  parsed.pathname = `/mesh-artifacts/${match[1]}/latest.json`;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

/** true when latest may stand in for a missing older pin (not a building newer pin). */
export function shouldAcceptLatestMeshFallback(
  requestedRevision: number | null | undefined,
  latestRevision: number,
): boolean {
  if (typeof requestedRevision !== 'number' || requestedRevision < 1) return true;
  return latestRevision >= requestedRevision;
}
