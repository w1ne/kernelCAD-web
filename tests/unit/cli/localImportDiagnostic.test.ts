// tests/unit/cli/localImportDiagnostic.test.ts
//
// Gap #7 (turbojet README gap log): top-level imports in `.kcad.ts` scripts
// used to be stripped by `normalizeUserScript` before execution, so
// `import { helper } from './lib.ts'` died mid-evaluation with
// `ReferenceError: helper is not defined`. The script host now refuses them
// up front with a structured `feature.invalid-args` KernelError; scripts
// without imports are unchanged, and the normalizer itself stays lenient for
// never-executed sources.

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { KernelError } from '../../../src/shared/intent/kernelError';
import { normalizeUserScript } from '../../../src/shared/runtime/normalizeUserScript';

describe('local imports in .kcad.ts (gap #7)', () => {
  beforeAll(async () => { await initOcct(); });

  it('throws a structured feature.invalid-args KernelError at the script host', async () => {
    let caught: unknown;
    try {
      await runScript({
        code: "import { helper } from './lib.ts';\nexport default helper(2);",
        fileName: 'imports.kcad.ts',
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.invalid-args');
    expect((caught as KernelError).message).toMatch(/local imports are not supported in \.kcad\.ts/);
    expect((caught as KernelError).message).toMatch(/imports are stripped before execution/);
    expect((caught as KernelError).hint).toBeTruthy();
  });

  it('refuses a CommonJS require() the same way', async () => {
    await expect(
      runScript({
        code: "const helper = require('./lib.js');\nexport default helper(2);",
        fileName: 'require.kcad.ts',
      }),
    ).rejects.toMatchObject({ code: 'feature.invalid-args' });
  });

  it('surfaces the refusal as a feature.invalid-args diagnostic through evaluate', async () => {
    const result = await evaluateScript({
      code: "import { helper } from './lib.ts';\nexport default helper(2);",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.diagnostics[0]?.code).toBe('feature.invalid-args');
    expect(result.diagnostics[0]?.message).toMatch(/local imports are not supported/);
  });

  it('leaves an import-free script unchanged', async () => {
    const result = await evaluateScript({ code: 'export default box(2, 3, 4);' });
    expect(result.exitCode).toBe(0);
    expect(result.featureCount).toBe(1);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });

  it('keeps normalizeUserScript lenient for never-executed sources', () => {
    const out = normalizeUserScript("import { helper } from './lib.ts';\nexport default helper(2);");
    expect(out).not.toMatch(/^[ \t]*import\b/m);
    expect(out).toMatch(/return helper\(2\);/);
  });
});
