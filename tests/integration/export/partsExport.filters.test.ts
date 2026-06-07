// Per-part STL export (carousel v7.6.1) — part-name filtering and
// not-found diagnostics.
//
// Split out of partsExport.test.ts for CI shard balance (per-file vitest
// sharding). Same fixture; each test exercises a different `parts`
// filter so the export runs cannot be shared.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExportParts } from '../../../src/agent/script-runtime/export';

const FIXTURE = resolve('tests/fixtures/print-prep/spice-carousel-v7.6.1.kcad.ts');

describe('per-part STL export (carousel v7.6.1)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('filters to requested part names', { timeout: 120_000 }, async () => {
    const code = await readFile(FIXTURE, 'utf8');
    const r = await runAndExportParts({
      code, fileName: FIXTURE, scriptDir: dirname(FIXTURE), parts: ['cap', 'meter-disc'],
    });
    expect(r.parts.map(p => p.name).sort()).toEqual(['cap', 'meter-disc']);
  });

  it('unknown part name -> export.part.not-found listing valid names', { timeout: 120_000 }, async () => {
    const code = await readFile(FIXTURE, 'utf8');
    const r = await runAndExportParts({
      code, fileName: FIXTURE, scriptDir: dirname(FIXTURE), parts: ['skrit'],
    });
    const diag = r.diagnostics.find(d => d.code === 'export.part.not-found');
    expect(diag).toBeDefined();
    expect(diag!.message).toContain('skrit');
    expect(diag!.message).toContain('skirt'); // valid names listed
    expect(r.parts).toEqual([]);
  });
});
