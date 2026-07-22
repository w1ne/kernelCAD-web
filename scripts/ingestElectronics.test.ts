// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  ingestDirectory: vi.fn(),
}));

vi.mock('node:child_process', () => ({ execFileSync: mocks.execFileSync }));
vi.mock('./ingestParts', () => ({
  AuthoredManifestError: class AuthoredManifestError extends Error {},
  ingestDirectory: mocks.ingestDirectory,
}));

import { authoredExportArgs, ingestElectronics } from './ingestElectronics';

const temporaryDirectories: string[] = [];

afterEach(() => {
  vi.unstubAllGlobals();
  mocks.execFileSync.mockReset();
  mocks.ingestDirectory.mockReset();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createTemporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

describe('ingestElectronics', () => {
  it('requests a connector manifest when exporting an authored catalog part', () => {
    expect(authoredExportArgs(
      '/repo/dist/cli/index.js',
      '/repo/part.kcad.ts',
      '/tmp/part.step',
      '/tmp/part.manifest.json',
      { id: 'a4988-stepstick-carrier', family: 'stepper-driver' },
    )).toEqual([
      '/repo/dist/cli/index.js',
      'export',
      'step',
      '/repo/part.kcad.ts',
      '-o',
      '/tmp/part.step',
      '--connector-manifest',
      '/tmp/part.manifest.json',
      '--manifest-part-id',
      'a4988-stepstick-carrier',
      '--manifest-family',
      'stepper-driver',
    ]);
  });

  it('places the CLI-produced authored manifest in the generated ingest sidecar', async () => {
    const repoRoot = createTemporaryDirectory('kc-electronics-authored-');
    const manifestPath = join(repoRoot, 'scripts', 'electronics-parts.json');
    const outDir = createTemporaryDirectory('kc-electronics-out-');
    const exportedManifest = {
      schemaVersion: 1,
      partId: 'a4988-stepstick-carrier',
      family: 'stepper-driver',
      connectors: [{
        name: 'carrier-solder-face',
        type: 'frame',
        origin: [1, 2, 3],
        normal: [0, 0, 1],
      }],
    };
    mkdirSync(join(repoRoot, 'scripts'), { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify({
        baseModelUrl: 'https://parts.example',
        license: 'CC-BY-4.0',
        attribution: 'fixture',
        parts: [{
          id: 'a4988-stepstick-carrier',
          name: 'A4988 carrier',
          family: 'stepper-driver',
          mpn: 'A4988',
          kcad_source: 'scripts/parts/authored/a4988-stepstick-carrier.kcad.ts',
        }],
      }),
    );

    mocks.execFileSync.mockImplementation((_: string, args: string[]) => {
      const stepOut = args[args.indexOf('-o') + 1];
      writeFileSync(stepOut, 'ISO-10303-21;\nEND-ISO-10303-21;\n');
      const manifestIndex = args.indexOf('--connector-manifest');
      if (manifestIndex >= 0) {
        writeFileSync(args[manifestIndex + 1], JSON.stringify(exportedManifest));
      }
    });

    let generatedSidecar: unknown;
    mocks.ingestDirectory.mockImplementation(async (src: string, temporaryOut: string) => {
      temporaryDirectories.push(src, temporaryOut);
      generatedSidecar = JSON.parse(
        readFileSync(join(src, 'a4988-stepstick-carrier.meta.json'), 'utf8'),
      );
      return [];
    });

    await ingestElectronics(manifestPath, outDir, 'https://catalog.example');

    expect(generatedSidecar).toMatchObject({
      id: 'a4988-stepstick-carrier',
      family: 'stepper-driver',
      connectorManifest: exportedManifest,
    });
  });

  it('fails the release when an authored STEP lacks its required connector manifest', async () => {
    const repoRoot = createTemporaryDirectory('kc-electronics-missing-manifest-');
    const manifestPath = join(repoRoot, 'scripts', 'electronics-parts.json');
    const outDir = createTemporaryDirectory('kc-electronics-out-');
    mkdirSync(join(repoRoot, 'scripts'), { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify({
        baseModelUrl: 'https://parts.example',
        license: 'CC-BY-4.0',
        attribution: 'fixture',
        parts: [{
          id: 'a4988-stepstick-carrier',
          name: 'A4988 carrier',
          family: 'stepper-driver',
          mpn: 'A4988',
          kcad_source: 'scripts/parts/authored/a4988-stepstick-carrier.kcad.ts',
        }],
      }),
    );
    mocks.execFileSync.mockImplementation((_: string, args: string[]) => {
      const stepOut = args[args.indexOf('-o') + 1];
      writeFileSync(stepOut, 'ISO-10303-21;\nEND-ISO-10303-21;\n');
    });
    mocks.ingestDirectory.mockResolvedValue([]);

    await expect(ingestElectronics(manifestPath, outDir, 'https://catalog.example'))
      .rejects.toThrow(/authored connector manifest/i);
    expect(mocks.ingestDirectory).not.toHaveBeenCalled();
  });

  it('fails the release before ingestion when an authored manifest has another part identity', async () => {
    const repoRoot = createTemporaryDirectory('kc-electronics-wrong-manifest-');
    const manifestPath = join(repoRoot, 'scripts', 'electronics-parts.json');
    const outDir = createTemporaryDirectory('kc-electronics-out-');
    mkdirSync(join(repoRoot, 'scripts'), { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify({
        baseModelUrl: 'https://parts.example',
        license: 'CC-BY-4.0',
        attribution: 'fixture',
        parts: [{
          id: 'a4988-stepstick-carrier',
          name: 'A4988 carrier',
          family: 'stepper-driver',
          mpn: 'A4988',
          kcad_source: 'scripts/parts/authored/a4988-stepstick-carrier.kcad.ts',
        }],
      }),
    );
    mocks.execFileSync.mockImplementation((_: string, args: string[]) => {
      const stepOut = args[args.indexOf('-o') + 1];
      const sidecarOut = args[args.indexOf('--connector-manifest') + 1];
      writeFileSync(stepOut, 'ISO-10303-21;\nEND-ISO-10303-21;\n');
      writeFileSync(sidecarOut, JSON.stringify({
        schemaVersion: 1,
        partId: 'different-part',
        family: 'stepper-driver',
        connectors: [],
      }));
    });
    mocks.ingestDirectory.mockResolvedValue([]);

    await expect(ingestElectronics(manifestPath, outDir, 'https://catalog.example'))
      .rejects.toThrow(/does not match catalog identity/i);
    expect(mocks.ingestDirectory).not.toHaveBeenCalled();
  });

  it('fails the release when a failed authored CLI export has already written STEP', async () => {
    const repoRoot = createTemporaryDirectory('kc-electronics-cli-after-step-');
    const manifestPath = join(repoRoot, 'scripts', 'electronics-parts.json');
    const outDir = createTemporaryDirectory('kc-electronics-out-');
    mkdirSync(join(repoRoot, 'scripts'), { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify({
        baseModelUrl: 'https://parts.example',
        license: 'CC-BY-4.0',
        attribution: 'fixture',
        parts: [{
          id: 'a4988-stepstick-carrier',
          name: 'A4988 carrier',
          family: 'stepper-driver',
          mpn: 'A4988',
          kcad_source: 'scripts/parts/authored/a4988-stepstick-carrier.kcad.ts',
        }],
      }),
    );
    mocks.execFileSync.mockImplementation((_: string, args: string[]) => {
      const stepOut = args[args.indexOf('-o') + 1];
      writeFileSync(stepOut, 'ISO-10303-21;\nEND-ISO-10303-21;\n');
      throw new Error('connector sidecar export failed');
    });

    await expect(ingestElectronics(manifestPath, outDir, 'https://catalog.example'))
      .rejects.toThrow(/without a successful connector-manifest export/i);
    expect(mocks.ingestDirectory).not.toHaveBeenCalled();
  });

  it('fails the release before ingestion when an authored manifest is malformed', async () => {
    const repoRoot = createTemporaryDirectory('kc-electronics-malformed-manifest-');
    const manifestPath = join(repoRoot, 'scripts', 'electronics-parts.json');
    const outDir = createTemporaryDirectory('kc-electronics-out-');
    mkdirSync(join(repoRoot, 'scripts'), { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify({
        baseModelUrl: 'https://parts.example',
        license: 'CC-BY-4.0',
        attribution: 'fixture',
        parts: [{
          id: 'a4988-stepstick-carrier',
          name: 'A4988 carrier',
          family: 'stepper-driver',
          mpn: 'A4988',
          kcad_source: 'scripts/parts/authored/a4988-stepstick-carrier.kcad.ts',
        }],
      }),
    );
    mocks.execFileSync.mockImplementation((_: string, args: string[]) => {
      const stepOut = args[args.indexOf('-o') + 1];
      const sidecarOut = args[args.indexOf('--connector-manifest') + 1];
      writeFileSync(stepOut, 'ISO-10303-21;\nEND-ISO-10303-21;\n');
      writeFileSync(sidecarOut, '{not JSON');
    });

    await expect(ingestElectronics(manifestPath, outDir, 'https://catalog.example'))
      .rejects.toThrow(/invalid authored connector manifest/i);
    expect(mocks.ingestDirectory).not.toHaveBeenCalled();
  });
});
