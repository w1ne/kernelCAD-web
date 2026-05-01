// src/cli/commands/evaluate.ts
import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runScript } from '../../script-runtime/runScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { OcctLowerer } from '../../backends/occt/occtLowerer';
import { initOcct } from '../../backends/occt/occtBackend';
import { formatHuman } from '../../diagnostics/formatter';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface EvaluateInput {
  file?: string;
  code?: string;
}

export interface EvaluateResult {
  exitCode: number;
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
}

export async function evaluateScript(input: EvaluateInput): Promise<EvaluateResult> {
  await initOcct();

  let code: string;
  let fileName: string;

  if (input.code !== undefined) {
    code = input.code;
    fileName = input.file ?? '<inline>';
  } else if (input.file !== undefined) {
    const filePath = resolve(input.file);
    fileName = filePath;
    try {
      code = await readFile(filePath, 'utf8');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        exitCode: 2, featureCount: 0,
        diagnostics: [{
          target: 'export-occt', code: 'cli.file.read', severity: 'error',
          message: `Cannot read file: ${msg}`,
        }],
      };
    }
  } else {
    return {
      exitCode: 2, featureCount: 0,
      diagnostics: [{
        target: 'export-occt', code: 'cli.no-input', severity: 'error',
        message: 'evaluateScript: must provide either { file } or { code }.',
      }],
    };
  }

  let run;
  try {
    run = await runScript({ code, fileName });
  } catch (e) {
    const diag = kernelErrorToDiagnostic(e);
    return {
      exitCode: 1, featureCount: 0,
      diagnostics: [diag],
    };
  }
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(run.records);
  const fatal = r.diagnostics.filter(d => d.severity === 'error').length > 0;
  return {
    exitCode: fatal ? 1 : 0,
    featureCount: run.records.length,
    diagnostics: r.diagnostics,
  };
}

export function evaluateCommand(): Command {
  const cmd = new Command('evaluate')
    .description('Run a .kcad.ts script and report diagnostics')
    .argument('<file>', 'path to a .kcad.ts script')
    .option('--json', 'emit diagnostics as JSON')
    .action(async (file: string, opts: { json?: boolean }) => {
      const r = await evaluateScript({ file });
      if (opts.json) {
        console.log(JSON.stringify({
          ok: r.exitCode === 0,
          featureCount: r.featureCount,
          diagnostics: r.diagnostics,
        }, null, 2));
      } else {
        console.log(`Features: ${r.featureCount}`);
        if (r.diagnostics.length > 0) {
          console.log(formatHuman(r.diagnostics));
        }
        if (r.exitCode === 0) console.log('OK');
      }
      process.exitCode = r.exitCode;
    });
  return cmd;
}
