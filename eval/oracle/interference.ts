// eval/oracle/interference.ts
//
// Wraps `kernelcad interference --json <script>` for use by per-task harnesses.
// Returns a structured result with the pair list + diagnostics, plus a
// convenience `noSceneToCheck` flag so harnesses can decide whether to gate
// on this (a Shape-returning script returns "No assembly Scene to check"
// rather than a failure — only Scene/assembly scripts get a real check).

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const LOCAL_BUILD = './dist/cli/index.js';

export interface InterferenceResult {
  ok: boolean;
  noSceneToCheck: boolean;
  partCount: number;
  comparisonCount: number;
  epsilonMm3: number;
  pairs: Array<{ partA: string; partB: string; volumeMm3: number }>;
  diagnostics: Array<{ code: string; message: string; hint?: string }>;
}

function getBin(): { cmd: string; baseArgs: string[] } {
  const override = process.env.KERNELCAD_BIN;
  if (override) {
    if (override.endsWith('.js')) return { cmd: 'node', baseArgs: [override] };
    return { cmd: override, baseArgs: [] };
  }
  if (existsSync(LOCAL_BUILD)) return { cmd: 'node', baseArgs: [LOCAL_BUILD] };
  return { cmd: 'kernelcad', baseArgs: [] };
}

async function runOnce(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const { cmd, baseArgs } = getBin();
  return await new Promise((resolve, reject) => {
    const child = spawn(cmd, [...baseArgs, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

export async function runInterference(scriptPath: string, epsilonMm3 = 0.01): Promise<InterferenceResult> {
  const r = await runOnce(['interference', '--json', '--epsilon', String(epsilonMm3), scriptPath]);
  // The CLI emits the "No assembly Scene to check" sentence as plain text on
  // stdout when the script returns a Shape. Treat that as a non-error
  // "nothing to gate on" outcome.
  const trimmed = r.stdout.trim();
  if (trimmed.startsWith('No assembly Scene')) {
    return {
      ok: true,
      noSceneToCheck: true,
      partCount: 0,
      comparisonCount: 0,
      epsilonMm3,
      pairs: [],
      diagnostics: [],
    };
  }
  try {
    const parsed = JSON.parse(trimmed);
    return {
      ok: parsed.ok === true,
      noSceneToCheck: false,
      partCount: parsed.partCount ?? 0,
      comparisonCount: parsed.comparisonCount ?? 0,
      epsilonMm3: parsed.epsilonMm3 ?? epsilonMm3,
      // The CLI emits pairs as { a, b, volumeMm3 }; normalise to the declared
      // { partA, partB, volumeMm3 } shape so consumers get stable field names.
      pairs: Array.isArray(parsed.pairs)
        ? parsed.pairs.map((p: { a?: string; b?: string; partA?: string; partB?: string; volumeMm3?: number }) => ({
            partA: p.partA ?? p.a ?? 'partA',
            partB: p.partB ?? p.b ?? 'partB',
            volumeMm3: p.volumeMm3 ?? 0,
          }))
        : [],
      diagnostics: Array.isArray(parsed.diagnostics) ? parsed.diagnostics : [],
    };
  } catch {
    return {
      ok: false,
      noSceneToCheck: false,
      partCount: 0,
      comparisonCount: 0,
      epsilonMm3,
      pairs: [],
      diagnostics: [
        {
          code: 'cli.interference-exception',
          message: `kernelcad interference exited ${r.code}: ${r.stderr.trim() || r.stdout.trim() || '(no output)'}`,
        },
      ],
    };
  }
}
