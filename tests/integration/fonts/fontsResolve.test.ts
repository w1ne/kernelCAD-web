// src/lib/fonts/index.test.ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import {
  ensureBundledFontLoaded,
  resolveAndLoadFont,
  fontPath,
  __resetFontStateForTests,
} from '../../../src/shared/fonts/index';
import { mkdirSync, copyFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import * as nodeFontLoader from '../../../src/shared/fonts/nodeLoader';

describe('fonts: resolver + bundle loader', () => {
  beforeAll(async () => { await initOcct(); });
  beforeEach(() => { __resetFontStateForTests(); });

  it('concurrent first calls wait for the same bundled font registration', async () => {
    __resetFontStateForTests();
    const first = nodeFontLoader.ensureBundledFontLoaded();
    const inFlight = nodeFontLoader.__getBundledFontLoadPromiseForTests();
    const second = nodeFontLoader.ensureBundledFontLoaded();
    const sharedInFlight = nodeFontLoader.__getBundledFontLoadPromiseForTests();
    expect(sharedInFlight).toBe(inFlight);
    await Promise.all([first, second]);
    expect(replicad.getFont('default')).toBeDefined();
  });

  it('ensureBundledFontLoaded() registers the bundled font under "default"', async () => {
    await ensureBundledFontLoaded();
    const { fontFamily } = await resolveAndLoadFont(undefined, undefined);
    expect(fontFamily).toBe('default');
  });

  it('font: <unknown logical name> yields sketch.text.font-not-found', async () => {
    await expect(resolveAndLoadFont('unknown-family', undefined))
      .rejects
      .toMatchObject({ code: 'sketch.text.font-not-found' });
  });

  it('font: fontPath(...) reuses an already registered family instead of re-loading (#961)', async () => {
    const src = resolve(__dirname, '../../../src/shared/fonts/LiberationSans-Regular.ttf');
    const tmp = resolve(tmpdir(), 'kcad-fonts-cache-test', 'CachedFamily961.ttf');
    mkdirSync(dirname(tmp), { recursive: true });
    copyFileSync(src, tmp);
    expect((await resolveAndLoadFont(fontPath(tmp), undefined)).fontFamily).toBe('CachedFamily961');
    const registered = replicad.getFont('CachedFamily961');
    expect(registered).toBeDefined();
    // The file is gone: a second call must fail rather than reuse the old face.
    rmSync(tmp);
    await expect(resolveAndLoadFont(fontPath(tmp), undefined)).rejects.toThrow();
    expect(replicad.getFont('CachedFamily961')).toBe(registered);
  });

  it('font: fontPath(<abs path>) loads + registers under basename', async () => {
    const src = resolve(__dirname, '../../../src/shared/fonts/LiberationSans-Regular.ttf');
    const tmp = resolve(tmpdir(), 'kcad-fonts-test', 'MyRoboto.ttf');
    mkdirSync(dirname(tmp), { recursive: true });
    copyFileSync(src, tmp);
    const { fontFamily } = await resolveAndLoadFont(fontPath(tmp), undefined);
    expect(fontFamily).toBe('MyRoboto');
  });

  it('font: fontPath(<rel path>) resolves against scriptDir', async () => {
    const scriptDir = resolve(__dirname, '../../../src/shared/fonts');
    const { fontFamily } = await resolveAndLoadFont(fontPath('LiberationSans-Regular.ttf'), scriptDir);
    // Bundled file basename is "LiberationSans-Regular" — registered under that.
    expect(fontFamily).toBe('LiberationSans-Regular');
  });

  it('reads a replaced fontPath file instead of keeping the previous face', async () => {
    const src = resolve(__dirname, '../../../src/shared/fonts/LiberationSans-Regular.ttf');
    const tmp = resolve(tmpdir(), 'kcad-fonts-replace', 'SwapFace.ttf');
    mkdirSync(dirname(tmp), { recursive: true });
    copyFileSync(src, tmp);
    expect((await resolveAndLoadFont(fontPath(tmp), undefined)).fontFamily).toBe('SwapFace');
    const first = replicad.getFont('SwapFace');
    writeFileSync(tmp, Buffer.from('not-a-font'));
    await expect(resolveAndLoadFont(fontPath(tmp), undefined)).rejects.toThrow();
    expect(replicad.getFont('SwapFace')).toBe(first);
  });

  it('second call with the same path is a no-op (registry hit)', async () => {
    const src = resolve(__dirname, '../../../src/shared/fonts/LiberationSans-Regular.ttf');
    await resolveAndLoadFont(fontPath(src), undefined);
    const second = await resolveAndLoadFont(fontPath(src), undefined);
    expect(second.fontFamily).toBe('LiberationSans-Regular');
  });
});
