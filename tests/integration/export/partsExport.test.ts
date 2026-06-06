import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExportParts } from '../../../src/agent/script-runtime/export';

const FIXTURE = resolve('tests/fixtures/print-prep/spice-carousel-v7.6.1.kcad.ts');
const PRINTED = ['base', 'wall', 'skirt', 'drum', 'meter-disc', 'cap', 'cover'];

describe('per-part STL export (carousel v7.6.1)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('exports all parts watertight in one run', { timeout: 300_000 }, async () => {
    const code = await readFile(FIXTURE, 'utf8');
    const r = await runAndExportParts({ code, fileName: FIXTURE, scriptDir: dirname(FIXTURE) });
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(r.parts.map(p => p.name)).toEqual(
      expect.arrayContaining([...PRINTED, 'servo-drum', 'servo-meter', 'battery', 'esp32']),
    );
    for (const p of r.parts) {
      expect(p.bytes.length, p.name).toBeGreaterThan(84);
      expect(p.report.ok, `${p.name}: ${p.report.openEdgeCount} open edges`).toBe(true);
    }
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
