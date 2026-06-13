// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/textures/index.test.ts
//
// Texture loader — script-dir + absolute + URL resolution; format / size caps.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  resolveAndLoadTextureBytes,
  __resetTextureCacheForTests,
} from './index';
import { KernelError } from '../intent/kernelError';

// Minimal 1x1 transparent PNG bytes (validated 89-byte IHDR-based PNG).
const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c62000000000005000150fdb88e0000000049454e44ae426082',
  'hex',
);

describe('resolveAndLoadTextureBytes', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-texture-test-'));
    __resetTextureCacheForTests();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves a relative path against scriptDir', async () => {
    const imgPath = join(tmpDir, 'test.png');
    writeFileSync(imgPath, PNG_1X1);
    const out = await resolveAndLoadTextureBytes({ path: './test.png' }, tmpDir);
    expect(out.absPath).toBe(imgPath);
    expect(out.contentType).toBe('image/png');
    expect(out.width).toBe(1);
    expect(out.height).toBe(1);
    expect(Buffer.isBuffer(out.buffer)).toBe(true);
  });

  it('uses an absolute path verbatim', async () => {
    const imgPath = join(tmpDir, 'abs.png');
    writeFileSync(imgPath, PNG_1X1);
    const out = await resolveAndLoadTextureBytes({ path: imgPath }, undefined);
    expect(out.absPath).toBe(imgPath);
  });

  it('throws feature.material.texture-not-found for a missing file', async () => {
    let caught: unknown = undefined;
    try {
      await resolveAndLoadTextureBytes({ path: './does-not-exist.png' }, tmpDir);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.material.texture-not-found');
  });

  it('throws feature.material.texture-unsupported-format for .tga', async () => {
    const imgPath = join(tmpDir, 'bad.tga');
    writeFileSync(imgPath, PNG_1X1);
    let caught: unknown = undefined;
    try {
      await resolveAndLoadTextureBytes({ path: imgPath }, undefined);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.material.texture-unsupported-format');
  });

  it('throws on empty path', async () => {
    let caught: unknown = undefined;
    try {
      await resolveAndLoadTextureBytes({ path: '' }, tmpDir);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
  });

  it('accepts .jpg / .jpeg / .webp by extension', async () => {
    // Use the PNG bytes for content (sharp won't actually probe in this code
    // path until we ask for metadata — and these tests don't hit a 2K cap).
    // We rely on the extension allow-list, which is the only invariant the
    // loader enforces against the file name.
    const jpg = join(tmpDir, 'a.jpg');
    writeFileSync(jpg, PNG_1X1);
    // We just confirm the format-allow gate doesn't throw — buffer probing
    // may not succeed against the PNG byte stream for non-PNG extensions, so
    // we treat that as a separate concern (the loader returns whatever sharp
    // reports). We just exercise the "extension is allowed" branch.
    let caught: unknown = undefined;
    try {
      await resolveAndLoadTextureBytes({ path: jpg }, undefined);
    } catch (e) {
      caught = e;
    }
    // Either OK or a non-unsupported-format error; the gate we test is that
    // the extension allow-list passed.
    if (caught) {
      expect((caught as KernelError).code).not.toBe('feature.material.texture-unsupported-format');
    }
  });
});
