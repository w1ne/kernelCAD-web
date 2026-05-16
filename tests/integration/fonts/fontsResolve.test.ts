// src/lib/fonts/index.test.ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import {
  ensureBundledFontLoaded,
  resolveAndLoadFont,
  fontPath,
  __resetFontStateForTests,
} from '../../../src/shared/fonts/index';
import { mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

describe('fonts: resolver + bundle loader', () => {
  beforeAll(async () => { await initOcct(); });
  beforeEach(() => { __resetFontStateForTests(); });

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

  it('second call with the same path is a no-op (registry hit)', async () => {
    const src = resolve(__dirname, '../../../src/shared/fonts/LiberationSans-Regular.ttf');
    await resolveAndLoadFont(fontPath(src), undefined);
    const second = await resolveAndLoadFont(fontPath(src), undefined);
    expect(second.fontFamily).toBe('LiberationSans-Regular');
  });
});
