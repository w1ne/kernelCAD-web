// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { StepAssemblySnapshot, StepMatrix4 } from './stepAssemblyTypes';
import { publishStagedStepBundle, renameDirectoryNoReplace, stepPartNames, toWindowsExtendedPath, writeStepBundle } from './stepBundleWriter';

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

describe('stepPartNames', () => {
  const names = (...paths: string[][]) => stepPartNames(paths.map((sourcePath) => ({ sourcePath })));

  it('drops the root product every occurrence shares', () => {
    expect(names(['pinned_plate', 'plate'], ['pinned_plate', 'pin_left'])).toEqual({ names: ['plate', 'pin_left'], renamed: [] });
  });

  it('keeps sub-assembly levels below the shared root', () => {
    expect(names(['arm', 'base'], ['arm', 'wrist', 'flange']).names).toEqual(['base', 'wrist__flange']);
  });

  it('keeps the full name when there is no shared root', () => {
    expect(names(['plate'], ['pin']).names).toEqual(['plate', 'pin']);
    expect(names(['left', 'pin'], ['right', 'pin']).names).toEqual(['left__pin', 'right__pin']);
    // A root-level body next to a nested one: the first segment is not a common root.
    expect(names(['rack'], ['rack', 'post']).names).toEqual(['rack', 'rack__post']);
  });

  it('reports each name it had to sanitize or make unique', () => {
    const result = names(['frame', 'M3 screw'], ['frame', 'M3 screw'], ['frame', 'rail'], ['frame', '///']);
    expect(result.names).toEqual(['M3-screw', 'M3-screw__000002_1', 'rail', 'part-000004']);
    expect(result.renamed).toEqual([
      { sourcePath: ['frame', 'M3 screw'], partName: 'M3-screw' },
      { sourcePath: ['frame', 'M3 screw'], partName: 'M3-screw__000002_1' },
      { sourcePath: ['frame', '///'], partName: 'part-000004' },
    ]);
  });
});

describe('writeStepBundle part names', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'step-bundle-names-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes root-free part names to the script and the manifest, and reports renames', async () => {
    const identity: StepMatrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const snapshot: StepAssemblySnapshot = {
      sourceLengthUnits: ['millimetre'],
      definitions: [{
        id: 'def-1', sourceLabel: '0:1:1:1', name: 'pin', brep: new Uint8Array([1, 2, 3]), brepVersion: 'test', solidCount: 1,
        boundsMm: { min: [0, 0, 0], max: [1, 1, 1] }, volumeMm3: 1,
      }],
      occurrences: [
        { id: 'occ-000001', name: 'pin_left', sourcePath: ['panel', 'pin_left'], definitionId: 'def-1', transform: identity },
        { id: 'occ-000002', name: 'pin right', sourcePath: ['panel', 'pin right'], definitionId: 'def-1', transform: identity },
      ],
      warnings: ['existing warning'],
    };
    const bundle = await writeStepBundle({ inputName: 'panel.step', inputBytes: new Uint8Array([0]), outDir: join(root, 'bundle'), assemblyName: 'panel', snapshot });

    const script = await readFile(bundle.script, 'utf8');
    expect(script.match(/imported\.part\("[^"]*"/g)).toEqual(['imported.part("pin_left"', 'imported.part("pin-right"']);
    expect(bundle.renamedParts).toEqual([{ sourcePath: ['panel', 'pin right'], partName: 'pin-right' }]);

    const manifest = JSON.parse(await readFile(bundle.manifest, 'utf8'));
    expect(manifest.occurrences.map((o: { partName: string }) => o.partName)).toEqual(['pin_left', 'pin-right']);
    expect(manifest.occurrences[1].sourcePath).toEqual(['panel', 'pin right']);
    expect(manifest.warnings).toEqual(['existing warning', "STEP name 'panel / pin right' is not a usable part name; the part is 'pin-right'."]);
  });
});
