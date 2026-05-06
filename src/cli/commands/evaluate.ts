// src/cli/commands/evaluate.ts
import { Command } from 'commander';
import { formatHuman } from '../../diagnostics/formatter';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';
import { buildModel, buildModelFromFile, type BuiltModel } from '../../kernel/buildModel';

export interface EvaluateInput {
  file?: string;
  code?: string;
}

export interface EvaluateResult {
  exitCode: number;
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
}

export interface EvaluateAndBuildResult {
  evaluation: EvaluateResult;
  model?: BuiltModel;
}

export async function evaluateAndBuildScript(input: EvaluateInput): Promise<EvaluateAndBuildResult> {
  if (input.code === undefined && input.file === undefined) {
    return { evaluation: {
      exitCode: 2, featureCount: 0,
      diagnostics: [{
        target: 'export-occt', code: 'cli.invalid-args', severity: 'error',
        message: 'evaluateScript: must provide either { file } or { code }.',
        hint: 'Pass --file <path> on the CLI, or { file } / { code } when calling programmatically.',
      }],
    } };
  }

  let model;
  try {
    model = input.code !== undefined
      ? await buildModel({ code: input.code, fileName: input.file ?? '<inline>' })
      : await buildModelFromFile({ file: input.file! });
  } catch (e) {
    if (isFileReadError(e)) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        evaluation: {
          exitCode: 2, featureCount: 0,
          diagnostics: [{
            target: 'export-occt', code: 'cli.file-read', severity: 'error',
            message: `Cannot read file: ${msg}`,
            hint: 'Check that the file path exists and is readable.',
          }],
        },
      };
    }
    const diag = kernelErrorToDiagnostic(e);
    return {
      evaluation: { exitCode: 1, featureCount: 0, diagnostics: [diag] },
    };
  }
  const fatal = model.diagnostics.some(d => d.severity === 'error');
  return {
    evaluation: {
      exitCode: fatal ? 1 : 0,
      featureCount: model.records.length,
      diagnostics: model.diagnostics,
    },
    model,
  };
}

export async function evaluateScript(input: EvaluateInput): Promise<EvaluateResult> {
  return (await evaluateAndBuildScript(input)).evaluation;
}

function isFileReadError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as { code?: unknown }).code === 'string' &&
    ['ENOENT', 'EACCES', 'EPERM', 'EISDIR', 'ENOTDIR'].includes((e as { code: string }).code)
  );
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
