// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { execFile } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface PreflightCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface PreflightReport {
  ok: boolean;
  checks: PreflightCheck[];
}

export interface PreflightDeps {
  env: Record<string, string | undefined>;
  exists: (path: string) => boolean;
  run: (cmd: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>;
  fetchImpl: typeof fetch;
  caseCount: () => number;
}

const JUDGE_MODEL = 'google/gemini-3.1-pro';
const DEFAULT_BASE_URL = 'https://api.deepinfra.com/v1/openai';

function defaultDeps(): PreflightDeps {
  const museRoot = process.env.MUSE_ROOT ?? join(process.env.HOME ?? '', 'projects/muse');
  return {
    env: process.env as Record<string, string | undefined>,
    exists: existsSync,
    run: (cmd, args) =>
      new Promise((res) => {
        execFile(cmd, args, { timeout: 120_000 }, (err, stdout, stderr) => {
          res({
            code: err ? ((err as { code?: number }).code ?? 1) : 0,
            stdout: String(stdout ?? ''),
            stderr: String(stderr ?? ''),
          });
        });
      }),
    fetchImpl: fetch,
    caseCount: () => {
      const dir = join(museRoot, 'data/muse/cases');
      return existsSync(dir) ? readdirSync(dir).length : 0;
    },
  };
}

export async function runPreflight(deps: PreflightDeps): Promise<PreflightReport> {
  const checks: PreflightCheck[] = [];
  const push = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

  const kcadBin = deps.env.KERNELCAD_BIN ?? './dist/cli/index.js';
  const kcadPath = kcadBin.endsWith('.js') ? resolve(kcadBin) : kcadBin;
  push('kernelcad cli', deps.exists(kcadPath), kcadPath);

  const museRoot = deps.env.MUSE_ROOT ?? join(deps.env.HOME ?? '', 'projects/muse');
  push('muse checkout', deps.exists(resolve(museRoot, 'src/judge_system')), museRoot);

  const python = deps.env.MUSE_PYTHON ?? join(museRoot, '.venv/bin/python');
  const importCheck = await deps.run(python, [
    '-c',
    `import sys; sys.path.insert(0, ${JSON.stringify(resolve(museRoot, 'src'))}); import cadquery, vtk, requests; from judge_system import reverse_pipeline; print('ok')`,
  ]);
  push(
    'muse python imports',
    importCheck.code === 0 && importCheck.stdout.includes('ok'),
    importCheck.stderr.trim().slice(0, 200) || python,
  );

  const key = deps.env.DEEPINFRA_API_KEY;
  push('deepinfra key', Boolean(key && key.length > 0), key ? 'set' : 'DEEPINFRA_API_KEY missing');

  const baseUrl = (deps.env.DEEPINFRA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  try {
    const resp = await deps.fetchImpl(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${key ?? ''}` },
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await resp.json()) as { data?: Array<{ id?: string }> };
    const ids = (data.data ?? []).map((m) => m.id ?? '');
    push('judge model', resp.ok && ids.includes(JUDGE_MODEL), `${JUDGE_MODEL} @ ${baseUrl}`);
  } catch (err) {
    push('judge model', false, err instanceof Error ? err.message : String(err));
  }

  const count = deps.caseCount();
  push('muse cases', count === 106, `${count} cases (expected 106)`);

  return { ok: checks.every((c) => c.ok), checks };
}

export function formatPreflight(report: PreflightReport): string {
  return report.checks.map((c) => `${c.ok ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`).join('\n');
}

async function main(): Promise<void> {
  const report = await runPreflight(defaultDeps());
  console.log(formatPreflight(report));
  process.exit(report.ok ? 0 : 1);
}

const isEntrypoint = (() => {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === new URL(`file://${process.argv[1]}`).href;
  } catch {
    return false;
  }
})();

if (isEntrypoint) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
