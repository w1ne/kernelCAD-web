// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { publishStagedStepBundle } from './stepBundleWriter';

describe('publishStagedStepBundle', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'step-bundle-publish-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('allows only one concurrent publisher to claim a destination', async () => {
    const first = join(root, 'first');
    const second = join(root, 'second');
    const outDir = join(root, 'bundle');
    await Promise.all([mkdir(first), mkdir(second)]);
    await Promise.all([
      writeFile(join(first, 'manifest.json'), 'first'),
      writeFile(join(second, 'manifest.json'), 'second'),
    ]);

    const results = await Promise.allSettled([
      publishStagedStepBundle(first, outDir),
      publishStagedStepBundle(second, outDir),
    ]);

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(await readdir(outDir)).toEqual(['manifest.json']);
    expect(['first', 'second']).toContain(await readFile(join(outDir, 'manifest.json'), 'utf8'));
  });

  it('preserves a destination created after staging completed', async () => {
    const staging = join(root, 'staging');
    const outDir = join(root, 'bundle');
    await mkdir(staging);
    await writeFile(join(staging, 'manifest.json'), 'new bundle');
    await mkdir(outDir);
    await writeFile(join(outDir, 'keep.txt'), 'pre-existing data');

    await expect(publishStagedStepBundle(staging, outDir)).rejects.toThrow(/already exists/);
    expect(await readdir(outDir)).toEqual(['keep.txt']);
    expect(await readFile(join(outDir, 'keep.txt'), 'utf8')).toBe('pre-existing data');
  });
});
