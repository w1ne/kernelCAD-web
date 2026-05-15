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

export function parseGalleryEntries(input: unknown): GalleryEntriesFile {
  const parsed = galleryEntriesFileSchema.parse(input);
  const slugs = new Set<string>();
  for (const e of parsed.entries) {
    if (slugs.has(e.slug)) throw new Error(`duplicate slug: ${e.slug}`);
    slugs.add(e.slug);
  }
  return parsed;
}
