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

  it('keeps the composition-root exceptions narrow', async () => {
    const api = await ruleIdsFor('src/modeling/api.ts', "import { x } from '../agent/cli/index';\nexport const y = x;\n");
    expect(api).toContain('no-restricted-imports');
    const sweep = await ruleIdsFor('src/kinematic/sweepTolerance.ts', "import { x } from '../studio/App';\nexport const y = x;\n");
    expect(sweep).toContain('no-restricted-imports');
    const allowed = await ruleIdsFor('src/modeling/api.ts', "import * as kinematic from '../kinematic';\nexport const k = kinematic;\n");
    expect(allowed).not.toContain('no-restricted-imports');
  }, 120_000);

  it('accepts a same-directory sibling named like a layer', async () => {
    const ids = await ruleIdsFor('src/shared/diagnostics/registry/index.ts', "import { K } from './kinematic';\nexport const k = K;\nexport const load = () => import('./kinematic');\n");
    expect(ids).not.toContain('no-restricted-imports');
    expect(ids).not.toContain('no-restricted-syntax');
  }, 120_000);

  it('rejects a deep upward import', async () => {
    const ids = await ruleIdsFor('src/kernel/backends/occt/layeringProbe.ts', "import { x } from '../../../modeling/api';\nexport const y = x;\n");
    expect(ids).toContain('no-restricted-imports');
  }, 120_000);

  it('accepts a downward import', async () => {
    const ids = await ruleIdsFor('src/modeling/layeringProbe.ts', "import type { Vec3 } from '../shared/intent/types';\nexport type V = Vec3;\n");
    expect(ids).not.toContain('no-restricted-imports');
  }, 120_000);
});
