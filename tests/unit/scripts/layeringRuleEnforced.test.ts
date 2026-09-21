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

  it('keeps modeling below kinematic now that composition owns the script API', async () => {
    const kinematic = await ruleIdsFor('src/modeling/api.ts', "import * as kinematic from '../kinematic';\nexport const k = kinematic;\n");
    expect(kinematic).toContain('no-restricted-imports');
    const agent = await ruleIdsFor('src/modeling/api.ts', "import { x } from '../agent/cli/index';\nexport const y = x;\n");
    expect(agent).toContain('no-restricted-imports');
  }, 120_000);

  it('binds composition above kinematic and below agent', async () => {
    const upward = await ruleIdsFor('src/composition/layeringProbe.ts', "import { x } from '../agent/cli/index';\nexport const y = x;\n");
    expect(upward).toContain('no-restricted-imports');
    const downward = await ruleIdsFor(
      'src/composition/layeringProbe.ts',
      "import * as kinematic from '../kinematic';\nimport { createModelingApi } from '../modeling/api';\nexport const k = { kinematic, createModelingApi };\n",
    );
    expect(downward).not.toContain('no-restricted-imports');
  }, 120_000);

  it('routes script construction through composition, not the modeling factory or core', async () => {
    const modelingFactory = await ruleIdsFor(
      'src/agent/layeringProbe.ts',
      "import { createModelingApi } from '../modeling/api';\nexport const y = createModelingApi;\n",
    );
    expect(modelingFactory).toContain('no-restricted-imports');
    const scriptCore = await ruleIdsFor(
      'src/agent/layeringProbe.ts',
      "import { runScriptCore } from '../modeling/runtime/runScriptCore';\nexport const y = runScriptCore;\n",
    );
    expect(scriptCore).toContain('no-restricted-imports');
    const composed = await ruleIdsFor(
      'src/composition/layeringProbe.ts',
      "import { createModelingApi } from '../modeling/api';\nimport { runScriptCore } from '../modeling/runtime/runScriptCore';\nexport const y = { createModelingApi, runScriptCore };\n",
    );
    expect(composed).not.toContain('no-restricted-imports');
  }, 120_000);

  it('rejects a lower layer importing composition', async () => {
    const ids = await ruleIdsFor('src/modeling/layeringProbe.ts', "import { createScriptApi } from '../composition/scriptApi';\nexport const y = createScriptApi;\n");
    expect(ids).toContain('no-restricted-imports');
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
