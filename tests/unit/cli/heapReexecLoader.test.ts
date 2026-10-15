import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CLI heap restart under a TypeScript loader', () => {
  it('preserves the loader so a mesh command reaches normal input validation (parts: no render surface needed)', () => {
    const env = { ...process.env };
    delete env.NODE_OPTIONS;
    delete env.KCAD_HEAP_REEXEC;
    const missing = resolve('missing-heap-loader-regression.kcad.ts');
    const child = spawnSync(process.execPath, [
      '--import', 'tsx', resolve('src/agent/cli/index.ts'), 'parts', missing,
    ], { cwd: process.cwd(), env, encoding: 'utf8', timeout: 20_000 });
    const output = child.stdout + child.stderr;
    expect(child.error).toBeUndefined();
    expect(output).toContain('re-executing with --max-old-space-size=');
    expect(output).not.toContain('ERR_UNKNOWN_FILE_EXTENSION');
    expect(output).toContain('missing-heap-loader-regression.kcad.ts');
  }, 25_000);
});
