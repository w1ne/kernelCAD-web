// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export interface GalleryManifestEntry {
  slug: string;
  sourceUrl: string | null;
  scriptPath?: string | null;
}

const MARKETING_GALLERY_ORIGIN = 'https://kernelcad.com';

/**
 * Base origin for static gallery assets (gallery.json, per-slug source, and
 * the precomputed `_mesh/<sha>.json` files). On the hosted app subdomain
 * these live cross-origin on the marketing site; everywhere else (dev,
 * preview) they're served same-origin by the vite middleware / static dir.
 */
function galleryAssetBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'app.kernelcad.com') {
    return MARKETING_GALLERY_ORIGIN;
  }
  return '';
}

function galleryManifestUrl(): string {
  return `${galleryAssetBase()}/gallery.json`;
}

/**
 * URL of a build-time precomputed mesh bridge payload, keyed by the sha256
 * hex of the .kcad.ts source. `build-gallery.ts` writes these under
 * `public/gallery/_mesh/<sha>.json` for every curated entry, so the hosted
 * Studio can render a gallery model's initial view from a static CDN file
 * with zero server compute.
 */
export function galleryPrecomputedMeshUrl(sourceSha256Hex: string): string {
  return `${galleryAssetBase()}/gallery/_mesh/${sourceSha256Hex}.json`;
}

function resolveGalleryAssetUrl(sourceUrl: string, manifestUrl: string): string {
  if (/^https?:\/\//i.test(sourceUrl)) return sourceUrl;
  if (/^https?:\/\//i.test(manifestUrl)) return new URL(sourceUrl, manifestUrl).toString();
  return sourceUrl;
}

export async function findGallerySourceUrl(slug: string): Promise<string> {
  const manifestUrl = galleryManifestUrl();
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error(`Failed to load gallery manifest: ${response.status}`);

  const payload = await response.json();
  const entries = Array.isArray(payload?.entries)
    ? payload.entries as GalleryManifestEntry[]
    : [];
  const entry = entries.find(candidate => candidate.slug === slug);
  if (!entry) throw new Error(`Gallery entry not found: ${slug}`);
  if (!entry.sourceUrl) throw new Error(`Gallery entry has no source: ${slug}`);

  return resolveGalleryAssetUrl(entry.sourceUrl, manifestUrl);
}

export async function findGallerySourceUrlForScriptPath(scriptPath: string): Promise<string | null> {
  const manifestUrl = galleryManifestUrl();
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error(`Failed to load gallery manifest: ${response.status}`);

  const payload = await response.json();
  const entries = Array.isArray(payload?.entries)
    ? payload.entries as GalleryManifestEntry[]
    : [];
  const entry = entries.find((candidate) => candidate.scriptPath === scriptPath);
  if (!entry?.sourceUrl) return null;

  return resolveGalleryAssetUrl(entry.sourceUrl, manifestUrl);
}
