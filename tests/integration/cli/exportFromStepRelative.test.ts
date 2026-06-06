import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { exportScript } from '../../../src/agent/cli/commands/export';

describe('CLI export resolves lib.fromSTEP relative to the script', () => {
  let scriptPath: string;

  beforeAll(async () => {
    await initOcct();
    const dir = await mkdtemp(join(tmpdir(), 'kcad-export-rel-'));
    await mkdir(join(dir, 'parts'), { recursive: true });
    const step = await runAndExport({
      code: 'return box(1, 1, 1, true);',
      fileName: 'cube.kcad.ts',
      format: 'step',
    });
    expect(step.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    await writeFile(join(dir, 'parts', 'cube-1mm.step'), step.bytes);
    scriptPath = join(dir, 'model.kcad.ts');
    await writeFile(scriptPath, "return await lib.fromSTEP('parts/cube-1mm.step');\n");
  }, 120_000);

  it('exports STL while cwd is the repo root, not the script dir', async () => {
    const out = scriptPath.replace(/\.kcad\.ts$/, '.stl');
    const r = await exportScript({ file: scriptPath, format: 'stl', out });
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(r.exitCode).toBe(0);
    expect(r.bytesWritten).toBeGreaterThan(0);
  }, 120_000);
});
