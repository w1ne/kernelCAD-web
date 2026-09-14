// tests/unit/cli/evaluate.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
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

  it('evaluates inline code and returns success summary', async () => {
    const result = await evaluateScript({
      code: `
        const plate = box(10, 10, 2);
        return plate;
      `,
    });

    expect(result.exitCode).toBe(0);
    expect(result.featureCount).toBe(1);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });

  it('a boolean param() actually gates a feature through the real CLI evaluate path (regression: b.value used to be undefined)', async () => {
    const codeFor = (hasLid: boolean) => `
      const hasLid = param('HasLid', ${hasLid});
      let body = box(20, 20, 10);
      if (hasLid.value) { body = body.chamfer(1, { face: 'top' }); }
      return body;
    `;
    const withLid = await evaluateScript({ code: codeFor(true) });
    const withoutLid = await evaluateScript({ code: codeFor(false) });

    expect(withLid.exitCode).toBe(0);
    expect(withoutLid.exitCode).toBe(0);
    expect(withLid.featureCount).toBe(2); // box + chamfer
    expect(withoutLid.featureCount).toBe(1); // box only — the `if` branch is real dead code, not always-false
    expect(withLid.featureCount).not.toBe(withoutLid.featureCount);
  });

  it('maps missing file to cli.file-read diagnostic', async () => {
    const result = await evaluateScript({ file: '/tmp/kernelcad-no-such-file.kcad.ts' });

    expect(result.exitCode).toBe(2);
    expect(result.featureCount).toBe(0);
    expect(result.diagnostics[0]?.code).toBe('cli.file-read');
  });

  it('returns non-zero exit code on script error', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'bad.kcad.ts');
    writeFileSync(file, `throw new Error('intentional');`);
    const result = await evaluateScript({ file });
    expect(result.exitCode).not.toBe(0);
  });
});
