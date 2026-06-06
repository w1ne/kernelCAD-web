// Proves the watertight verify gate itself: bypass the heal (stitchCracks
// mocked to a no-op) and assert the real verifyWatertight reports the v7.5
// skirt's tangency cracks. Lives in its own file because vi.mock is
// file-global and meshOncePipeline.test.ts needs the real heal.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

vi.mock('../../../src/kernel/backends/occt/meshHeal', async importOriginal => {
  const real = await importOriginal<typeof import('../../../src/kernel/backends/occt/meshHeal')>();
  return { ...real, stitchCracks: vi.fn(() => 0) };
});

import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExportParts } from '../../../src/agent/script-runtime/export';

const FIXTURE = resolve('tests/fixtures/print-prep/spice-carousel-v7.5.kcad.ts');

describe('watertight verify gate (heal bypassed)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('verify gate reports open edges when healing is bypassed', { timeout: 300_000 }, async () => {
    const code = await readFile(FIXTURE, 'utf8');
    const r = await runAndExportParts({
      code,
      fileName: FIXTURE,
      scriptDir: dirname(FIXTURE),
      parts: ['skirt'],
    });
    const skirt = r.parts.find(p => p.name === 'skirt');
    expect(skirt).toBeDefined();
    expect(skirt!.report.ok).toBe(false);
    expect(skirt!.report.openEdgeCount).toBeGreaterThan(0);
    expect(skirt!.report.clusters.length).toBeGreaterThanOrEqual(1);
    expect(skirt!.report.clusters.length).toBeLessThanOrEqual(5);
  });
});
