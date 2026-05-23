export interface GalleryManifestEntry {
  slug: string;
  sourceUrl: string | null;
}

const MARKETING_GALLERY_ORIGIN = 'https://kernelcad.com';

function galleryManifestUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'app.kernelcad.com') {
    return `${MARKETING_GALLERY_ORIGIN}/gallery.json`;
  }
  return '/gallery.json';
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
