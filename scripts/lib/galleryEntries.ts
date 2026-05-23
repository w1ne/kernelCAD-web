import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const galleryMechanismReviewSchema = z.object({
  evidence: z.string().min(1),
});

const galleryEntryBaseSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  title: z.string().min(1).max(80),
  author: z.object({
    handle: z.string().min(1),
    url: z.string().url(),
  }),
  version: z.string().regex(/^v\d+\.\d+(\.\d+)?$/),
  prompt: z.string().min(1),
  video: z.string().min(1),
  code: z.string().url(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mechanismReview: galleryMechanismReviewSchema.optional(),
});

const curatedGalleryEntrySchema = galleryEntryBaseSchema.extend({
  source: z.literal('curated'),
  codeLocal: z.string().min(1),
  appUrl: z.string().url().nullable().default(null),
});

const studioGalleryEntrySchema = galleryEntryBaseSchema.extend({
  source: z.literal('studio'),
  codeLocal: z.string().min(1).nullable().default(null),
  appUrl: z.string({ error: 'studio entries require appUrl' }).url(),
});

export const galleryEntrySchema = z.discriminatedUnion('source', [
  curatedGalleryEntrySchema,
  studioGalleryEntrySchema,
]);

export const galleryEntriesFileSchema = z.object({
  entries: z.array(galleryEntrySchema),
});

export type GalleryEntry = z.infer<typeof galleryEntrySchema>;
export type GalleryEntriesFile = z.infer<typeof galleryEntriesFileSchema>;

export function isMechanismGalleryEntry(entry: GalleryEntry): boolean {
  return entry.tags.includes('mechanism') || entry.mechanismReview !== undefined;
}

export function mechanismReviewEvidencePath(entry: GalleryEntry, entriesDir: string): string | null {
  if (!isMechanismGalleryEntry(entry)) return null;
  const evidence = entry.mechanismReview?.evidence ?? `../../examples/gallery/${entry.slug}/review.json`;
  return path.resolve(entriesDir, evidence);
}

export function validateMechanismReviewEvidence(entry: GalleryEntry, evidence: unknown, evidencePath: string): void {
  const prefix = `entry ${entry.slug}: mechanism review evidence ${evidencePath}`;
  if (typeof evidence !== 'object' || evidence === null || Array.isArray(evidence)) {
    throw new Error(`${prefix} must be a review_cad JSON object`);
  }

  const record = evidence as Record<string, unknown>;
  if (record.tool !== 'review_cad') {
    throw new Error(`${prefix} must declare tool "review_cad"`);
  }
  if (record.ok !== true) {
    throw new Error(`${prefix} must have review_cad ok === true`);
  }

  const fitness = record.fitness;
  if (typeof fitness !== 'object' || fitness === null || Array.isArray(fitness)) {
    throw new Error(`${prefix} must include review_cad fitness`);
  }

  const fitnessRecord = fitness as Record<string, unknown>;
  if (fitnessRecord.functional !== true) {
    throw new Error(`${prefix} must have review_cad fitness.functional === true`);
  }

  const blockingReasons = fitnessRecord.blockingReasons;
  if (!Array.isArray(blockingReasons)) {
    throw new Error(`${prefix} must include review_cad fitness.blockingReasons`);
  }
  if (blockingReasons.length > 0) {
    throw new Error(`${prefix} must have no review_cad fitness.blockingReasons`);
  }
}

export function validateMechanismReviewEvidenceFiles(entries: readonly GalleryEntry[], entriesDir: string): void {
  for (const entry of entries) {
    const evidencePath = mechanismReviewEvidencePath(entry, entriesDir);
    if (evidencePath === null) continue;
    if (!existsSync(evidencePath)) {
      throw new Error(`entry ${entry.slug}: mechanism review evidence not found at ${evidencePath}`);
    }
    validateMechanismReviewEvidence(
      entry,
      JSON.parse(readFileSync(evidencePath, 'utf8')),
      evidencePath,
    );
  }
}

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
