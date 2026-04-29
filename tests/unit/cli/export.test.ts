import { describe, it, expect, beforeAll } from 'vitest';
import { exportScript } from '../../../src/cli/commands/export';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { writeFileSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('export command', () => {
  beforeAll(async () => { await initOcct(); });

  it('exports STL for a valid script', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'demo.kcad.ts');
    const out  = join(tmp, 'demo.stl');
    writeFileSync(file, `return box(10, 10, 10);`);
    const r = await exportScript({ file, format: 'stl', out });
    expect(r.exitCode).toBe(0);
    expect(statSync(out).size).toBeGreaterThan(84);
  });

  it('exports STEP for a valid script', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'demo.kcad.ts');
    const out  = join(tmp, 'demo.step');
    writeFileSync(file, `return box(10, 10, 10);`);
    const r = await exportScript({ file, format: 'step', out });
    expect(r.exitCode).toBe(0);
    const text = readFileSync(out, 'utf8');
    expect(text).toContain('ISO-10303');
  });

  it('returns non-zero on diagnostic errors', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'bad.kcad.ts');
    const out  = join(tmp, 'bad.step');
    writeFileSync(file, `throw new Error('boom');`);
    const r = await exportScript({ file, format: 'step', out });
    expect(r.exitCode).not.toBe(0);
  });
});
