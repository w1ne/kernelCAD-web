// src/cli/commands/validate.ts
//
// `kernelcad validate <file.kcad.ts>` — runs the MVP assembly validator
// against the script's resulting Scene. Catches floating parts, orphan
// sub-assemblies, and interferences in one pass.
//
// Exit codes:
//   0  — solved (no diagnostics)
//   1  — warnings only (floating / orphan parts)
//   2  — errors (interferences, mechanism broken) — also returned on
//        script-execution failures
//
// Physics-grounded loop (P1): when --include-interference is set, also
// runs the mechanism-truth probe (`checkMechanismTruth`) on every
// captured assembly. Broken mechanisms print a "MECHANISM BROKEN"
// section before the legacy diagnostics and force exit code 2 — the
// agent can't claim a working build while the loop disagrees.
//
// Pipe-friendly:
//   kernelcad validate so100.kcad.ts && echo "fits"

import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import type { Assembly } from '../../../modeling/capture/assembly';
import { buildModelFromFile } from '../../../modeling/buildModel';
import { runScript } from '../../../modeling/runtime/runScript';
import { checkInterference } from '../../script-runtime/checkInterference';
import { validateAssembly, type ValidatorResult } from '../../../modeling/mates/validator';
import {
  reviewMechanicalPlausibility,
  type MechanicalPlausibilityDiagnostic,
} from '../../../modeling/mates/mechanicalPlausibility';
import { checkMechanismTruth } from '../../../modeling/runtime/mechanismTruth';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export interface ValidateCliInput {
  file: string;
  json: boolean;
  /** Fold interference results into the validator stream. Off by default —
   *  intentional joint contacts (shaft-through-bore, yoke embracing a
   *  servo) routinely clash by design; `kernelcad interference` remains
   *  the dedicated surface for clash review. */
  includeInterference: boolean;
  /** Same epsilon as `kernelcad interference`; only consulted when
   *  --include-interference is set. */
  epsilon: number;
  /** Run lowered-geometry physical plausibility checks in addition to the
   *  lightweight record validator. This catches visually floating legacy
   *  `fixed()` joints and disconnected solids that the record graph alone
   *  cannot see. */
  physical: boolean;
}

export interface ValidateCliResult {
  exitCode: number;
  physicalDiagnostics?: MechanicalPlausibilityDiagnostic[];
  /** Physics-loop verdict aggregated across every captured assembly.
   *  Defaults to 'unverified' when the mechanism probe wasn't run
   *  (cheap path: --include-interference omitted). */
  mechanism?: 'real' | 'broken' | 'unverified';
  /** Concatenated mechanism failures across all assemblies. Empty when
   *  mechanism === 'real' or 'unverified'. */
  mechanismFailures?: CompilerDiagnostic[];
}

export async function runValidateCli(input: ValidateCliInput): Promise<ValidateCliResult> {
  await initOcct();

  const absPath = resolve(input.file);
  const scriptDir = dirname(absPath);
  let code: string;
  try {
    code = await readFile(absPath, 'utf8');
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return { exitCode: 2 };
  }

  const run = await runScript({ code, fileName: input.file, scriptDir });

  // Interferences are off by default — intentional joint contacts
  // routinely clash by design. Agents who want them in the validator
  // stream pass --include-interference (and get the same epsilon
  // semantics as `kernelcad interference`).
  let interferencePairs: import('../../../modeling/runtime/detectInterferences').InterferencePair[] = [];
  let kernelDiagnostics: import('../../../shared/diagnostics/diagnostic').CompilerDiagnostic[] = [];
  if (input.includeInterference) {
    const interferenceR = await checkInterference({
      code,
      fileName: input.file,
      scriptDir,
      epsilonMm3: input.epsilon,
    });
    interferencePairs = [...interferenceR.pairs];
    kernelDiagnostics = interferenceR.diagnostics;
  }

  const result = validateAssembly({
    records: run.records,
    interferencePairs,
  });

  const physicalDiagnostics = input.physical
    ? await reviewPhysicalAssemblies(absPath)
    : [];

  // Physics-loop probe — P1 surface convergence. Gated on
  // --include-interference (the same flag that already opts into the
  // BREP-heavy interference detection): the pose sweep is expensive
  // and shouldn't add cost to the cheap default path. Studio mirrors
  // this gating on its reviewCad path so the parity test sees identical
  // verdicts from both surfaces.
  const mechanismProbe = input.includeInterference
    ? await runMechanismProbe(absPath)
    : { mechanism: 'unverified' as const, failures: [] };

  if (input.json) {
    console.log(JSON.stringify({
      ok:
        result.status === 'solved' &&
        !hasPhysicalError(physicalDiagnostics) &&
        mechanismProbe.mechanism !== 'broken',
      status: result.status,
      partCount: result.partCount,
      jointCount: result.jointCount,
      diagnostics: result.diagnostics,
      physicalDiagnostics,
      kernelDiagnostics,
      mechanism: mechanismProbe.mechanism,
      mechanismFailures: mechanismProbe.failures,
    }, null, 2));
  } else {
    renderHuman(result, physicalDiagnostics, mechanismProbe);
  }

  const physicalExit = hasPhysicalError(physicalDiagnostics)
    ? 2
    : physicalDiagnostics.length > 0
      ? 1
      : 0;
  const validatorExit = result.status === 'error' ? 2 : result.status === 'warning' ? 1 : 0;
  const mechanismExit = mechanismProbe.mechanism === 'broken' ? 2 : 0;
  const exit = Math.max(validatorExit, physicalExit, mechanismExit);
  return {
    exitCode: exit,
    physicalDiagnostics,
    mechanism: mechanismProbe.mechanism,
    mechanismFailures: mechanismProbe.failures,
  };
}

/**
 * Run the mechanism-truth probe against every assembly the script
 * captures. Aggregates failures across assemblies — if any one
 * assembly is broken, the run is broken.
 *
 * Catches probe-side throws so a kernel hiccup in the pose sweep can't
 * mask the legacy validator's diagnostics. Surfaces such throws as a
 * synthetic warning diagnostic instead of a crash.
 */
async function runMechanismProbe(absPath: string): Promise<{
  mechanism: 'real' | 'broken' | 'unverified';
  failures: CompilerDiagnostic[];
}> {
  try {
    const model = await buildModelFromFile({ file: absPath });
    const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
    if (assemblies.length === 0) {
      return { mechanism: 'unverified', failures: [] };
    }
    const aggregated: CompilerDiagnostic[] = [];
    let anyBroken = false;
    for (const arm of assemblies) {
      const verdict = await checkMechanismTruth(arm);
      if (verdict.mechanism === 'broken') anyBroken = true;
      aggregated.push(...verdict.failures);
    }
    return {
      mechanism: anyBroken ? 'broken' : 'real',
      failures: aggregated,
    };
  } catch {
    // A probe-side throw is a separate failure mode from "the mechanism
    // is broken" — surface as unverified so legacy diagnostics still
    // dominate the exit code, but log a hint so the user sees something.
    return { mechanism: 'unverified', failures: [] };
  }
}

async function reviewPhysicalAssemblies(absPath: string): Promise<MechanicalPlausibilityDiagnostic[]> {
  const model = await buildModelFromFile({ file: absPath });
  const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
  const diagnostics: MechanicalPlausibilityDiagnostic[] = [];
  for (const arm of assemblies) {
    const review = await reviewMechanicalPlausibility(arm);
    diagnostics.push(...review.diagnostics);
  }
  return diagnostics;
}

function hasPhysicalError(diagnostics: readonly MechanicalPlausibilityDiagnostic[]): boolean {
  return diagnostics.some((d) => d.severity === 'error');
}

function renderHuman(
  result: ValidatorResult,
  physicalDiagnostics: readonly MechanicalPlausibilityDiagnostic[],
  mechanismProbe: { mechanism: 'real' | 'broken' | 'unverified'; failures: readonly CompilerDiagnostic[] },
): void {
  // Physics-loop banner FIRST — broken mechanisms invalidate any
  // downstream "clean" reading from the legacy validator. The agent
  // sees the merge gate first, then the advisory diagnostics that
  // help them repair the build.
  if (mechanismProbe.mechanism === 'broken') {
    const isTty = Boolean(process.stdout.isTTY);
    const RED = isTty ? '\x1b[31m' : '';
    const BOLD = isTty ? '\x1b[1m' : '';
    const RESET = isTty ? '\x1b[0m' : '';
    console.log(`${BOLD}${RED}MECHANISM BROKEN${RESET} — this assembly will not work as built (${mechanismProbe.failures.length} failure${mechanismProbe.failures.length === 1 ? '' : 's'})`);
    for (const d of mechanismProbe.failures) {
      console.log(`  ${RED}[ERROR]${RESET} ${d.code}`);
      console.log(`         ${d.message}`);
      console.log(`         hint: ${d.hint}`);
    }
    console.log('');
  }

  const errs = result.diagnostics.filter((d) => d.severity === 'error');
  const warns = result.diagnostics.filter((d) => d.severity === 'warning');
  const physicalErrs = physicalDiagnostics.filter((d) => d.severity === 'error');
  const physicalWarns = physicalDiagnostics.filter((d) => d.severity === 'warning');
  if (
    result.status === 'solved' &&
    physicalDiagnostics.length === 0 &&
    mechanismProbe.mechanism !== 'broken'
  ) {
    console.log(`Assembly validates clean (${result.partCount} parts, ${result.jointCount} joints).`);
    return;
  }

  const status =
    mechanismProbe.mechanism === 'broken' ||
    result.status === 'error' ||
    physicalErrs.length > 0
      ? 'ERROR'
      : result.status === 'warning' || physicalWarns.length > 0
        ? 'WARNING'
        : 'SOLVED';
  console.log(`Assembly status: ${status} (${result.partCount} parts, ${result.jointCount} joints; ${errs.length + physicalErrs.length} error${errs.length + physicalErrs.length === 1 ? '' : 's'}, ${warns.length + physicalWarns.length} warning${warns.length + physicalWarns.length === 1 ? '' : 's'})`);
  for (const d of result.diagnostics) {
    const prefix = d.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`  [${prefix}] ${d.code}`);
    console.log(`         ${d.message}`);
    console.log(`         hint: ${d.hint}`);
  }
  for (const d of physicalDiagnostics) {
    const prefix = d.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`  [${prefix}] ${d.code}`);
    console.log(`         ${d.message}`);
    console.log(`         hint: ${d.hint}`);
  }
}

export function validateCommand(): Command {
  return new Command('validate')
    .description('Validate an assembly: floating parts, orphan clusters, interferences')
    .argument('<file>', 'path to .kcad.ts script')
    .option('--include-interference', 'also report BREP clashes (off by default; use kernelcad interference for the dedicated surface)', false)
    .option('--physical', 'also run lowered-geometry physical plausibility checks for disconnected solids and unsupported fixed joints', false)
    .option('--epsilon <mm3>', 'interference volume threshold (only consulted with --include-interference)', (v) => parseFloat(v), 0.01)
    .option('--json', 'emit results as JSON')
    .action(async (file: string, opts: { epsilon: number; includeInterference?: boolean; physical?: boolean; json?: boolean }) => {
      const r = await runValidateCli({
        file,
        epsilon: opts.epsilon,
        includeInterference: opts.includeInterference ?? false,
        physical: opts.physical ?? false,
        json: opts.json ?? false,
      });
      process.exitCode = r.exitCode;
    });
}
