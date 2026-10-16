// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shared runner for the verdict corpus (tests/fixtures/verdictCorpus): one
// model through every verifier an agent would call on it.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { verifyTool } from '../../../src/agent/mcp/tools/verify';

export const CORPUS_DIR = join(__dirname, '../../fixtures/verdictCorpus');

export function corpusFiles(prefix: 'ok-' | 'bad-'): string[] {
  return readdirSync(CORPUS_DIR).filter((f) => f.startsWith(prefix) && f.endsWith('.kcad.ts')).sort();
}

export interface Finding { readonly code: string; readonly message?: string; readonly severity?: string }

export interface CorpusVerdicts {
  readonly assembly: { ok: boolean; blocking?: Finding[]; error?: string };
  readonly mountingHoles: { ok: boolean; mismatches?: Array<{ mateName: string; reason: string }>; error?: string };
  readonly review: {
    ok: boolean;
    blocking: string[];
    diagnostics: Finding[];
    mechanismFailures: Finding[];
  };
}

export async function runCorpusModel(file: string): Promise<CorpusVerdicts> {
  const code = readFileSync(join(CORPUS_DIR, file), 'utf8');
  clearActiveMcpSession();
  const assembly = await verifyTool({ check: 'assembly', code }) as CorpusVerdicts['assembly'];
  const mountingHoles = await verifyTool({ check: 'mounting-holes', code }) as CorpusVerdicts['mountingHoles'];
  const rv = await reviewCadTool({ code });
  return {
    assembly,
    mountingHoles,
    review: {
      ok: rv.ok,
      blocking: (rv.fitness?.blockingReasons ?? []).map((r) => r.code),
      diagnostics: rv.diagnostics as Finding[],
      mechanismFailures: (rv.mechanismFailures ?? []) as Finding[],
    },
  };
}

/** One-line summary for assertion messages. */
export function describeVerdicts(v: CorpusVerdicts): string {
  return JSON.stringify({
    assembly: v.assembly.ok ? 'ok' : v.assembly.error ?? (v.assembly.blocking ?? []).map((b) => b.code),
    mountingHoles: v.mountingHoles.ok ? 'ok' : v.mountingHoles.error ?? v.mountingHoles.mismatches,
    review: v.review.ok ? 'ok' : v.review.blocking,
  });
}
