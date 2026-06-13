// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import type { GripperApertureRequest } from '../../../modeling/mates/gripperAperture';
import type { MechanismFitnessResult } from '../../../modeling/mates/mechanismFitness';
import { reviewCadTool, type RepairContext, type ReviewCadInput, type ReviewCadOutput } from './reviewCad';

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
  checks?: DesignLoopVisualReviewCheck[];
}

export interface DesignLoopVisualReviewCheck {
  code: string;
  passed: boolean;
  finding: string;
  screenshotPath?: string;
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
  samplesPerMate?: number;
  combinatorial?: boolean;
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
      samplesPerMate: input.samplesPerMate,
      combinatorial: input.combinatorial,
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
    // v0.7.4: info-severity diagnostics (Gate 1's vec3-origin deferred
    // notes) are not actionable repair facts; treat them like errors here
    // (which are also excluded from `reviewFacts`). Keep `warning` so quality
    // signals continue to gate the loop.
    .filter((diagnostic) => diagnostic.severity === 'warning')
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
      : buildFailureRepairPrompt(input.review),
  };
}

function buildFailureRepairPrompt(review: Extract<ReviewCadOutput, { ok: false }>): string {
  const context = review.repairContext;
  if (context === undefined) {
    // Defensive fallback: predecessor commits guarantee repairContext on every
    // review output, but keep the prior string for callers that injected an
    // older ReviewCadOutput shape (unit tests, fixtures).
    return review.suggestedRepairPrompt;
  }
  const severityByKey = indexDiagnosticSeverity(review.diagnostics);
  const blockingLines = context.blockingReasons.map((reason) => `- ${reason}`);
  const topLines = context.topDiagnostics
    .slice(0, 3)
    .map((entry) => renderTopDiagnostic(entry, severityByKey));
  const repairDirectiveBlock = review.fitness !== undefined
    ? `Repair mode: ${review.fitness.repairMode}\nDirective: ${review.fitness.repairDirective}`
    : undefined;
  const designLines: string[] = [];
  if (context.designGoal.trim() !== '') {
    designLines.push(`Design goal: ${context.designGoal}`);
  }
  if (context.preserveInterfaces.length > 0) {
    designLines.push(`Preserve interfaces: ${context.preserveInterfaces.join(', ')}`);
  }
  const sections: string[] = [];
  if (blockingLines.length > 0) {
    sections.push(`Blocking reasons:\n${blockingLines.join('\n')}`);
  }
  if (topLines.length > 0) {
    sections.push(`Top diagnostics:\n${topLines.join('\n')}`);
  }
  if (repairDirectiveBlock !== undefined) {
    sections.push(repairDirectiveBlock);
  }
  if (designLines.length > 0) {
    sections.push(designLines.join('\n'));
  }
  if (sections.length === 0) {
    return review.suggestedRepairPrompt;
  }
  return sections.join('\n\n');
}

function renderTopDiagnostic(
  entry: RepairContext['topDiagnostics'][number],
  severityByKey: ReadonlyMap<string, string>,
): string {
  const severity = severityByKey.get(diagnosticKey(entry.code, entry.sampleName)) ?? 'error';
  const parts: string[] = [`[${severity}] ${entry.code}`];
  const scope: string[] = [];
  if (entry.sampleName !== undefined) scope.push(`sampleName=${entry.sampleName}`);
  if (entry.mateName !== undefined) scope.push(`mate=${entry.mateName}`);
  if (scope.length > 0) parts.push(`@ ${scope.join(' ')}`);
  if (entry.suggestedDelta !== undefined) {
    parts.push(`-> suggested: ${formatSuggestedDelta(entry.suggestedDelta)}`);
  }
  return `- ${parts.join(' ')}`;
}

function formatSuggestedDelta(
  delta: NonNullable<RepairContext['topDiagnostics'][number]['suggestedDelta']>,
): string {
  if (typeof delta.widenBy === 'number') {
    return `widen by ${formatDeltaValue(delta.widenBy)}`;
  }
  if (typeof delta.narrowBy === 'number') {
    return `narrow by ${formatDeltaValue(delta.narrowBy)}`;
  }
  return `adjust ${delta.mate}`;
}

function formatDeltaValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function indexDiagnosticSeverity(
  diagnostics: readonly { code: string; severity: string; sampleName?: string }[],
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const diagnostic of diagnostics) {
    const sampleName = 'sampleName' in diagnostic && typeof diagnostic.sampleName === 'string'
      ? diagnostic.sampleName
      : undefined;
    const key = diagnosticKey(diagnostic.code, sampleName);
    if (!map.has(key)) map.set(key, normalizeSeverity(diagnostic.severity));
  }
  return map;
}

function diagnosticKey(code: string, sampleName: string | undefined): string {
  return `${code}::${sampleName ?? ''}`;
}

function normalizeSeverity(severity: string): string {
  if (severity === 'warn') return 'warning';
  return severity;
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
  const failedCheckCode = 'assembly.visual.review-check-failed';
  const weakEvidenceCode = 'assembly.visual.review-evidence-weak';
  const fact = (code: string, message: string, hint: string) =>
    !code.startsWith('assembly.visual.') && allowReviewWarnings.includes(code)
      ? []
      : [{ code, severity: 'warning', message, hint }];

  if (!requireVisualReview) return [];
  if (visualReview === undefined) {
    return fact(
      missingCode,
      'This design-loop run requires screenshot review, but the attempt has no visualReview result.',
      'visual-review.required — render screenshots from Studio/demo-player, inspect whether the model visually matches the requested physical mechanism, then attach visualReview with screenshotPath, findings, checks, and accepted.',
    );
  }
  if (visualReview.accepted) {
    const missing: string[] = [];
    if (visualReview.screenshotPath === undefined || visualReview.screenshotPath.trim() === '') {
      missing.push('screenshotPath');
    }
    if (visualReview.findings.length === 0 || visualReview.findings.every((finding) => finding.trim() === '')) {
      missing.push('findings');
    }
    if (visualReview.checks === undefined || visualReview.checks.length === 0) {
      missing.push('visualReview.checks');
    }
    const checkResults = visualReview.checks ?? [];
    const missingCheckCodes = requiredVisualReviewCheckCodes().filter((code) =>
      !checkResults.some((check) => check.code === code),
    );
    if (missingCheckCodes.length > 0) {
      missing.push(`checks for ${missingCheckCodes.join(', ')}`);
    }
    const checksMissingFindings = checkResults
      .filter((check) => check.finding.trim() === '')
      .map((check) => check.code);
    if (checksMissingFindings.length > 0) {
      missing.push(`check findings for ${checksMissingFindings.join(', ')}`);
    }
    if (missing.length === 0) {
      const failedChecks = checkResults.filter((check) => !check.passed);
      const weakEvidence = checkResults.flatMap((check) => weakVisualCheckEvidence(check));
      if (weakEvidence.length > 0) {
        return fact(
          weakEvidenceCode,
          `Accepted screenshot review has weak evidence: ${weakEvidence.join(' ')}`,
          `visual-review.evidence-weak — record concrete screenshot evidence before accepting the attempt. ${visualReviewEvidenceRequirements().join(' ')}`,
        );
      }
      if (failedChecks.length === 0) return [];
      return fact(
        failedCheckCode,
        `Accepted screenshot review has failed checks: ${failedChecks.map((check) => `${check.code}: ${check.finding}`).join(' ')}`,
        `visual-review.check-failed — an accepted visual review cannot contain failed checks. Repair the specific failed visual checks, render screenshots again, and only accept when every required check passes. ${visualReviewEvidenceRequirements().join(' ')}`,
      );
    }
    return fact(
      incompleteCode,
      `Accepted screenshot review is incomplete; missing ${missing.join(' and ')}.`,
      `visual-review.incomplete — as the vision-capable agent, render or open screenshots, inspect them against the required visualReview.checks checklist, and record screenshotPath plus concrete findings before accepting. ${visualReviewEvidenceRequirements().join(' ')}`,
    );
  }
  const failedChecks = (visualReview.checks ?? []).filter((check) => !check.passed);
  if (failedChecks.length > 0) {
    return fact(
      failedCheckCode,
      `Screenshot review failed required checks: ${failedChecks.map((check) => `${check.code}: ${check.finding}`).join(' ')}`,
      `visual-review.check-failed — repair the specific failed visual checks, render screenshots again, and only accept when every required check passes. ${visualReviewEvidenceRequirements().join(' ')}`,
    );
  }
  return fact(
    rejectedCode,
    `Screenshot review rejected this attempt: ${visualReview.findings.join(' ')}`,
    'visual-review.rejected — redesign from the prompt or a mechanism primitive, render screenshots again, and only set accepted when the model is visually/mechanically legible.',
  );
}

function requiredVisualReviewCheckCodes(): readonly string[] {
  return [
    'main-object-count',
    'proportions-match-reference',
    'required-visible-features',
    'no-stray-or-floating-geometry',
    'attachment-plausibility',
    'semantic-orientation-alignment',
    'device-depth-and-construction',
    'canonical-views-physically-coherent',
  ];
}

function weakVisualCheckEvidence(check: DesignLoopVisualReviewCheck): string[] {
  if (!check.passed) return [];
  const finding = check.finding.toLowerCase();
  if (check.code === 'attachment-plausibility') {
    const namesInterface = /\b(lugs?|spring\s*bars?|pins?|barrels?|slots?|clamps?|brackets?|mounts?|fasteners?|hinges?|strap\s*tongues?|end\s*links?|connectors?|interfaces?)\b/.test(finding);
    const namesContinuity = /\b(connects?|connected|connection|load(?:\s|-)*path|load(?:\s|-)*bearing|bridg\w*|through|between|seated|captured|passes|touches|anchored|retained)\b/.test(finding);
    const namesFit = /\b(seated|exposed|clearance|clearanced|not\s+buried|not\s+half(?:\s|-)*inserted|not\s+embedded|not\s+occluded|visible\s+ends?|flush|captured\s+in\s+(?:the\s+)?lugs?)\b/.test(finding);
    const namesBodyAnchor = /\b(case(?:\s|-)*body|case(?:\s|-)*band|case|body|housing|watch\s*head|main\s*body)\b/.test(finding);
    if (namesInterface && namesContinuity && namesFit && namesBodyAnchor) return [];
    return [
      `attachment-plausibility needs concrete interface, load path, seated/no-buried-hardware, and parent or case body anchor evidence; finding was "${check.finding}".`,
    ];
  }
  if (check.code === 'required-visible-features') {
    const namesRequiredDetails = /\b(required|features?|dial|numerals?|numbers?|labels?|text|hands?|markers?|ticks?|crown|strap|bracelet)\b/.test(finding);
    const namesLegibility = /\b(legible|readable|visible|clear|present)\b/.test(finding);
    const namesNoOcclusion = /\b(unobstructed|not\s+covered|not\s+occluded|not\s+hidden|not\s+cut\s*off|clearance|clearanced|outside\s+the\s+bezel|inside\s+the\s+dial|within\s+the\s+dial)\b/.test(finding);
    if (namesRequiredDetails && namesLegibility && namesNoOcclusion) return [];
    return [
      `required-visible-features needs evidence that required details are legible and unobstructed/not covered; finding was "${check.finding}".`,
    ];
  }
  if (check.code === 'no-stray-or-floating-geometry') {
    const rejectsFloating = /\b(no\s+(?:stray|floating|disconnected|unsupported)|not\s+(?:floating|disconnected|unsupported)|nothing\s+(?:floating|disconnected|unsupported))\b/.test(finding);
    const namesSupport = /\b(contact|touch(?:es|ing)?|fasteners?|screws?|pins?|brackets?|mounts?|clips?|hinges?|socket|seated|supported|attached|connected|continuous\s+path|load(?:\s|-)*path|parent\s+(?:body|structure)|main\s+(?:body|structure|frame)|case|housing|frame)\b/.test(finding);
    const namesSecondary = /\b(secondary|strap|bracelet|button|crown|cover|panel|bracket|handle|lug|link|arm|wire|cable|accessory|part|component|geometry)\b/.test(finding);
    const rejectsAirGap = /\b(no\s+(?:visible\s+)?air\s*gap|not\s+separated|touch(?:es|ing)?|in\s+contact|near(?:\s|-)*contact|flush|seated|captured|passes\s+through|mounted\s+into)\b/.test(finding);
    if (rejectsFloating && namesSupport && namesSecondary && rejectsAirGap) return [];
    return [
      `no-stray-or-floating-geometry needs evidence that secondary components are supported by contact/near-contact, fasteners, brackets, or a continuous path into the parent body, with no visible air gap; finding was "${check.finding}".`,
    ];
  }
  if (check.code === 'device-depth-and-construction') {
    const namesDepth = /\b(side|canonical|section|thickness|depth|deep|wall|shell|layer|layers|stack)\b/.test(finding);
    const namesConstruction = /\b(bezel|case(?:back)?|back|cover|housing|body|cavity|movement|crystal|gasket|recess|pocket|chamber|case\s*band)\b/.test(finding);
    const rejectsFacade = /\b(non(?:\s|-)*facade|not\s+(?:a\s+)?flat|not\s+two\s+(?:flat\s+)?faces|not\s+two\s+surfaces|full\s+casing)\b/.test(finding);
    if (namesDepth && namesConstruction && rejectsFacade) return [];
    return [
      `device-depth-and-construction needs concrete construction layers and non-facade evidence; finding was "${check.finding}".`,
    ];
  }
  return [];
}

function visualReviewEvidenceRequirements(): string[] {
  return [
    'For attachment-plausibility, name the interface geometry and prove it is seated/clearanced, not buried, half-inserted, embedded, or visually occluded.',
    'For attachment-plausibility, user controls such as crowns, winding wheels, buttons, handles, knobs, sliders, or levers must mount to the functional body/neck/housing they actuate, not to decorative loops, straps, hangers, or other non-actuating hardware.',
    'For required-visible-features, prove dial details, numerals, labels, hands, markers, and other requested features are legible and unobstructed, not covered by casing, bezel, or smoky/opaque transparent-cover geometry.',
    'For no-stray-or-floating-geometry, prove every visible secondary component is supported by contact or near-contact, fasteners, brackets, or a continuous path into the parent body, and explicitly rule out visible air gaps.',
    'For device-depth-and-construction, name casing/body layers such as bezel, case back, wall, housing, cavity, crystal, gasket, or movement pocket, and explicitly rule out a flat two-face facade.',
  ];
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
  return `Functional CAD is not enough. The model still has unresolved review facts that an agent must explain or repair before accepting it as a physical object.\n${facts}\nEither redesign the geometry so these facts disappear, or explicitly justify and allow the non-visual warning code only when the disconnected/extra geometry has a real physical role. Visual review gates cannot be allow-listed; use requireVisualReview: false only for explicit non-visual batch checks.${visual}`;
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
