// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression: a `file` path that cannot be read must explain BOTH causes —
// the path is missing locally, OR the server is hosted/remote and cannot see
// the caller's filesystem — and point at the `code` param, which works
// everywhere. Raw ENOENT sent agents into an unwinnable path-fixing loop.
//
// There are two independent file-read seams and both are covered here:
//   seam 1: loadMcpScriptSource/runMcpScript (export, query, topology, …)
//   seam 2: evaluate_script → cli/commands/evaluate

import { describe, expect, it } from 'vitest';
import { runMcpScript, loadMcpScriptSource } from '../../../src/agent/mcp/runMcpScript';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { getBendTableTool } from '../../../src/agent/mcp/tools/getBendTable';
import { flattenPatternTool } from '../../../src/agent/mcp/tools/flattenPattern';
import { readScriptOrDiagnostic } from '../../../src/agent/cli/lib/readScript';
import { FILE_READ_HINT } from '../../../src/shared/diagnostics/fileReadError';

const MISSING = '/tmp/kernelcad-definitely-missing-hosted-hint.kcad.ts';

/** Both causes named, plus the inline escape hatch. */
function expectHostedAwareText(text: string): void {
  expect(text).toContain('does not exist locally');
  expect(text).toMatch(/hosted\/remote/);
  expect(text).toContain('`code`');
}

describe('file-read failures name the hosted-server cause', () => {
  it('the shared hint states both possibilities', () => {
    expectHostedAwareText(FILE_READ_HINT);
  });

  it('seam 1: loadMcpScriptSource', async () => {
    const r = await loadMcpScriptSource({ file: MISSING });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected failure');
    expect(r.error).toMatch(/^Cannot read file:/);
    expect(r.errorCode).toBe('cli.file-read');
    expectHostedAwareText(r.error);
  });

  it('seam 1: runMcpScript', async () => {
    const r = await runMcpScript({ file: MISSING });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected failure');
    expect(r.errorCode).toBe('cli.file-read');
    expectHostedAwareText(r.error);
  });

  it('seam 2: evaluate_script', async () => {
    const r = await evaluateScriptTool({ file: MISSING });
    const d = r.diagnostics.find(x => x.code === 'cli.file-read');
    expect(d, `no cli.file-read in [${r.diagnostics.map(x => x.code).join(', ')}]`).toBeDefined();
    expectHostedAwareText(d!.message);
    expectHostedAwareText(d!.hint);
  });

  it('seam 2: evaluate_script dry run', async () => {
    const r = await evaluateScriptTool({ file: MISSING, dryRun: true });
    const d = r.diagnostics.find(x => x.code === 'cli.file-read');
    expect(d).toBeDefined();
    expectHostedAwareText(d!.message);
  });

  it('previously unguarded: get_bend_table returns a diagnostic, not a raw throw', async () => {
    const r = await getBendTableTool({ file: MISSING });
    expect(r.ok).toBe(false);
    const d = r.diagnostics.find(x => x.code === 'cli.file-read');
    expect(d).toBeDefined();
    expectHostedAwareText(d!.message);
  });

  it('previously unguarded: flatten_pattern returns a diagnostic, not a raw throw', async () => {
    const r = await flattenPatternTool({ file: MISSING });
    expect(r.ok).toBe(false);
    const d = r.diagnostics.find(x => x.code === 'cli.file-read');
    expect(d).toBeDefined();
    expectHostedAwareText(d!.message);
  });

  it('CLI readScriptOrDiagnostic carries the same wording', async () => {
    const r = await readScriptOrDiagnostic(MISSING);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected failure');
    expectHostedAwareText(r.diagnostics[0]!.message);
  });
});
