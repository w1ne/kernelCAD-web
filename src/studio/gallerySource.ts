export interface GalleryManifestEntry {
  slug: string;
  sourceUrl: string | null;
}

export async function findGallerySourceUrl(slug: string): Promise<string> {
  const response = await fetch('/gallery.json');
  if (!response.ok) throw new Error(`Failed to load gallery manifest: ${response.status}`);

  const payload = await response.json();
  const entries = Array.isArray(payload?.entries)
    ? payload.entries as GalleryManifestEntry[]
    : [];
  const entry = entries.find(candidate => candidate.slug === slug);
  if (!entry) throw new Error(`Gallery entry not found: ${slug}`);
  if (!entry.sourceUrl) throw new Error(`Gallery entry has no source: ${slug}`);

  return entry.sourceUrl;
}
