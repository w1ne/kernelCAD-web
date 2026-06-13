// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

const LOCAL_BUILD = './dist/cli/index.js';

function getBin(): { cmd: string; baseArgs: string[] } {
  const override = process.env.KERNELCAD_BIN;
  if (override) {
    if (override.endsWith('.js')) return { cmd: 'node', baseArgs: [override] };
    return { cmd: override, baseArgs: [] };
  }
  if (existsSync(LOCAL_BUILD)) return { cmd: 'node', baseArgs: [LOCAL_BUILD] };
  return { cmd: 'kernelcad', baseArgs: [] };
}

interface EnvelopeDiagnostic {
  code: string;
  severity: string;
  sampleName?: string;
}

interface EnvelopeResult {
  ok: boolean;
  envelopeDiagnostics: EnvelopeDiagnostic[];
  envelopeSampleCount: number;
}

async function evaluateWithEnvelope(scriptPath: string): Promise<EnvelopeResult> {
  const { cmd, baseArgs } = getBin();
  const args = [...baseArgs, 'evaluate', '--envelope', '--samples-per-mate', '3', '--json', scriptPath];
  return await new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('close', () => {
      try {
        const parsed = JSON.parse(stdout);
        resolve({
          ok: !!parsed.ok,
          envelopeDiagnostics: Array.isArray(parsed.envelopeDiagnostics)
            ? (parsed.envelopeDiagnostics as EnvelopeDiagnostic[])
            : [],
          envelopeSampleCount: typeof parsed.envelopeSampleCount === 'number' ? parsed.envelopeSampleCount : 0,
        });
      } catch {
        resolve({
          ok: false,
          envelopeDiagnostics: [
            {
              code: 'cli.envelope-parse-failed',
              severity: 'error',
              sampleName: stderr.trim() || stdout.trim() || '(no output)',
            },
          ],
          envelopeSampleCount: 0,
        });
      }
    });
  });
}

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  // Gate 1: script must evaluate cleanly (mirrors every other corpus task).
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  // Gate 2: pose-envelope review at samplesPerMate=3 must report ZERO
  // interference diagnostics across all sampled poses (min, mid, max).
  const env = await evaluateWithEnvelope(scriptPath);
  const interferenceCount = env.envelopeDiagnostics.filter(
    (d) => d.code === 'assembly.pose-envelope.interference',
  ).length;
  const envelopeClean = env.ok && interferenceCount === 0;

  // Scored signal: the script must actually declare the [0, 95] travel range.
  // A solution that silently narrowed the limits would technically pass the
  // envelope gate but fails the task's intent.
  const src = readFileSync(scriptPath, 'utf8');
  const limitsDeclared = /limitsDeg:\s*\[\s*0\s*,\s*95\s*\]/.test(src);

  return {
    gates: {
      'evaluates clean': true,
      'envelope clean': envelopeClean,
    },
    scored: {
      'declares limitsDeg [0, 95]': limitsDeclared,
    },
  };
}
