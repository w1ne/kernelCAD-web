// src/cli/commands/evaluate.ts
import { Command } from 'commander';
import { formatHuman } from '../../shared/diagnostics/formatter';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../shared/diagnostics/diagnostic';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';
import { buildModel, buildModelFromFile, type BuiltModel } from '../../kernel/buildModel';
import type { Assembly } from '../../shared/capture/assembly';
import {
  reviewPoseEnvelope,
  type PoseEnvelopeDiagnostic,
} from '../../lib/mates/poseEnvelope';

export interface EvaluateInput {
  file?: string;
  code?: string;
}

/**
 * Apply `kernelcad evaluate`-specific environment defaults before the
 * user script is loaded. Currently flips `Assembly.solvedModel`'s validate
 * gate default to `'error'` (T9 reads `process.env.KERNELCAD_VALIDATE_DEFAULT`)
 * so harness runs trip on invalid assemblies rather than silently emitting
 * warnings.
 *
 * Idempotent: a caller-supplied `KERNELCAD_VALIDATE_DEFAULT` (including
 * `warn` / `off`) is preserved so users can still opt out with
 * `KERNELCAD_VALIDATE_DEFAULT=warn npx kernelcad evaluate ...`.
 *
 * Per spec 2026-05-11-assembly-mates-validator-design.md §"Validity gate"
 * (T10 of the v0.6 assembly mates plan).
 */
export function applyEvaluateDefaults(): void {
  if (process.env.KERNELCAD_VALIDATE_DEFAULT === undefined) {
    process.env.KERNELCAD_VALIDATE_DEFAULT = 'error';
  }
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
  // T10: harness-style evaluation flips the `solvedModel` validate gate to
  // `'error'` (read by T9 in `Assembly.solvedModel`). Done before script
  // load so the env var is visible to anything user-script transitively
  // touches. Does not override a caller-supplied value.
  applyEvaluateDefaults();

  if (input.code === undefined && input.file === undefined) {
    return { evaluation: {
      exitCode: 2, featureCount: 0,
      diagnostics: withNextActions([{
        target: 'export-occt', code: 'cli.invalid-args', severity: 'error',
        message: 'evaluateScript: must provide either { file } or { code }.',
        hint: 'Pass --file <path> on the CLI, or { file } / { code } when calling programmatically.',
      }]),
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
          diagnostics: withNextActions([{
            target: 'export-occt', code: 'cli.file-read', severity: 'error',
            message: `Cannot read file: ${msg}`,
            hint: 'Check that the file path exists and is readable.',
          }]),
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
      diagnostics: withNextActions(model.diagnostics),
    },
    model,
  };
}

export async function evaluateScript(input: EvaluateInput): Promise<EvaluateResult> {
  return (await evaluateAndBuildScript(input)).evaluation;
}

export interface EvaluateWithEnvelopeInput extends EvaluateInput {
  /** When true, run `reviewPoseEnvelope` on every captured assembly after
   *  the script settles. Any envelope `severity: 'error'` diagnostic causes
   *  exit code 2. When false (the default), behavior matches plain
   *  `evaluateScript` — capture-time validity gate only. */
  envelope?: boolean;
  /** Forwarded to `reviewPoseEnvelope` when `envelope` is true. Integer ≥ 1.
   *  Specifying without `envelope: true` is a misuse — sets `exitCode: 1`
   *  and populates `misuseMessage`. */
  samplesPerMate?: number;
  /** Forwarded to `reviewPoseEnvelope` when `envelope` is true. Specifying
   *  without `envelope: true` is a misuse — sets `exitCode: 1` and
   *  populates `misuseMessage`. */
  combinatorial?: boolean;
}

export interface EvaluateWithEnvelopeResult {
  /** 0: clean evaluation (script ran AND envelope clean if --envelope set)
   *  1: script-execution failure OR misuse of flags
   *  2: envelope-error diagnostics surfaced (only possible when --envelope) */
  exitCode: number;
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
  /** All envelope diagnostics (across every captured assembly) when
   *  `envelope: true`. Undefined when envelope review didn't run. */
  envelopeDiagnostics?: PoseEnvelopeDiagnostic[];
  /** Total pose-envelope sample count across every captured assembly.
   *  Undefined when envelope review didn't run. */
  envelopeSampleCount?: number;
  /** Set when the caller passed an envelope sampling flag without
   *  `envelope: true`. Triggers `exitCode: 1`. */
  misuseMessage?: string;
}

/**
 * Implements `kernelcad evaluate --envelope [--samples-per-mate N]
 * [--combinatorial]`. After the script runs, captured assemblies are pulled
 * off the session and `reviewPoseEnvelope` runs on each. Any envelope
 * `severity: 'error'` diagnostic produces exit code 2.
 *
 * If sampling flags are supplied without `--envelope`, the call is rejected
 * with `exitCode: 1` and a `misuseMessage` — sampling has no effect without
 * the gate.
 *
 * Per Task 7 of the pose-envelope review-loop closure plan.
 */
export async function evaluateWithEnvelope(
  input: EvaluateWithEnvelopeInput,
): Promise<EvaluateWithEnvelopeResult> {
  // Misuse check first — agent supplies sampling flags without enabling the
  // gate. Fail fast and tell the user how to enable it. No script run.
  if (!input.envelope) {
    if (input.samplesPerMate !== undefined) {
      return {
        exitCode: 1,
        featureCount: 0,
        diagnostics: [],
        misuseMessage:
          '--samples-per-mate has no effect without --envelope. Pass --envelope to run the pose-envelope gate.',
      };
    }
    if (input.combinatorial) {
      return {
        exitCode: 1,
        featureCount: 0,
        diagnostics: [],
        misuseMessage:
          '--combinatorial has no effect without --envelope. Pass --envelope to run the pose-envelope gate.',
      };
    }
  }

  if (input.samplesPerMate !== undefined && (!Number.isInteger(input.samplesPerMate) || input.samplesPerMate < 1)) {
    return {
      exitCode: 1,
      featureCount: 0,
      diagnostics: [],
      misuseMessage:
        `--samples-per-mate must be an integer ≥ 1; got ${input.samplesPerMate}.`,
    };
  }

  const built = await evaluateAndBuildScript({ file: input.file, code: input.code });
  const { evaluation, model } = built;

  if (!input.envelope) {
    return {
      exitCode: evaluation.exitCode,
      featureCount: evaluation.featureCount,
      diagnostics: evaluation.diagnostics,
    };
  }

  if (evaluation.exitCode !== 0) {
    // Don't run envelope on a broken script — surface the underlying failure.
    return {
      exitCode: evaluation.exitCode,
      featureCount: evaluation.featureCount,
      diagnostics: evaluation.diagnostics,
      envelopeDiagnostics: [],
      envelopeSampleCount: 0,
    };
  }

  if (!model) {
    // Shouldn't happen for exitCode 0, but be defensive.
    return {
      exitCode: evaluation.exitCode,
      featureCount: evaluation.featureCount,
      diagnostics: evaluation.diagnostics,
      envelopeDiagnostics: [],
      envelopeSampleCount: 0,
    };
  }

  const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
  if (assemblies.length === 0) {
    return {
      exitCode: 0,
      featureCount: evaluation.featureCount,
      diagnostics: evaluation.diagnostics,
      envelopeDiagnostics: [],
      envelopeSampleCount: 0,
    };
  }

  const reviewOpts: { samplesPerMate?: number; combinatorial?: boolean; includeInterference: true } = {
    includeInterference: true,
  };
  if (input.samplesPerMate !== undefined) reviewOpts.samplesPerMate = input.samplesPerMate;
  if (input.combinatorial) reviewOpts.combinatorial = true;

  const envelopeDiagnostics: PoseEnvelopeDiagnostic[] = [];
  let envelopeSampleCount = 0;
  for (const arm of assemblies) {
    const review = await reviewPoseEnvelope(arm, reviewOpts);
    envelopeDiagnostics.push(...review.diagnostics);
    envelopeSampleCount += review.samples.length;
  }

  const hasError = envelopeDiagnostics.some((d) => d.severity === 'error');
  return {
    exitCode: hasError ? 2 : 0,
    featureCount: evaluation.featureCount,
    diagnostics: evaluation.diagnostics,
    envelopeDiagnostics,
    envelopeSampleCount,
  };
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
    .option('--envelope', 'after the script runs, run reviewPoseEnvelope on every captured assembly; non-zero exit on envelope-error')
    .option('--samples-per-mate <n>', 'interior samples per mate for the envelope sweep (integer ≥ 1)', (v) => parseInt(v, 10))
    .option('--combinatorial', 'enumerate corner combinations across all limited mates (cap: 8 mates)')
    .action(async (file: string, opts: { json?: boolean; envelope?: boolean; samplesPerMate?: number; combinatorial?: boolean }) => {
      const r = await evaluateWithEnvelope({
        file,
        ...(opts.envelope ? { envelope: true } : {}),
        ...(opts.samplesPerMate !== undefined ? { samplesPerMate: opts.samplesPerMate } : {}),
        ...(opts.combinatorial ? { combinatorial: true } : {}),
      });

      if (r.misuseMessage) {
        console.error(r.misuseMessage);
        process.exitCode = r.exitCode;
        return;
      }

      const envelopeErrors = (r.envelopeDiagnostics ?? []).filter((d) => d.severity === 'error');

      if (opts.json) {
        console.log(JSON.stringify({
          ok: r.exitCode === 0,
          featureCount: r.featureCount,
          diagnostics: r.diagnostics,
          ...(r.envelopeDiagnostics !== undefined ? {
            envelopeDiagnostics: r.envelopeDiagnostics,
            envelopeSampleCount: r.envelopeSampleCount,
          } : {}),
        }, null, 2));
      } else {
        console.log(`Features: ${r.featureCount}`);
        if (r.diagnostics.length > 0) {
          console.log(formatHuman(r.diagnostics));
        }
        if (envelopeErrors.length > 0) {
          console.error(formatEnvelopeDiagnostics(envelopeErrors));
        } else if (r.envelopeDiagnostics !== undefined) {
          console.log(`Pose-envelope: ${r.envelopeSampleCount} sample${r.envelopeSampleCount === 1 ? '' : 's'} clean.`);
        }
        if (r.exitCode === 0) console.log('OK');
      }
      process.exitCode = r.exitCode;
    });
  return cmd;
}

function formatEnvelopeDiagnostics(diags: readonly PoseEnvelopeDiagnostic[]): string {
  return diags.map((d) => {
    const where = d.sampleName ? `sample '${d.sampleName}'` : '<envelope>';
    return `${d.severity.toUpperCase()} [${d.code}] ${where}: ${d.message}\n  Hint: ${d.hint}`;
  }).join('\n');
}
