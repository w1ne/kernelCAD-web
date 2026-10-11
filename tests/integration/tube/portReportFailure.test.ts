// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A fault inside the port report must not take the evaluation down: the
// result keeps its verdict, `ports` is left out and a warning says why.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import { evaluateCommand } from '../../../src/agent/cli/commands/evaluate';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

vi.mock('../../../src/modeling/runtime/tube/portReport', () => ({
  portReportOnModel: () => { throw new Error('injected port report fault'); },
}));

const GOOD = 'tests/fixtures/tube/one-line.kcad.ts';

beforeAll(async () => { await initOcct(); }, 120_000);
afterEach(() => { vi.restoreAllMocks(); process.exitCode = 0; });

describe('a failing port report', () => {
  it('becomes a warning and leaves ports out; the evaluation and the tube report stand', async () => {
    const r = await evaluateAndBuildScript({ file: GOOD });
    expect(r.evaluation.exitCode).toBe(0);
    expect(r.portReport).toBeUndefined();
    expect(r.tubeReport!.lines).toHaveLength(1);
    const warn = r.evaluation.diagnostics.filter((d) => d.severity !== 'info');
    expect(warn).toEqual([expect.objectContaining({ code: 'feature.kernel-failed', severity: 'warn',
      message: 'ports: the port report failed (injected port report fault); `ports` is left out of this result.' })]);
    expect(warn[0].hint.trim().length).toBeGreaterThan(0);
  }, 120_000);

  it('evaluate --json and evaluate_script still return a result', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((s: unknown) => { lines.push(String(s)); });
    await evaluateCommand().parseAsync(['node', 'evaluate', GOOD, '--json']);
    const out = JSON.parse(lines.join('\n'));
    expect(out.ok).toBe(true);
    expect('ports' in out).toBe(false);
    expect(out.tubes.lines).toHaveLength(1);
    const mcp = await evaluateScriptTool({ file: GOOD });
    expect(mcp.ok).toBe(true);
    expect(mcp.ports).toBeUndefined();
    expect(mcp.diagnostics.map((d) => d.code)).toContain('feature.kernel-failed');
  }, 120_000);
});
