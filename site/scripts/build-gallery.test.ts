import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildGallery, communityApiFromEnv, fetchCommunityGallery } from './build-gallery';

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
    expect(out.community).toEqual([]);
    expect(out.entries[0].slug).toBe('fixture-build');
    expect(out.entries[0].videoUrl).toBe('/gallery/fixture-build/video.mp4');
    expect(out.entries[0].posterUrl).toBe('/gallery/fixture-build/poster.jpg');
    expect(out.entries[0].modelUrl).toBe('/gallery/fixture-build/model.glb');
    expect(out.entries[0].promptUrl).toBe('/gallery/fixture-build/prompt.md');
    expect(out.entries[0].studioUrl).toBe('https://app.kernelcad.com/studio?gallery=fixture-build');
    expect(out.entries[0].sourceUrl).toBe('/gallery/fixture-build/source.kcad.ts');
    expect(out.entries[0].scriptPath).toBe('simple-box.kcad.ts');

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

  it('publishes a prebuilt project GLB without evaluating its STEP-backed source', { timeout: 60000 }, async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'gallery-build-'));
    const entriesDir = path.join(tmp, 'gallery');
    const publicDir = path.join(tmp, 'public');
    mkdirSync(entriesDir, { recursive: true });

    const fixturesRoot = path.resolve(__dirname, '../../tests/fixtures/gallery');
    const keycapRoot = path.resolve(__dirname, '../../examples/gallery/make-no-mistakes-keycap');
    copyFileSync(path.join(fixturesRoot, 'short-clip.mp4'), path.join(entriesDir, 'short-clip.mp4'));
    copyFileSync(path.join(keycapRoot, 'model.glb'), path.join(entriesDir, 'project-model.glb'));
    writeFileSync(
      path.join(entriesDir, 'step-backed.kcad.ts'),
      "throw new Error('source evaluation must be skipped when modelLocal is supplied');\n",
    );
    writeFileSync(
      path.join(entriesDir, 'entries.json'),
      JSON.stringify({
        entries: [{
          slug: 'prebuilt-project', title: 'Prebuilt project',
          author: { handle: 'k', url: 'https://x.com/k' },
          version: 'v0.15.0', prompt: 'p', source: 'studio',
          video: 'short-clip.mp4', codeLocal: 'step-backed.kcad.ts',
          modelLocal: 'project-model.glb',
          code: 'https://github.com/w1ne/kernelCAD-web',
          tags: [], featured: false, createdAt: '2026-07-27',
          appUrl: 'https://app.kernelcad.com/p/example?version=1',
        }],
      }),
    );

    await buildGallery({
      entriesPath: path.join(entriesDir, 'entries.json'),
      publicDir,
    });

    const glb = readFileSync(path.join(publicDir, 'gallery/prebuilt-project/model.glb'));
    expect(glb.subarray(0, 4).toString('utf8')).toBe('glTF');
    const out = JSON.parse(readFileSync(path.join(publicDir, 'gallery.json'), 'utf8'));
    expect(out.entries[0].modelUrl).toBe('/gallery/prebuilt-project/model.glb');
    expect(out.entries[0]).not.toHaveProperty('modelLocal');
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

  it('rejects studio entries without codeLocal after validating the video exists', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'gallery-build-'));
    const entriesDir = path.join(tmp, 'gallery');
    mkdirSync(entriesDir, { recursive: true });

    const fixturesRoot = path.resolve(__dirname, '../../tests/fixtures/gallery');
    copyFileSync(path.join(fixturesRoot, 'short-clip.mp4'), path.join(entriesDir, 'short-clip.mp4'));
    writeFileSync(
      path.join(entriesDir, 'entries.json'),
      JSON.stringify({
        entries: [{
          slug: 'studio-no-code-local', title: 'Studio no code local',
          author: { handle: 'k', url: 'https://x.com/k' },
          version: 'v0.11.0', prompt: 'p', source: 'studio',
          video: 'short-clip.mp4', codeLocal: null,
          code: 'https://github.com/w1ne/kernelCAD-web',
          tags: [], featured: false, createdAt: '2026-05-15',
          appUrl: 'https://app.kernelcad.com/studio/projects/studio-no-code-local',
        }],
      }),
    );

    await expect(buildGallery({
      entriesPath: path.join(entriesDir, 'entries.json'),
      publicDir: path.join(tmp, 'public'),
    })).rejects.toThrow(/studio gallery entries without codeLocal are not buildable yet/i);
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

describe('fetchCommunityGallery', () => {
  let tmp: string;
  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

  function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
    return (async (input: RequestInfo | URL) => {
      const url = String(input);
      const route = routes[url];
      if (!route) throw new Error(`unexpected fetch ${url}`);
      return route();
    }) as typeof fetch;
  }

  const listUrl = 'https://api.test/api/v1/gallery?sort=new&limit=8';

  it('copies each render next to the landing and emits uniform cards, featured first', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'community-'));
    const fetchImpl = fakeFetch({
      [listUrl]: () => Response.json({
        items: [
          { slug: 'abc123', title: ' Gear stage ', ownerName: 'Ada', renderUrl: 'https://cdn.test/a.png?sig=1', remixCount: 3, featured: false },
          { slug: 'noRender', title: 'No render', ownerName: null, renderUrl: null, remixCount: 0, featured: false },
          { slug: '../evil', title: 'Bad slug', ownerName: null, renderUrl: 'https://cdn.test/e.png', remixCount: 0, featured: false },
          { slug: 'feat01', title: 'Featured stool', ownerName: '', renderUrl: 'https://cdn.test/f.webp', remixCount: 0, featured: true },
        ],
        nextCursor: null,
      }),
      'https://cdn.test/a.png?sig=1': () => new Response(PNG, { headers: { 'content-type': 'image/png' } }),
      'https://cdn.test/f.webp': () => new Response(PNG, { headers: { 'content-type': 'image/webp' } }),
    });

    const cards = await fetchCommunityGallery({ baseUrl: 'https://api.test/', fetchImpl }, tmp);

    expect(cards.map((c) => c.slug)).toEqual(['feat01', 'abc123']);
    expect(cards[1]).toEqual({
      slug: 'abc123',
      title: 'Gear stage',
      ownerName: 'Ada',
      remixCount: 3,
      featured: false,
      posterUrl: '/gallery/_community/abc123.png',
      url: 'https://app.kernelcad.com/p/abc123',
    });
    expect(cards[0].ownerName).toBeNull();
    expect(existsSync(path.join(tmp, 'gallery/_community/abc123.png'))).toBe(true);
    expect(existsSync(path.join(tmp, 'gallery/_community/feat01.webp'))).toBe(true);
  });

  it('returns [] for an empty gallery, an API error or a malformed body', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'community-'));
    const empty = fakeFetch({ [listUrl]: () => Response.json({ items: [], nextCursor: null }) });
    const down = fakeFetch({ [listUrl]: () => new Response('nope', { status: 404 }) });
    const malformed = fakeFetch({ [listUrl]: () => Response.json({ rows: [] }) });
    const offline = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;

    for (const fetchImpl of [empty, down, malformed, offline]) {
      expect(await fetchCommunityGallery({ baseUrl: 'https://api.test', fetchImpl }, tmp)).toEqual([]);
    }
  });

  it('skips a card whose render is not an image', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'community-'));
    const fetchImpl = fakeFetch({
      [listUrl]: () => Response.json({
        items: [{ slug: 'html01', title: 'Html', renderUrl: 'https://cdn.test/x', remixCount: 0, featured: false }],
        nextCursor: null,
      }),
      'https://cdn.test/x': () => new Response('<html>', { headers: { 'content-type': 'text/html' } }),
    });
    expect(await fetchCommunityGallery({ baseUrl: 'https://api.test', fetchImpl }, tmp)).toEqual([]);
  });

  it('reads the API origin from the environment, with an off switch', () => {
    expect(communityApiFromEnv({})).toEqual({ baseUrl: 'https://api.kernelcad.com' });
    expect(communityApiFromEnv({ KERNELCAD_GALLERY_API: 'http://localhost:8787' })).toEqual({ baseUrl: 'http://localhost:8787' });
    expect(communityApiFromEnv({ KERNELCAD_GALLERY_API: 'off' })).toBeUndefined();
  });
});
