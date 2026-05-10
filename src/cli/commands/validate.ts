// src/cli/commands/validate.ts
//
// `kernelcad validate <file.kcad.ts>` — runs the MVP assembly validator
// against the script's resulting Scene. Catches floating parts, orphan
// sub-assemblies, and interferences in one pass.
//
// Exit codes:
//   0  — solved (no diagnostics)
//   1  — warnings only (floating / orphan parts)
//   2  — errors (interferences) — also returned on script-execution failures
//
// Pipe-friendly:
//   kernelcad validate so100.kcad.ts && echo "fits"

import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { initOcct } from '../../backends/occt/occtBackend';
import { runScript } from '../../script-runtime/runScript';
import { checkInterference } from '../../script-runtime/checkInterference';
import { validateAssembly, type ValidatorResult } from '../../lib/mates/validator';

export interface ValidateCliInput {
  file: string;
  json: boolean;
  /** Same epsilon as `kernelcad interference`; touching surfaces below
   *  this volume aren't promoted into the diagnostic stream. */
  epsilon: number;
}

export interface ValidateCliResult {
  exitCode: number;
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

  // Cheap path: run interference check (also resolves the SceneBackend +
  // surfaces any kernel diagnostics from the run). validateAssembly then
  // gets both records + interference pairs in one shot.
  const interferenceR = await checkInterference({
    code,
    fileName: input.file,
    scriptDir,
    epsilonMm3: input.epsilon,
  });

  const result = validateAssembly({
    records: run.records,
    interferencePairs: interferenceR.pairs,
  });

  if (input.json) {
    console.log(JSON.stringify({
      ok: result.status === 'solved',
      status: result.status,
      partCount: result.partCount,
      jointCount: result.jointCount,
      diagnostics: result.diagnostics,
      kernelDiagnostics: interferenceR.diagnostics,
    }, null, 2));
  } else {
    renderHuman(result);
  }

  const exit = result.status === 'error' ? 2 : result.status === 'warning' ? 1 : 0;
  return { exitCode: exit };
}

function renderHuman(result: ValidatorResult): void {
  if (result.status === 'solved') {
    console.log(`Assembly validates clean (${result.partCount} parts, ${result.jointCount} joints).`);
    return;
  }
  const errs = result.diagnostics.filter((d) => d.severity === 'error');
  const warns = result.diagnostics.filter((d) => d.severity === 'warning');
  console.log(`Assembly status: ${result.status.toUpperCase()} (${result.partCount} parts, ${result.jointCount} joints; ${errs.length} error${errs.length === 1 ? '' : 's'}, ${warns.length} warning${warns.length === 1 ? '' : 's'})`);
  for (const d of result.diagnostics) {
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
    .option('--epsilon <mm3>', 'interference volume threshold below which an intersection is "touching"', (v) => parseFloat(v), 0.01)
    .option('--json', 'emit results as JSON')
    .action(async (file: string, opts: { epsilon: number; json?: boolean }) => {
      const r = await runValidateCli({
        file,
        epsilon: opts.epsilon,
        json: opts.json ?? false,
      });
      process.exitCode = r.exitCode;
    });
}
