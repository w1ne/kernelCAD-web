import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { brotliCompressSync, brotliDecompressSync, constants as zlibConstants } from 'node:zlib';
import { buildGallery, communityApiFromEnv, fetchCommunityGallery, writeMeshArtifacts } from './build-gallery';
import { decodeMeshBinary } from '../../src/modeling/capture/featureMeshBinary';

describe('buildGallery', () => {
  let tmp: string;
  afterEach(() => {
    vi.doUnmock('../../scripts/lib/extractPoster');
    vi.doUnmock('../../scripts/lib/blackFrameCheck');
    vi.doUnmock('../../scripts/lib/exportGlb');
    vi.doUnmock('../../scripts/lib/optimizeGlb');
    vi.doUnmock('../../src/modeling/runtime/scriptLoader');
    vi.doUnmock('../../src/modeling/capture/featureMeshing');
    vi.doUnmock('../../src/modeling/capture/featureMeshSerialize');
    vi.doUnmock('../../src/agent/cli/commands/evaluate');
    vi.doUnmock('../../src/modeling/animation/bakeAnimationTimeline');
    vi.resetModules();
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  async function runMockedAnimationBuild(source: string, bridgeFails = false) {
    const fixturesRoot = path.resolve(__dirname, '../../tests/fixtures/gallery');
    const entriesDir = path.join(tmp, 'mocked-gallery');
    const publicDir = path.join(tmp, 'mocked-public');
    mkdirSync(entriesDir, { recursive: true });
    copyFileSync(path.join(fixturesRoot, 'short-clip.mp4'), path.join(entriesDir, 'short-clip.mp4'));
    const scriptPath = path.join(entriesDir, 'entry.kcad.ts');
    writeFileSync(scriptPath, source);
    writeFileSync(path.join(entriesDir, 'entries.json'), JSON.stringify({ entries: [{
      slug: 'mocked-entry', title: 'Mocked entry', author: { handle: 'k', url: 'https://example.com' },
      version: 'v1.0', prompt: 'test', source: 'curated', video: 'short-clip.mp4', codeLocal: 'entry.kcad.ts',
      code: 'https://github.com/w1ne/kernelCAD-web', tags: [], featured: false, createdAt: '2026-01-01', appUrl: null,
    }] }));

    const evaluateAndBuildScript = vi.fn(async () => ({
      evaluation: { exitCode: 0 },
      model: { mocked: true },
    }));
    const bakeAnimationTimeline = vi.fn(async () => ({ frames: 3, parts: [{ name: 'part' }] }));
    vi.doMock('../../scripts/lib/extractPoster', () => ({ extractPoster: async () => writeFileSync(path.join(publicDir, 'gallery/mocked-entry/poster.jpg'), 'poster') }));
    vi.doMock('../../scripts/lib/blackFrameCheck', () => ({ isVideoMostlyBlack: async () => false }));
    vi.doMock('../../scripts/lib/exportGlb', () => ({ exportGlb: async ({ outPath }: { outPath: string }) => writeFileSync(outPath, 'raw') }));
    vi.doMock('../../scripts/lib/optimizeGlb', () => ({ optimizeGlb: async (_src: string, dst: string) => writeFileSync(dst, 'glb') }));
    vi.doMock('../../src/modeling/runtime/scriptLoader', () => ({
      loadScriptFeatures: bridgeFails
        ? async () => { throw new Error('mock bridge precompute failure'); }
        : async () => ({
          features: source.includes('animationView(')
            ? [{ record: { kind: 'animationView' } }]
            : [],
          paramTable: { serialize: () => ({}) }, session: { assemblies: new Map() },
        }),
    }));
    vi.doMock('../../src/modeling/capture/featureMeshing', () => ({ meshFeaturesPerFeature: async () => ({
      failedFeatureIds: [], features: [], bounds: {},
    }) }));
    vi.doMock('../../src/modeling/capture/featureMeshSerialize', () => ({ serializeForBridge: (feature: unknown) => feature }));
    vi.doMock('../../src/agent/cli/commands/evaluate', () => ({ evaluateAndBuildScript }));
    vi.doMock('../../src/modeling/animation/bakeAnimationTimeline', () => ({
      bakeAnimationTimeline,
      selectAnimationMetadata: () => ({ durationMs: 100 }),
    }));
    const { buildGallery: buildGalleryWithMocks } = await import('./build-gallery');
    await buildGalleryWithMocks({ entriesPath: path.join(entriesDir, 'entries.json'), publicDir });
    return { evaluateAndBuildScript, bakeAnimationTimeline, publicDir, source };
  }

  it('does not evaluate a static entry for animation metadata', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'gallery-static-animation-'));
    const result = await runMockedAnimationBuild('return box(1, 1, 1);');
    expect(result.evaluateAndBuildScript).not.toHaveBeenCalled();
    expect(result.bakeAnimationTimeline).not.toHaveBeenCalled();
    const sha = createHash('sha256').update(result.source, 'utf8').digest('hex');
    expect(existsSync(path.join(result.publicDir, 'gallery/_anim', `${sha}.json`))).toBe(false);
  });

  it('bakes an animation detected from the precomputed feature record', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'gallery-record-animation-'));
    const result = await runMockedAnimationBuild('animationView({ durationMs: 100 });');
    expect(result.evaluateAndBuildScript).toHaveBeenCalledTimes(1);
    expect(result.bakeAnimationTimeline).toHaveBeenCalledTimes(1);
    const sha = createHash('sha256').update(result.source, 'utf8').digest('hex');
    expect(JSON.parse(readFileSync(path.join(result.publicDir, 'gallery/_anim', `${sha}.json`), 'utf8')))
      .toEqual({ frames: 3, parts: [{ name: 'part' }] });
  });

  it('uses the source animationView check when bridge precompute fails', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'gallery-fallback-animation-'));
    const result = await runMockedAnimationBuild('animationView({ durationMs: 100 });', true);
    expect(result.evaluateAndBuildScript).toHaveBeenCalledTimes(1);
    expect(result.bakeAnimationTimeline).toHaveBeenCalledTimes(1);
    const sha = createHash('sha256').update(result.source, 'utf8').digest('hex');
    expect(existsSync(path.join(result.publicDir, 'gallery/_anim', `${sha}.json`))).toBe(true);
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

    const source = readFileSync(path.join(entriesDir, 'simple-box.kcad.ts'), 'utf8');
    const sha = createHash('sha256').update(source, 'utf8').digest('hex');
    expect(existsSync(path.join(publicDir, 'gallery/_anim', `${sha}.json`))).toBe(false);
  });

  it('builds selected packed assets with decoder and complete compact native bridge', {timeout:60000}, async () => {
    tmp=mkdtempSync(path.join(tmpdir(),'gallery-packed-'));
    const fixtures=path.resolve(__dirname,'../../tests/fixtures/gallery');
    const entry=JSON.parse(readFileSync(path.join(fixtures,'entries-fixture.json'),'utf8')).entries[0];
    entry.codeLocal=path.join(fixtures,'simple-box.kcad.ts');
    entry.video=path.join(fixtures,'short-clip.mp4'); entry.meshopt=true;entry.compactBridge=true;
    const entriesPath=path.join(tmp,'entries.json'),publicDir=path.join(tmp,'public');
    writeFileSync(entriesPath,JSON.stringify({entries:[entry]}));
    await buildGallery({entriesPath,publicDir});
    const gallery=JSON.parse(readFileSync(path.join(publicDir,'gallery.json'),'utf8'));
    expect(gallery.meshoptDecoderUrl).toBe('/vendor/meshopt/meshopt_decoder.js');
    expect(gallery.entries[0].meshopt).toBe(true);
    expect(gallery.entries[0]).not.toHaveProperty('compactBridge');
    expect(existsSync(path.join(publicDir,'vendor/meshopt/LICENSE.md'))).toBe(true);
    const source=readFileSync(entry.codeLocal,'utf8');
    const sha=createHash('sha256').update(source).digest('hex');
    const bridge=JSON.parse(readFileSync(path.join(publicDir,'gallery/_mesh',sha+'.json'),'utf8'));
    expect(bridge.source).toBe(source);
    expect(bridge.featureRecords.length).toBeGreaterThan(0);
    expect(bridge.features.length).toBeGreaterThan(0);
    expect(bridge).toHaveProperty('params');expect(bridge).toHaveProperty('review');expect(bridge).toHaveProperty('bounds');
    const binPath=path.join(publicDir,'gallery/_mesh',sha+'.bin'),brPath=path.join(publicDir,'gallery/_mesh',sha+'.bin.br');
    expect(existsSync(binPath)).toBe(true);expect(existsSync(brPath)).toBe(true);
    const bin=readFileSync(binPath);
    const decodedBin=decodeMeshBinary(new Uint8Array(bin));
    expect(decodedBin.features.map(f=>f.featureId))
      .toEqual(bridge.features.map((f:{featureId:string})=>f.featureId));
    expect(decodedBin.containerMeta?.params).toEqual(bridge.params);
    expect(decodedBin.containerMeta?.review).toEqual(bridge.review);
    expect(decodedBin.containerMeta?.bounds).toEqual(bridge.bounds);
    expect(decodedBin.containerMeta?.featureRecords).toEqual(bridge.featureRecords);
    expect(brotliDecompressSync(readFileSync(brPath)).equals(bin)).toBe(true);
    expect(decodeMeshBinary(new Uint8Array(brotliDecompressSync(readFileSync(brPath)))).containerMeta?.params)
      .toEqual(bridge.params);
  });

  it('fails a selected compact bridge when source precomputation fails', {timeout:60000}, async () => {
    tmp=mkdtempSync(path.join(tmpdir(),'gallery-strict-'));
    const fixtures=path.resolve(__dirname,'../../tests/fixtures/gallery');
    const entry=JSON.parse(readFileSync(path.join(fixtures,'entries-fixture.json'),'utf8')).entries[0];
    const script=path.join(tmp,'bad.kcad.ts');writeFileSync(script,"throw new Error('source invalid');");
    entry.codeLocal=script;entry.video=path.join(fixtures,'short-clip.mp4');entry.compactBridge=true;
    entry.modelLocal=path.resolve(__dirname,'../../examples/gallery/make-no-mistakes-keycap/model.glb');
    const entriesPath=path.join(tmp,'entries.json');writeFileSync(entriesPath,JSON.stringify({entries:[entry]}));
    await expect(buildGallery({entriesPath,publicDir:path.join(tmp,'public')})).rejects.toThrow();
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

describe('writeMeshArtifacts', () => {
  let tmp: string;
  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  it('writes json (unchanged) + bin1 + brotli q11 siblings for the same payload', () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'gallery-mesh-artifacts-'));
    const meshDir = path.join(tmp, '_mesh');
    mkdirSync(meshDir, { recursive: true });

    const sha = createHash('sha256').update('mesh-source').digest('hex');
    const payload = {
      source: 'return box(1, 1, 1);',
      features: [{
        featureId: 'box-1',
        featureKind: 'box',
        predecessors: [],
        faces: [{
          faceId: 0,
          vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
          normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
          indices: [0, 1, 2],
        }],
      }],
      featureRecords: [{ kind: 'box' }],
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      params: {},
      review: { ok: true, diagnostics: [] },
    };

    writeMeshArtifacts(meshDir, sha, payload);

    const jsonPath = path.join(meshDir, `${sha}.json`);
    const binPath = path.join(meshDir, `${sha}.bin`);
    const brPath = path.join(meshDir, `${sha}.bin.br`);
    expect(existsSync(jsonPath)).toBe(true);
    expect(existsSync(binPath)).toBe(true);
    expect(existsSync(brPath)).toBe(true);

    // The JSON bridge keeps the pre-bin encoding byte-for-byte (old clients/embeds).
    expect(readFileSync(jsonPath, 'utf8')).toBe(JSON.stringify(payload));

    // The .bin is a bin1 container ("KCB1" magic) decoding back to the same features.
    const bin = readFileSync(binPath);
    const binBytes = new Uint8Array(bin); // fresh copy: byteOffset 0, decode-safe
    expect(Array.from(binBytes.subarray(0, 4))).toEqual([0x4b, 0x43, 0x42, 0x31]);
    const decodedBin = decodeMeshBinary(binBytes);
    expect(decodedBin.features.map((f) => f.featureId)).toEqual(['box-1']);
    // The JSON bridge minus its features rides INSIDE the container, so one bin
    // fetch reconstructs the full payload (params/review/bounds, not just geometry).
    const { features: _features, ...containerMeta } = payload;
    expect(decodedBin.containerMeta).toEqual(containerMeta);
    expect(decodedBin.containerMeta?.params).toEqual(payload.params);
    expect(decodedBin.containerMeta?.review).toEqual(payload.review);
    expect(decodedBin.containerMeta?.bounds).toEqual(payload.bounds);
    expect(decodedBin.containerMeta?.featureRecords).toEqual(payload.featureRecords);

    // The .br sibling is brotli quality 11 of exactly those bin bytes.
    expect(readFileSync(brPath).equals(brotliCompressSync(bin, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
    }))).toBe(true);
    const brBytes = new Uint8Array(brotliDecompressSync(readFileSync(brPath)));
    expect(brBytes).toEqual(binBytes);
    expect(decodeMeshBinary(brBytes).containerMeta).toEqual(containerMeta);
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
