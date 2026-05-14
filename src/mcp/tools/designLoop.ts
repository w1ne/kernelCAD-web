import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import type { GripperApertureRequest } from '../../lib/mates/gripperAperture';
import type { MechanismFitnessResult } from '../../lib/mates/mechanismFitness';
import { reviewCadTool, type ReviewCadInput, type ReviewCadOutput } from './reviewCad';

export interface DesignLoopAttemptInput {
  id?: string;
  title?: string;
  file?: string;
  code?: string;
  visualReview?: DesignLoopVisualReview;
}

export interface DesignLoopVisualReview {
  accepted: boolean;
  screenshotPath?: string;
  findings: string[];
}

export interface DesignLoopInput {
  goal: string;
  attempts: DesignLoopAttemptInput[];
  assembly?: string;
  preserveInterfaces?: string[];
  includePoseEnvelope?: boolean;
  includeInterference?: boolean;
  epsilonMm3?: number;
  trackConnectors?: string[];
  gripperAperture?: GripperApertureRequest;
  stopOnPass?: boolean;
  allowReviewWarnings?: string[];
  requireVisualReview?: boolean;
  outputRecordPath?: string;
  recordTitle?: string;
}

export interface DesignLoopAttemptResult {
  id: string;
  title: string;
  ok: boolean;
  functional: boolean;
  qualityOk: boolean;
  script?: string;
  featureCount: number;
  diagnosticCount: number;
  reviewFacts: Array<{ code: string; severity: string; message: string; hint?: string }>;
  visualReview?: DesignLoopVisualReview;
  repairMode?: MechanismFitnessResult['repairMode'];
  passedChecks: string[];
  blockingReasons: string[];
  mechanismSummary?: MechanismFitnessResult['mechanismSummary'];
  nextActionPrompt: string;
}

export interface DesignLoopOutput {
  ok: boolean;
  goal: string;
  finalAttemptId?: string;
  attempts: DesignLoopAttemptResult[];
  record?: BuildRecord;
  outputRecordPath?: string;
  recordUrl?: string;
  nextActionPrompt?: string;
}

interface BuildRecordStep {
  id: string;
  title: string;
  status: 'failed' | 'passed';
  script: string;
  review: {
    ok: boolean;
    functional: boolean;
    qualityOk: boolean;
    summary: string;
    blockingReasons: string[];
    reviewFacts: string[];
  };
}

interface BuildRecord {
  title: string;
  goal: string;
  steps: BuildRecordStep[];
}

export async function designLoopTool(input: DesignLoopInput): Promise<DesignLoopOutput> {
  if (!input.goal.trim()) {
    throw new Error('design_loop requires a non-empty goal.');
  }
  if (!Array.isArray(input.attempts) || input.attempts.length === 0) {
    throw new Error('design_loop requires at least one attempt.');
  }

  const stopOnPass = input.stopOnPass ?? true;
  const attempts: DesignLoopAttemptResult[] = [];

  for (const [index, attempt] of input.attempts.entries()) {
    if (!attempt.file && !attempt.code) {
      throw new Error(`design_loop attempt ${index + 1} requires file or code.`);
    }

    const id = attempt.id ?? String(index + 1).padStart(2, '0');
    const title = attempt.title ?? `Attempt ${id}`;
    const reviewInput: ReviewCadInput = {
      ...(attempt.file !== undefined ? { file: attempt.file } : {}),
      ...(attempt.code !== undefined ? { code: attempt.code } : {}),
      assembly: input.assembly,
      designGoal: input.goal,
      preserveInterfaces: input.preserveInterfaces,
      includePoseEnvelope: input.includePoseEnvelope,
      includeInterference: input.includeInterference,
      epsilonMm3: input.epsilonMm3,
      trackConnectors: input.trackConnectors,
      gripperAperture: input.gripperAperture,
    };
    const review = await reviewCadTool(reviewInput);
    const source = attempt.code ?? (attempt.file !== undefined ? await readFile(attempt.file, 'utf-8') : '');
    const attemptResult = toAttemptResult({
      id,
      title,
      script: attempt.file,
      review,
      allowReviewWarnings: input.allowReviewWarnings ?? [],
      requireVisualReview: input.requireVisualReview ?? true,
      visualReview: attempt.visualReview,
      source,
    });
    attempts.push(attemptResult);

    if (attemptResult.ok && stopOnPass) break;
  }

  const finalPass = attempts.find((attempt) => attempt.ok);
  const record = buildRecord(input, attempts);
  const outputRecordPath = input.outputRecordPath !== undefined
    ? resolve(input.outputRecordPath)
    : undefined;
  if (outputRecordPath !== undefined) {
    await mkdir(dirname(outputRecordPath), { recursive: true });
    await writeFile(outputRecordPath, `${JSON.stringify(record, null, 2)}\n`, 'utf-8');
  }

  return {
    ok: finalPass !== undefined,
    goal: input.goal,
    finalAttemptId: finalPass?.id,
    attempts,
    record,
    outputRecordPath,
    ...(outputRecordPath !== undefined ? { recordUrl: publicRecordUrl(outputRecordPath) } : {}),
    nextActionPrompt: finalPass === undefined ? attempts.at(-1)?.nextActionPrompt : undefined,
  };
}

function toAttemptResult(input: {
  id: string;
  title: string;
  script?: string;
  review: ReviewCadOutput;
  allowReviewWarnings: readonly string[];
  requireVisualReview: boolean;
  visualReview?: DesignLoopVisualReview;
  source: string;
}): DesignLoopAttemptResult {
  const fitness = input.review.fitness;
  const blockingReasons = fitness?.blockingReasons.map((reason) => reason.message) ?? [];
  const reviewFacts = [
    ...input.review.diagnostics
    .filter((diagnostic) => diagnostic.severity !== 'error')
    .filter((diagnostic) => !input.allowReviewWarnings.includes(diagnostic.code))
    .map((diagnostic) => ({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
      hint: diagnostic.hint,
    })),
    ...scriptQualityFacts(input.source, input.allowReviewWarnings),
    ...visualReviewFacts(input.requireVisualReview, input.visualReview, input.allowReviewWarnings),
  ];
  const functional = input.review.ok;
  const qualityOk = reviewFacts.length === 0;
  const ok = functional && qualityOk;
  return {
    id: input.id,
    title: input.title,
    ok,
    functional,
    qualityOk,
    script: input.script,
    featureCount: input.review.featureCount,
    diagnosticCount: input.review.diagnostics.length,
    reviewFacts,
    ...(input.visualReview !== undefined ? { visualReview: input.visualReview } : {}),
    repairMode: fitness?.repairMode,
    passedChecks: fitness !== undefined ? [...fitness.passedChecks] : [],
    blockingReasons,
    mechanismSummary: fitness?.mechanismSummary,
    nextActionPrompt: functional && !qualityOk
      ? buildQualityRepairPrompt(reviewFacts)
      : input.review.ok
      ? fitness?.repairDirective ?? 'No repair needed. Preserve the current design and rerun review_cad after changes.'
      : input.review.suggestedRepairPrompt,
  };
}

function scriptQualityFacts(
  source: string,
  allowReviewWarnings: readonly string[],
): Array<{ code: string; severity: string; message: string; hint?: string }> {
  const code = 'assembly.quality.box-fragment-clutter';
  if (allowReviewWarnings.includes(code)) return [];

  const boxCount = countPattern(source, /\bbox\s*\(/g);
  const boxUnionCount = countPattern(source, /\.union\s*\(\s*box\s*\(/g);
  const cylinderCount = countPattern(source, /\bcylinder\s*\(/g);
  if (boxUnionCount < 6) return [];
  if (boxCount < cylinderCount * 2) return [];

  return [{
    code,
    severity: 'warning',
    message: `Script uses ${boxCount} box primitives and ${boxUnionCount} box unions; this often produces visually arbitrary cuboid fragments instead of an explainable mechanical load path.`,
    hint: 'quality.box-fragment-clutter — replace decorative cuboids with continuous brackets, cylinders/shafts/bearing washers, or fewer purpose-named bodies. Each visible sub-shape should have an obvious role in the mechanism.',
  }];
}

function visualReviewFacts(
  requireVisualReview: boolean,
  visualReview: DesignLoopVisualReview | undefined,
  allowReviewWarnings: readonly string[],
): Array<{ code: string; severity: string; message: string; hint?: string }> {
  const missingCode = 'assembly.visual.review-required';
  const rejectedCode = 'assembly.visual.review-rejected';
  const incompleteCode = 'assembly.visual.review-incomplete';
  if (
    allowReviewWarnings.includes(missingCode)
    || allowReviewWarnings.includes(rejectedCode)
    || allowReviewWarnings.includes(incompleteCode)
  ) return [];
  if (!requireVisualReview) return [];
  if (visualReview === undefined) {
    return [{
      code: missingCode,
      severity: 'warning',
      message: 'This design-loop run requires screenshot review, but the attempt has no visualReview result.',
      hint: 'visual-review.required — render screenshots from Studio/demo-player, inspect whether the model visually matches the requested physical mechanism, then attach visualReview with screenshotPath, findings, and accepted.',
    }];
  }
  if (visualReview.accepted) {
    const missing: string[] = [];
    if (visualReview.screenshotPath === undefined || visualReview.screenshotPath.trim() === '') {
      missing.push('screenshotPath');
    }
    if (visualReview.findings.length === 0 || visualReview.findings.every((finding) => finding.trim() === '')) {
      missing.push('findings');
    }
    if (missing.length === 0) return [];
    return [{
      code: incompleteCode,
      severity: 'warning',
      message: `Accepted screenshot review is incomplete; missing ${missing.join(' and ')}.`,
      hint: 'visual-review.incomplete — as the vision-capable agent, render or open a screenshot, inspect it for floating parts, unsupported joints, disconnected drive paths, arbitrary fragments, occluded code/model mismatch, and then record screenshotPath plus concrete findings before accepting.',
    }];
  }
  return [{
    code: rejectedCode,
    severity: 'warning',
    message: `Screenshot review rejected this attempt: ${visualReview.findings.join(' ')}`,
    hint: 'visual-review.rejected — redesign from the prompt or a mechanism primitive, render screenshots again, and only set accepted when the model is visually/mechanically legible.',
  }];
}

function countPattern(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

function buildQualityRepairPrompt(reviewFacts: readonly DesignLoopAttemptResult['reviewFacts'][number][]): string {
  const facts = reviewFacts.slice(0, 8).map((fact) =>
    `- ${fact.code}: ${fact.message}${fact.hint ? ` Hint: ${fact.hint}` : ''}`,
  ).join('\n');
  const visual = reviewFacts.some((fact) => fact.code.startsWith('assembly.visual.'))
    ? '\nRender screenshots, inspect them as the vision-capable agent, and attach visualReview.screenshotPath plus concrete findings before accepting the attempt.'
    : '';
  return `Functional CAD is not enough. The model still has unresolved review facts that an agent must explain or repair before accepting it as a physical object.\n${facts}\nEither redesign the geometry so these facts disappear, or explicitly justify and allow the warning code only when the disconnected/extra geometry has a real physical role.${visual}`;
}

function buildRecord(input: DesignLoopInput, attempts: readonly DesignLoopAttemptResult[]): BuildRecord {
  return {
    title: input.recordTitle ?? 'kernelCAD design loop',
    goal: input.goal,
    steps: attempts
      .filter((attempt): attempt is DesignLoopAttemptResult & { script: string } => attempt.script !== undefined)
      .map((attempt) => ({
        id: attempt.id,
        title: attempt.title,
        status: attempt.ok ? 'passed' : 'failed',
        script: attempt.script,
        review: {
          ok: attempt.ok,
          functional: attempt.functional,
          qualityOk: attempt.qualityOk,
          summary: summarizeAttempt(attempt),
          blockingReasons: attempt.blockingReasons.slice(0, 5),
          reviewFacts: attempt.reviewFacts.slice(0, 5).map((fact) => `${fact.code}: ${fact.message}`),
        },
      })),
  };
}

function summarizeAttempt(attempt: DesignLoopAttemptResult): string {
  if (attempt.ok) {
    const summary = attempt.mechanismSummary;
    const gripperTravel = summary?.gripperApertureTravelMm;
    const travelText = gripperTravel !== undefined
      ? `, gripper aperture moves ${formatMm(gripperTravel)} mm`
      : '';
    return `validator clean, pose envelope solved, no interferences${travelText}`;
  }
  if (attempt.functional && !attempt.qualityOk) {
    return `functional but rejected by quality gate after ${attempt.reviewFacts.length} review facts`;
  }
  if (attempt.repairMode !== undefined) {
    return `${attempt.repairMode} required after ${attempt.diagnosticCount} diagnostics`;
  }
  return `${attempt.diagnosticCount} diagnostics`;
}

function formatMm(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function publicRecordUrl(outputRecordPath: string): string | undefined {
  const publicRoot = resolve('public');
  const rel = relative(publicRoot, outputRecordPath);
  if (rel.startsWith('..')) return undefined;
  return `/${rel.split(/[\\/]/).join('/')}`;
}
