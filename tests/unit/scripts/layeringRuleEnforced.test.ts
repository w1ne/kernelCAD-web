// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Guards the import-layering gate itself. ESLint flat config lets a later
// config block replace an earlier block's options for the same rule, which
// once switched the layering patterns off without any test noticing. These
// probes lint in-memory sources against the REAL eslint.config.js.
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');

async function ruleIdsFor(filePath: string, code: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: repoRoot });
  const [result] = await eslint.lintText(code, { filePath: path.join(repoRoot, filePath) });
  return result.messages.map((m) => m.ruleId ?? '');
}

describe('import layering rule is live', () => {
  it('rejects a static upward import', async () => {
    const ids = await ruleIdsFor('src/kernel/layeringProbe.ts', "import { x } from '../modeling/api';\nexport const y = x;\n");
    expect(ids).toContain('no-restricted-imports');
  }, 120_000);

  it('rejects an upward re-export', async () => {
    const ids = await ruleIdsFor('src/shared/layeringProbe.ts', "export * from '../kernel/backend';\n");
    expect(ids).toContain('no-restricted-imports');
  }, 120_000);

  it('rejects a dynamic upward import', async () => {
    const ids = await ruleIdsFor('src/modeling/layeringProbe.ts', "export const load = () => import('../agent/cli/index');\n");
    expect(ids).toContain('no-restricted-syntax');
  }, 120_000);

  it('rejects an import of a deprecated shim path from a layered file', async () => {
    const ids = await ruleIdsFor('src/agent/layeringProbe.ts', "import { x } from '../modeling/capture/hermiteG2';\nexport const y = x;\n");
    expect(ids).toContain('no-restricted-imports');
  }, 120_000);

  it('accepts a downward import', async () => {
    const ids = await ruleIdsFor('src/modeling/layeringProbe.ts', "import type { Vec3 } from '../shared/intent/types';\nexport type V = Vec3;\n");
    expect(ids).not.toContain('no-restricted-imports');
  }, 120_000);
});
