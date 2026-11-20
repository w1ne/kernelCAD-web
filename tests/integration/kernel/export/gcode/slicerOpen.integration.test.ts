// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openFileInSlicer } from '../../../../../src/kernel/export/gcode/slicerCli';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HARMLESS = process.platform === 'win32' || !existsSync('/bin/true') ? undefined : '/bin/true';

describe('openFileInSlicer integration', () => {
  const savedEnv = process.env.KERNELCAD_SLICER;
  const savedPath = process.env.PATH;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kcad-slicer-open-integ-'));
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.KERNELCAD_SLICER;
    else process.env.KERNELCAD_SLICER = savedEnv;
    process.env.PATH = savedPath;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it.skipIf(!HARMLESS)('spawns a real harmless executable and leaves the file untouched', async () => {
    process.env.KERNELCAD_SLICER = HARMLESS;
    delete process.env.PATH;

    const model = join(tmpDir, 'part.step');
    const content = 'ISO-10303-21; dummy STEP';
    writeFileSync(model, content);

    const result = await openFileInSlicer(model, { launchTimeoutMs: 5_000 });

    expect(result.ok).toBe(true);
    expect(result.file).toBe(model);
    expect(result.binary).toBe(HARMLESS);

    // The open action must never modify the exported file.
    expect(existsSync(model)).toBe(true);
    expect(readFileSync(model, 'utf8')).toBe(content);
  });
});
