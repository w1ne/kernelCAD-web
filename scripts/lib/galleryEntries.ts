import { z } from 'zod';

export const galleryEntrySchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  title: z.string().min(1).max(80),
  author: z.object({
    handle: z.string().min(1),
    url: z.string().url(),
  }),
  version: z.string().regex(/^v\d+\.\d+(\.\d+)?$/),
  prompt: z.string().min(1),
  source: z.enum(['curated', 'studio']),
  video: z.string().min(1),
  codeLocal: z.string().min(1),
  code: z.string().url(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appUrl: z.string().url().nullable().default(null),
});

export const galleryEntriesFileSchema = z.object({
  entries: z.array(galleryEntrySchema),
});

export type GalleryEntry = z.infer<typeof galleryEntrySchema>;
export type GalleryEntriesFile = z.infer<typeof galleryEntriesFileSchema>;

function quarterKey(date: string): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${year}-Q${quarter}`;
}

export function parseGalleryEntries(input: unknown): GalleryEntriesFile {
  const parsed = galleryEntriesFileSchema.parse(input);
  const slugs = new Set<string>();
  const featuredByQuarter = new Map<string, string>();
  for (const e of parsed.entries) {
    if (slugs.has(e.slug)) throw new Error(`duplicate slug: ${e.slug}`);
    slugs.add(e.slug);
    if (e.featured) {
      const key = quarterKey(e.createdAt);
      const existing = featuredByQuarter.get(key);
      if (existing) {
        throw new Error(`featured entry for ${key} already set to ${existing}; ${e.slug} is in the same quarter`);
      }
      featuredByQuarter.set(key, e.slug);
    }
  }
  return parsed;
}
