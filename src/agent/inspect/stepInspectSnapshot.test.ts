// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';

const hooks = vi.hoisted(() => ({
  afterImport: undefined as undefined | (() => Promise<void>),
}));

vi.mock('../mcp/runMcpScript', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../mcp/runMcpScript')>();
  return {
    ...actual,
    runMcpScript: async (input: Parameters<typeof actual.runMcpScript>[0]) => {
      const result = await actual.runMcpScript(input);
      if (result.ok && input.code?.includes('lib.fromSTEP(') && hooks.afterImport) {
        const afterImport = hooks.afterImport;
        hooks.afterImport = undefined;
        await afterImport();
      }
      return result;
    },
  };
});

import { loadImportedStep } from './stepInspectViews';

let root: string;

function generation(bytes: Buffer): string {
  return `importedStep_1@${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}`;
}

function importedAreas(result: Awaited<ReturnType<typeof loadImportedStep>>): number[] {
  if (!('shape' in result)) throw new Error(result.error);
  return result.faces.map((face) => Math.round(face.area * 100) / 100).sort((a, b) => a - b);
}

describe('STEP inspection byte snapshots', () => {
  beforeAll(async () => {
    await initOcct();
    root = mkdtempSync(join(tmpdir(), 'kcad-step-snapshot-'));
  });

  afterAll(() => {
    hooks.afterImport = undefined;
    rmSync(root, { recursive: true, force: true });
  });

  it('binds importGeneration to the bytes imported if the source changes after import', async () => {
    const file = join(root, 'mutable.step');
    const firstBytes = Buffer.from(await OcctBackend.box(30, 20, 10, false).exportSTEPAsync());
    const replacementBytes = Buffer.from(await OcctBackend.box(50, 10, 5, false).exportSTEPAsync());
    writeFileSync(file, firstBytes);
    hooks.afterImport = async () => writeFileSync(file, replacementBytes);

    const first = await loadImportedStep(file);

    expect(importedAreas(first)).toEqual([200, 200, 300, 300, 600, 600]);
    expect('shape' in first && first.importGeneration).toBe(generation(firstBytes));

    const second = await loadImportedStep(file);
    expect(importedAreas(second)).toEqual([50, 50, 250, 250, 500, 500]);
    expect('shape' in second && second.importGeneration).toBe(generation(replacementBytes));
  });

  it('uses the new bytes for a later inspection after an overwrite between calls', async () => {
    const file = join(root, 'between-inspections.step');
    const firstBytes = Buffer.from(await OcctBackend.box(30, 20, 10, false).exportSTEPAsync());
    const secondBytes = Buffer.from(await OcctBackend.box(50, 10, 5, false).exportSTEPAsync());
    writeFileSync(file, firstBytes);

    const first = await loadImportedStep(file);
    writeFileSync(file, secondBytes);
    const second = await loadImportedStep(file);

    expect(importedAreas(first)).toEqual([200, 200, 300, 300, 600, 600]);
    expect('shape' in first && first.importGeneration).toBe(generation(firstBytes));
    expect(importedAreas(second)).toEqual([50, 50, 250, 250, 500, 500]);
    expect('shape' in second && second.importGeneration).toBe(generation(secondBytes));
  });
});
