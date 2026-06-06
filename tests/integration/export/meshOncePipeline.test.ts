import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExportParts } from '../../../src/agent/script-runtime/export';

const FIXTURE = resolve('tests/fixtures/print-prep/spice-carousel-v7.5.kcad.ts');

describe('mesh-once export pipeline heals tangency-era geometry (carousel v7.5)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('every part exports watertight, including the tangency-cracked wall/skirt/drum', { timeout: 300_000 }, async () => {
    const code = await readFile(FIXTURE, 'utf8');
    const r = await runAndExportParts({ code, fileName: FIXTURE, scriptDir: dirname(FIXTURE) });
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(r.parts.length).toBe(11);
    for (const p of r.parts) {
      expect(p.report.ok, `${p.name}: ${p.report.openEdgeCount} open edges at ${JSON.stringify(p.report.clusters)}`).toBe(true);
    }
  });
});
