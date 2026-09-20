// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { runPreflight, formatPreflight, type PreflightDeps } from './musePreflight';

function deps(overrides: Partial<PreflightDeps> = {}): PreflightDeps {
  return {
    env: {
      DEEPINFRA_API_KEY: 'x',
      MUSE_ROOT: '/muse',
      MUSE_PYTHON: '/muse/.venv/bin/python',
      KERNELCAD_BIN: './dist/cli/index.js',
    },
    exists: () => true,
    run: async () => ({ code: 0, stdout: 'ok\n', stderr: '' }),
    fetchImpl: (async () =>
      new Response(JSON.stringify({ data: [{ id: 'google/gemini-3.1-pro' }] }), {
        status: 200,
      })) as unknown as typeof fetch,
    caseCount: () => 106,
    ...overrides,
  };
}

describe('runPreflight', () => {
  it('passes when every check is green', async () => {
    const report = await runPreflight(deps());
    expect(report.ok).toBe(true);
    expect(report.checks.every((c) => c.ok)).toBe(true);
  });

  it('fails when the API key is missing', async () => {
    const report = await runPreflight(
      deps({ env: { MUSE_ROOT: '/muse', MUSE_PYTHON: '/muse/.venv/bin/python' } }),
    );
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.name === 'deepinfra key')?.ok).toBe(false);
  });

  it('fails when the judge model is absent from the endpoint', async () => {
    const report = await runPreflight(
      deps({
        fetchImpl: (async () =>
          new Response(JSON.stringify({ data: [{ id: 'other' }] }), {
            status: 200,
          })) as unknown as typeof fetch,
      }),
    );
    expect(report.checks.find((c) => c.name === 'judge model')?.ok).toBe(false);
  });

  it('formats one line per check', () => {
    const text = formatPreflight({
      ok: false,
      checks: [
        { name: 'a', ok: true, detail: 'fine' },
        { name: 'b', ok: false, detail: 'broken' },
      ],
    });
    expect(text).toContain('PASS a: fine');
    expect(text).toContain('FAIL b: broken');
  });
});
