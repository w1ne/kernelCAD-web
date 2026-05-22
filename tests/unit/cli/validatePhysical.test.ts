import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

describe('kernelcad validate --physical', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('fails legacy fixed joints that connect parts across a visible air gap', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-validate-physical-'));
    const file = join(tmp, 'floating-fixed.kcad.ts');
    writeFileSync(file, `
      const arm = assembly('floating-fixed');
      const base = arm.part('base', box(10, 10, 10, true));
      const ornament = arm.part('ornament', box(4, 4, 4, true).translate(40, 0, 0));
      arm.fixed('pretend-mount', base, ornament);
      return arm.model();
    `);

    const plain = await runValidateCli({
      file,
      json: true,
      includeInterference: false,
      epsilon: 0.01,
      physical: false,
    });
    expect(plain.exitCode).toBe(0);

    const physical = await runValidateCli({
      file,
      json: true,
      includeInterference: false,
      epsilon: 0.01,
      physical: true,
    });
    expect(physical.exitCode).toBe(2);
    expect(physical.physicalDiagnostics?.some((d) => d.code === 'assembly.mechanical.fixed-contact-missing')).toBe(true);
  }, 60000);

  it('passes fixed joints whose parts share contact area', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-validate-physical-'));
    const file = join(tmp, 'contact-fixed.kcad.ts');
    writeFileSync(file, `
      const arm = assembly('contact-fixed');
      const base = arm.part('base', box(10, 10, 10, true));
      const cap = arm.part('cap', box(6, 6, 3, true).translate(0, 0, 6.5));
      arm.fixed('real-mount', base, cap);
      return arm.model();
    `);

    const physical = await runValidateCli({
      file,
      json: true,
      includeInterference: false,
      epsilon: 0.01,
      physical: true,
    });
    expect(physical.exitCode).toBe(0);
    expect(physical.physicalDiagnostics ?? []).toEqual([]);
  }, 60000);
});
