// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The usd-isaac serializer only had string-matching coverage before this
// test: nothing ever opened the emitted .usda with real USD/Isaac schemas.
// This exports the two-link arm example (examples/sim-export/
// two-link-arm-usd-isaac.kcad.ts) and hands the stage to
// scripts/validate/usd_physics_check.py, which uses `pxr` (Usd, UsdGeom,
// UsdPhysics) to confirm the stage actually opens and its physics schemas
// resolve — not just that the text contains the right tokens.
//
// Skips locally when `pxr` is unavailable (no usd-core installed); fails
// under KERNELCAD_REQUIRE_FEA_TOOLCHAIN=1, the flag the `external-tools` CI
// job sets so a broken usd-core install fails loudly instead of skipping.

import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { exportModelTool } from '../../../src/agent/mcp/tools/exportModel';

const execFileAsync = promisify(execFile);
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Candidate Python interpreters that might have `pxr` importable. */
function pythonCandidates(): string[] {
  const out: string[] = [];
  if (process.env.KERNELCAD_FEA_PYTHON) out.push(process.env.KERNELCAD_FEA_PYTHON);
  const venvPython = join(REPO_ROOT, '.tools-venv', 'bin', 'python');
  if (existsSync(venvPython)) out.push(venvPython);
  const feaVenvPython = join(REPO_ROOT, '.fea-venv', 'bin', 'python');
  if (existsSync(feaVenvPython)) out.push(feaVenvPython);
  out.push('python3', 'python');
  return out;
}

async function findPxrPython(): Promise<string | undefined> {
  for (const cand of pythonCandidates()) {
    try {
      await execFileAsync(cand, ['-c', 'import pxr'], { timeout: 15_000 });
      return cand;
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

describe('usd-isaac export validated with real pxr (Usd, UsdGeom, UsdPhysics)', () => {
  let pythonWithPxr: string | undefined;

  beforeAll(async () => {
    await initOcct();
    pythonWithPxr = await findPxrPython();
    if (pythonWithPxr === undefined && process.env.KERNELCAD_REQUIRE_FEA_TOOLCHAIN === '1') {
      throw new Error(
        'KERNELCAD_REQUIRE_FEA_TOOLCHAIN=1 but no Python with `pxr` (usd-core) was found. ' +
          'Install with: python3 -m venv .tools-venv && .tools-venv/bin/pip install usd-core',
      );
    }
  });

  it('produces a stage that opens under pxr with valid physics schemas', async () => {
    if (pythonWithPxr === undefined) {
      console.warn(
        '[skipped] usd-isaac pxr validation needs usd-core (`pip install usd-core`). ' +
          'Install into .tools-venv or point KERNELCAD_FEA_PYTHON at an interpreter that has it.',
      );
      return;
    }

    const armCode = await readFile(
      join(REPO_ROOT, 'examples', 'sim-export', 'two-link-arm-usd-isaac.kcad.ts'),
      'utf8',
    );
    // Strip the leading documentation comment block; exportModelTool expects
    // the .kcad.ts body, same as the CLI does when it reads the file.
    const dir = await mkdtemp(join(tmpdir(), 'kc-usd-pxr-'));
    const outPath = join(dir, 'two-link-arm.usda');

    const r = await exportModelTool({
      code: armCode,
      output_path: outPath,
      format: 'usd-isaac',
    });
    expect(r.ok).toBe(true);

    const scriptPath = join(REPO_ROOT, 'scripts', 'validate', 'usd_physics_check.py');
    const { stdout } = await execFileAsync(pythonWithPxr, [scriptPath, outPath], {
      timeout: 60_000,
    });
    expect(stdout).toContain('PASS: all usd-isaac physics checks succeeded');
    expect(stdout).toContain('ArticulationRootAPI applied on');
    expect(stdout).toMatch(/mass = 0\.2511999/);
    expect(stdout).toMatch(/joint .*axis = Z/);
  }, 60_000);
});
