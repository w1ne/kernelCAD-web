// tests/unit/cli/evaluate.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScript } from '../../../src/cli/commands/evaluate';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('evaluate command', () => {
  beforeAll(async () => { await initOcct(); });

  it('evaluates a script and returns success summary', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'demo.kcad.ts');
    writeFileSync(file, `
      const b = box(10, 10, 10);
      return b;
    `);
    const result = await evaluateScript({ file });
    expect(result.exitCode).toBe(0);
    expect(result.featureCount).toBe(1);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('returns non-zero exit code on script error', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'bad.kcad.ts');
    writeFileSync(file, `throw new Error('intentional');`);
    const result = await evaluateScript({ file });
    expect(result.exitCode).not.toBe(0);
  });
});
