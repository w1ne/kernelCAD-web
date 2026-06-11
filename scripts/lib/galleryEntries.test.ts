// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseGalleryEntries } from './galleryEntries';

describe('parseGalleryEntries', () => {
  const validEntry = {
    slug: 'desktop-3axis-mates',
    title: 'Desktop 3-axis CNC — mates',
    author: { handle: 'kernelcad', url: 'https://x.com/kernelcad' },
    version: 'v0.6.4',
    prompt: 'Build a desktop 3-axis CNC.',
    source: 'curated' as const,
    video: '../../docs/demos/v0.6/desktop-3axis-mates/build.mp4',
    codeLocal: '../../examples/desktop-3axis-mates.kcad.ts',
    code: 'https://github.com/w1ne/kernelCAD-web/blob/main/examples/desktop-3axis-mates.kcad.ts',
    tags: ['assembly'],
    featured: false,
    createdAt: '2026-05-11',
    appUrl: null,
  };

  it('accepts a valid entries file', () => {
    const result = parseGalleryEntries({ entries: [validEntry] });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].slug).toBe('desktop-3axis-mates');
  });

  it('accepts curated entries because studioUrl can be derived from codeLocal', () => {
    const result = parseGalleryEntries({ entries: [validEntry] });
    expect(result.entries[0].codeLocal).toBe(validEntry.codeLocal);
    expect(result.entries[0].appUrl).toBeNull();
  });

  it('accepts studio entries with appUrl and without codeLocal', () => {
    const entry = {
      ...validEntry,
      slug: 'saved-public-project',
      source: 'studio' as const,
      codeLocal: null,
      appUrl: 'https://app.kernelcad.com/p/public-project',
    };
    const result = parseGalleryEntries({ entries: [entry] });
    expect(result.entries[0].source).toBe('studio');
    expect(result.entries[0].appUrl).toBe(entry.appUrl);
  });

  it('rejects studio entries without appUrl', () => {
    const entry = {
      ...validEntry,
      slug: 'broken-studio-entry',
      source: 'studio' as const,
      codeLocal: null,
      appUrl: null,
    };
    expect(() => parseGalleryEntries({ entries: [entry] })).toThrow(/studio.*appUrl/i);
  });

  it('rejects studio entries when appUrl is omitted', () => {
    const entry = {
      ...validEntry,
      slug: 'omitted-studio-app-url',
      source: 'studio' as const,
      codeLocal: null,
    };
    delete (entry as Partial<typeof entry>).appUrl;
    expect(() => parseGalleryEntries({ entries: [entry] })).toThrow(/studio.*appUrl/i);
  });

  it('rejects entries missing required slug', () => {
    const bad = { ...validEntry } as Partial<typeof validEntry>;
    delete bad.slug;
    expect(() => parseGalleryEntries({ entries: [bad] })).toThrow(/slug/);
  });

  it('rejects duplicate slugs', () => {
    expect(() =>
      parseGalleryEntries({ entries: [validEntry, validEntry] }),
    ).toThrow(/duplicate slug/i);
  });

  it('rejects multiple featured entries in the same quarter', () => {
    const first = { ...validEntry, slug: 'first-feature', featured: true, createdAt: '2026-05-01' };
    const second = { ...validEntry, slug: 'second-feature', featured: true, createdAt: '2026-06-30' };

    expect(() =>
      parseGalleryEntries({ entries: [first, second] }),
    ).toThrow(/featured.*quarter/i);
  });

  it('accepts featured entries in different quarters', () => {
    const first = { ...validEntry, slug: 'spring-feature', featured: true, createdAt: '2026-05-01' };
    const second = { ...validEntry, slug: 'summer-feature', featured: true, createdAt: '2026-07-01' };

    const result = parseGalleryEntries({ entries: [first, second] });
    expect(result.entries).toHaveLength(2);
  });

  it('rejects unknown source values', () => {
    const bad = { ...validEntry, source: 'imported' };
    expect(() => parseGalleryEntries({ entries: [bad] })).toThrow();
  });

  it('defaults featured to false when omitted', () => {
    const entry = { ...validEntry } as Partial<typeof validEntry>;
    delete entry.featured;
    const result = parseGalleryEntries({ entries: [entry] });
    expect(result.entries[0].featured).toBe(false);
  });

  it('requires codeLocal field (path to .kcad.ts for GLB build)', () => {
    const bad = { ...validEntry } as Partial<typeof validEntry> & { codeLocal?: string };
    delete bad.codeLocal;
    expect(() => parseGalleryEntries({ entries: [bad] })).toThrow(/codeLocal/);
  });

  it('accepts a valid codeLocal path', () => {
    const entry = {
      ...validEntry,
      codeLocal: '../../examples/robot-arm/desktop-3axis-mates.kcad.ts',
    };
    const result = parseGalleryEntries({ entries: [entry] });
    expect(result.entries[0].codeLocal).toBe(entry.codeLocal);
  });

  it('keeps the release gallery focused on the new watch and stool', () => {
    const entriesPath = path.resolve(__dirname, '../../site/gallery/entries.json');
    const parsed = parseGalleryEntries(JSON.parse(readFileSync(entriesPath, 'utf8')));
    const slugs = parsed.entries.map(entry => entry.slug);

    expect(slugs).toContain('royal-pop-pocket-watch');
    expect(slugs).toContain('ratchet-height-adjust-stool');
    expect(slugs).not.toContain('pink-pocket-watch');
    expect(slugs.filter(slug => slug.includes('watch'))).toEqual(['royal-pop-pocket-watch']);
  });
});
