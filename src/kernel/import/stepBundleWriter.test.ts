// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { publishStagedStepBundle, renameDirectoryNoReplace, toWindowsExtendedPath } from './stepBundleWriter';

describe('toWindowsExtendedPath', () => {
  it('converts drive-letter paths to the Windows extended-length form', () => {
    expect(toWindowsExtendedPath('C:\\deep\\folder\\bundle')).toBe('\\\\?\\C:\\deep\\folder\\bundle');
  });

  it('converts UNC paths to the Windows extended-length form', () => {
    expect(toWindowsExtendedPath('\\\\server\\share\\deep\\bundle')).toBe('\\\\?\\UNC\\server\\share\\deep\\bundle');
  });
});

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

  it('atomically moves a complete staged directory into its final path', async () => {
    const staging = join(root, 'staging');
    const outDir = join(root, 'bundle');
    await mkdir(join(staging, 'parts'), { recursive: true });
    await writeFile(join(staging, 'manifest.json'), 'complete');
    await writeFile(join(staging, 'parts', 'part.brep'), 'solid');

    await renameDirectoryNoReplace(staging, outDir);

    expect(await readFile(join(outDir, 'manifest.json'), 'utf8')).toBe('complete');
    expect(await readFile(join(outDir, 'parts', 'part.brep'), 'utf8')).toBe('solid');
    await expect(readdir(staging)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not replace an existing empty directory', async () => {
    const staging = join(root, 'staging');
    const outDir = join(root, 'bundle');
    await mkdir(staging);
    await writeFile(join(staging, 'manifest.json'), 'new bundle');
    await mkdir(outDir);

    await expect(renameDirectoryNoReplace(staging, outDir)).rejects.toThrow(/already exists/);

    expect(await readdir(outDir)).toEqual([]);
    expect(await readFile(join(staging, 'manifest.json'), 'utf8')).toBe('new bundle');
  });
});
