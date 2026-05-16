import { describe, it, expect } from 'vitest';
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

  it('accepts source = studio for forward-compat', () => {
    const studioEntry = { ...validEntry, slug: 'other', source: 'studio' as const };
    const result = parseGalleryEntries({ entries: [studioEntry] });
    expect(result.entries[0].source).toBe('studio');
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
});
