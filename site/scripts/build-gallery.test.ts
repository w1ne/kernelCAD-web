import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildGallery } from './build-gallery';

describe('buildGallery', () => {
  let tmp: string;
  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  it('emits gallery.json + per-slug assets (video, poster, GLB, prompt) from a valid entries file', { timeout: 60000 }, async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'gallery-build-'));
    const entriesDir = path.join(tmp, 'gallery');
    const publicDir = path.join(tmp, 'public');
    mkdirSync(entriesDir, { recursive: true });

    const fixturesRoot = path.resolve(__dirname, '../../tests/fixtures/gallery');
    copyFileSync(path.join(fixturesRoot, 'entries-fixture.json'), path.join(entriesDir, 'entries.json'));
    copyFileSync(path.join(fixturesRoot, 'short-clip.mp4'), path.join(entriesDir, 'short-clip.mp4'));
    copyFileSync(path.join(fixturesRoot, 'simple-box.kcad.ts'), path.join(entriesDir, 'simple-box.kcad.ts'));

    await buildGallery({
      entriesPath: path.join(entriesDir, 'entries.json'),
      publicDir,
    });

    expect(existsSync(path.join(publicDir, 'gallery.json'))).toBe(true);
    const out = JSON.parse(readFileSync(path.join(publicDir, 'gallery.json'), 'utf8'));
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0].slug).toBe('fixture-build');
    expect(out.entries[0].videoUrl).toBe('/gallery/fixture-build/video.mp4');
    expect(out.entries[0].posterUrl).toBe('/gallery/fixture-build/poster.jpg');
    expect(out.entries[0].modelUrl).toBe('/gallery/fixture-build/model.glb');
    expect(out.entries[0].promptUrl).toBe('/gallery/fixture-build/prompt.md');
    expect(out.entries[0].studioUrl).toBe('/studio?gallery=fixture-build');
    expect(out.entries[0].sourceUrl).toBe('/gallery/fixture-build/source.kcad.ts');

    expect(existsSync(path.join(publicDir, 'gallery/fixture-build/video.mp4'))).toBe(true);
    expect(existsSync(path.join(publicDir, 'gallery/fixture-build/poster.jpg'))).toBe(true);
    expect(existsSync(path.join(publicDir, 'gallery/fixture-build/model.glb'))).toBe(true);
    expect(existsSync(path.join(publicDir, 'gallery/fixture-build/prompt.md'))).toBe(true);
    expect(existsSync(path.join(publicDir, 'gallery/fixture-build/source.kcad.ts'))).toBe(true);
    expect(readFileSync(path.join(publicDir, 'gallery/fixture-build/source.kcad.ts'), 'utf8'))
      .toContain('box');

    // GLB has glTF magic bytes
    const glb = readFileSync(path.join(publicDir, 'gallery/fixture-build/model.glb'));
    expect(glb.subarray(0, 4).toString('utf8')).toBe('glTF');
  });

  it('rejects when an entry video is missing', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'gallery-build-'));
    const entriesDir = path.join(tmp, 'gallery');
    mkdirSync(entriesDir, { recursive: true });
    // Also place a simple-box so codeLocal resolves; only video is missing.
    const fixturesRoot = path.resolve(__dirname, '../../tests/fixtures/gallery');
    copyFileSync(path.join(fixturesRoot, 'simple-box.kcad.ts'), path.join(entriesDir, 'simple-box.kcad.ts'));
    writeFileSync(
      path.join(entriesDir, 'entries.json'),
      JSON.stringify({
        entries: [{
          slug: 'missing-video', title: 'X',
          author: { handle: 'k', url: 'https://x.com/k' },
          version: 'v0.6.4', prompt: 'p', source: 'curated',
          video: 'nope.mp4', codeLocal: 'simple-box.kcad.ts',
          code: 'https://github.com/w1ne/kernelCAD-web',
          tags: [], featured: false, createdAt: '2026-05-15', appUrl: null,
        }],
      }),
    );
    await expect(buildGallery({
      entriesPath: path.join(entriesDir, 'entries.json'),
      publicDir: path.join(tmp, 'public'),
    })).rejects.toThrow(/missing-video|video.*not.*found/i);
  });

  it('rejects a mechanism entry before asset work when cached review evidence is missing', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'gallery-build-'));
    const entriesDir = path.join(tmp, 'gallery');
    mkdirSync(entriesDir, { recursive: true });

    const fixturesRoot = path.resolve(__dirname, '../../tests/fixtures/gallery');
    copyFileSync(path.join(fixturesRoot, 'short-clip.mp4'), path.join(entriesDir, 'short-clip.mp4'));
    copyFileSync(path.join(fixturesRoot, 'simple-box.kcad.ts'), path.join(entriesDir, 'simple-box.kcad.ts'));
    writeFileSync(
      path.join(entriesDir, 'entries.json'),
      JSON.stringify({
        entries: [{
          slug: 'missing-review', title: 'Missing review',
          author: { handle: 'k', url: 'https://x.com/k' },
          version: 'v0.11.0', prompt: 'p', source: 'curated',
          video: 'short-clip.mp4', codeLocal: 'simple-box.kcad.ts',
          code: 'https://github.com/w1ne/kernelCAD-web',
          tags: ['mechanism'], featured: false, createdAt: '2026-05-15', appUrl: null,
          mechanismReview: { evidence: 'missing-review.json' },
        }],
      }),
    );

    await expect(buildGallery({
      entriesPath: path.join(entriesDir, 'entries.json'),
      publicDir: path.join(tmp, 'public'),
    })).rejects.toThrow(/missing-review.*mechanism review evidence.*not found/i);
  });

  it('rejects a mechanism entry whose cached review_cad evidence is not passing', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'gallery-build-'));
    const entriesDir = path.join(tmp, 'gallery');
    mkdirSync(entriesDir, { recursive: true });

    const fixturesRoot = path.resolve(__dirname, '../../tests/fixtures/gallery');
    copyFileSync(path.join(fixturesRoot, 'short-clip.mp4'), path.join(entriesDir, 'short-clip.mp4'));
    copyFileSync(path.join(fixturesRoot, 'simple-box.kcad.ts'), path.join(entriesDir, 'simple-box.kcad.ts'));
    writeFileSync(
      path.join(entriesDir, 'failing-review.json'),
      JSON.stringify({
        tool: 'review_cad',
        ok: false,
        fitness: {
          functional: false,
          blockingReasons: [{ code: 'assembly.mechanical.fixed-contact-missing' }],
        },
      }),
    );
    writeFileSync(
      path.join(entriesDir, 'entries.json'),
      JSON.stringify({
        entries: [{
          slug: 'failing-review', title: 'Failing review',
          author: { handle: 'k', url: 'https://x.com/k' },
          version: 'v0.11.0', prompt: 'p', source: 'curated',
          video: 'short-clip.mp4', codeLocal: 'simple-box.kcad.ts',
          code: 'https://github.com/w1ne/kernelCAD-web',
          tags: ['mechanism'], featured: false, createdAt: '2026-05-15', appUrl: null,
          mechanismReview: { evidence: 'failing-review.json' },
        }],
      }),
    );

    await expect(buildGallery({
      entriesPath: path.join(entriesDir, 'entries.json'),
      publicDir: path.join(tmp, 'public'),
    })).rejects.toThrow(/failing-review.*review_cad.*ok.*true/i);
  });
});
