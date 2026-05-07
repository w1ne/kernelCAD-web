import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runMcpScript } from '../../../src/mcp/runMcpScript';

describe('runMcpScript', () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it('runs inline code and uses <inline> as the file name by default', async () => {
    const result = await runMcpScript({ code: `return box(10, 10, 10);` });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.run.records).toHaveLength(1);
    expect(result.fileName).toBe('<inline>');
  });

  it('runs code loaded from a file and reports the resolved file name', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'kernelcad-mcp-runner-'));
    const file = join(tempDir, 'part.kcad.ts');
    await writeFile(file, `return cylinder(5, 10);`, 'utf8');

    const result = await runMcpScript({ file });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.run.records.map(record => record.kind)).toEqual(['cylinder']);
    expect(result.fileName).toBe(file);
  });

  it('returns a uniform missing-input error', async () => {
    const result = await runMcpScript({});

    expect(result).toEqual({
      ok: false,
      error: 'Must provide either { file } or { code }.',
    });
  });

  it('returns a uniform file-read error', async () => {
    const result = await runMcpScript({ file: '/tmp/kernelcad-missing-script.kcad.ts' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toMatch(/^Cannot read file:/);
  });

  it('returns structured script diagnostics', async () => {
    const result = await runMcpScript({ code: `throw new Error('boom');` });

    expect(result).toEqual({
      ok: false,
      error: 'boom',
      errorCode: 'cli.script-exception',
    });
  });
});
