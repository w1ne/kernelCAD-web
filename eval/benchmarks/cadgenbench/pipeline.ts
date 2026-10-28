// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/benchmarks/cadgenbench/pipeline.ts
//
// One CADGenBench task → one `output.step` candidate.
//
//   generation: drawing image(s) → LLM writes a .kcad.ts → gate → STEP
//   editing:    input.step (+ inspect({ of: 'step' }) summary + renders) → LLM writes a
//               .kcad.ts that imports it via lib.fromSTEP and applies the
//               change → gate → STEP
//
// Every candidate script runs through the eval's closed loop
// (src/agent/loop/closedLoop.ts) with a two-stage gate: STEP export (which
// runs the script, so its diagnostics are the evaluate diagnostics) and the
// validity pre-check (validity.ts). A failure in either stage becomes a typed
// verdict that the loop's repair prompt feeds back to the model, so an open
// shell or a non-manifold mesh is repaired like any other diagnostic.
//
// When the loop ends without a passing candidate and the script has an
// evaluate error, one deterministic repair iteration runs through the
// `repair_script` tool before the task is given up.
//
// The accepted STEP is written to `<runDir>/submission/<id>/output.step` only
// when it passes the pre-check (or `keepInvalid` is set).

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { runClosedLoop } from '../../../src/agent/loop/closedLoop.js';
import type { GateReport, GateRunner, GateVerdict, LoopMessage } from '../../../src/agent/loop/types.js';
import { buildRepairPrompt } from '../../../src/agent/loop/repairPrompt';
import { repairScriptTool } from '../../../src/agent/mcp/tools/repairScript';
import { inspectNormalizedStepFile } from '../../../src/agent/inspect/inspectStep';
import type { StepInspectReport } from '../../../src/kernel/import/inspectStep';
import { exportStep } from '../../oracle/kernelcad-client';
import { extractScript } from '../../lib';
import type { AgentClient, AgentImage, EvaluateResult } from '../../types';
import type { CadGenBenchTask } from './dataset';
import { EDIT_INPUT_NAME, editingPrompt, generationPrompt, loadImages } from './prompts';
import { candidatePath, taskSubmissionDir } from './submission';
import { isFinished, readTaskState, taskWorkDir, writeTaskState, type TaskState } from './state';
import { mapPool } from '../../lib/pool';
import { refineVisualCandidate } from './visualRefinement';
import { renderCandidateViews, renderCandidateComparison } from './visualRender';
import { checkStepValidity, withOcctLock, type StepValidity } from './validity';
import { generationLedgerMismatch } from './generationLedger';
import {
  classifyEditPromotion,
  unknownEditPromotion,
  type EditPromotionResult,
} from './editPromotion';

export const VALIDITY_GATE = 'cadgenbench-validity';
export const EDIT_PROMOTION_GATE = 'cadgenbench-edit-promotion';

export interface EditPromotionContext {
  task: CadGenBenchTask;
  /** The script that produced the candidate. */
  scriptPath: string;
  /** The exported, validity-gated STEP. */
  stepPath: string;
  /** The starting solid, copied next to the script by the pipeline. */
  inputStepPath: string;
}

export type EditPromotionHook = (ctx: EditPromotionContext) => Promise<EditPromotionResult>;

export interface Prices {
  /** USD per million input tokens. */
  inPerMTok: number;
  /** USD per million output tokens. */
  outPerMTok: number;
}

export interface PipelineConfig {
  runDir: string;
  /** Null when no LLM key is configured. */
  agent: AgentClient | null;
  model: string;
  skillMd: string;
  maxAttempts: number;
  maxTokens: number;
  /** Opt-in one visual review after the first valid generation candidate. */
  visualReview?: boolean;
  /** Optional preview seam; default renders the candidate STEP without a browser. */
  visualRender?: (stepPath: string) => Promise<AgentImage[]>;
  /** Optional paired preview seam, expected to use a shared frame. */
  visualComparison?: (first: string, second: string) => Promise<[AgentImage[], AgentImage[]]>;
  temperature?: number;
  /** Directory of pre-written `<id>.kcad.ts` scripts; replaces the LLM step. */
  scriptsFrom?: string;
  /** No-LLM editing runs submit the input unchanged. Without a key this is the
   *  intended mode; it is never applied to a real LLM/scripts-from edit that
   *  failed promotion. */
  editFallback: 'none' | 'passthrough';
  /** Request-aware editing promotion. `auto` compares the candidate STEP to
   *  input.step after the validity gate; `off` is for unit tests. A function
   *  injects a deterministic verdict. */
  editPromotion?: 'auto' | 'off' | EditPromotionHook;
  /** Write a candidate that fails the pre-check instead of leaving the task missing. */
  keepInvalid: boolean;
  prices?: Prices;
  /** Compare a generation script's extent ledger with the exported solid.
   *  Defaults on for generation tasks. A mismatch is repaired; the last valid
   *  solid is still eligible for submission. */
  generationLedger?: boolean;
  /** Test seams; default to the kernelCAD CLI and the in-process pre-check. */
  gate?: GateRunner;
  exportStep?: (scriptPath: string, outPath: string) => Promise<EvaluateResult>;
  precheck?: (stepPath: string) => Promise<StepValidity>;
  repair?: (scriptPath: string) => Promise<boolean>;
  /**
   * The benchmark's own validity gate (`analyze_step`). When configured it is
   * authoritative for acceptance: a candidate it accepts is kept even when the
   * local pre-check rejected it, and one it rejects is not submitted even when
   * the local pre-check accepted it. The local check remains the fast mirror
   * and the repair-prompt source.
   */
  official?: (stepPath: string) => Promise<OfficialVerdict | undefined>;
  log?: (line: string) => void;
}

export function costUsd(prices: Prices | undefined, tokensIn: number, tokensOut: number): number | null {
  if (!prices) return null;
  return (tokensIn * prices.inPerMTok + tokensOut * prices.outPerMTok) / 1_000_000;
}

/** Passthrough edit: import the starting solid and return it unchanged. */
export function passthroughScript(): string {
  return `// CADGenBench editing passthrough: the starting solid, unchanged.\nconst base = await lib.fromSTEP('./${EDIT_INPUT_NAME}');\nreturn base;\n`;
}

/** Export diagnostics as evaluate-style verdicts (the export runs the script). */
export function verdictsFromExport(r: EvaluateResult): GateVerdict[] {
  const blocking = r.diagnostics.filter((d) => (d as { severity?: string }).severity !== 'info');
  if (blocking.length === 0) {
    return [{ gate: 'export', ok: false, code: 'export.failed', message: 'STEP export failed without a diagnostic.' }];
  }
  return blocking.map((d) => ({ gate: 'evaluate', ok: false, code: d.code, message: d.message, hint: d.hint, locus: d.featureId }));
}

export function verdictFromValidity(v: StepValidity): GateVerdict {
  return {
    gate: VALIDITY_GATE,
    ok: v.valid,
    code: v.valid ? undefined : 'cadgenbench.invalid-brep',
    message: v.valid
      ? `valid: ${v.solidCount} solid(s), ${v.faceCount} faces`
      : `exported STEP fails the benchmark validity gate: ${v.errors.join('; ')}`,
    hint: v.valid
      ? undefined
      : 'Return ONE closed solid: fuse touching bodies into one, remove zero-thickness walls and coincident faces, and avoid booleans that leave faces or edges exactly tangent.',
  };
}

interface CandidateGate extends GateRunner {
  /** Pre-check verdict of the last STEP exported for a script path. */
  lastValidity(scriptPath: string): StepValidity | undefined;
  /** Official-gate verdict of the last STEP, when the official gate ran. */
  lastOfficial(scriptPath: string): OfficialVerdict | undefined;
  /** Whether the last STEP is accepted (official gate first when configured). */
  lastAcceptance(scriptPath: string): boolean | undefined;
  /** Whether a successful export wrote a STEP (even if a later gate rejected it). */
  lastProduced(scriptPath: string): boolean | undefined;
  /** First failing verdict of the last gate run for a script path. */
  lastFailure(scriptPath: string): GateVerdict | undefined;
  stepPathFor(scriptPath: string): string;
}

/** Result of the benchmark's own validity gate for one STEP. */
export interface OfficialVerdict {
  valid: boolean;
  /** Human-readable failure detail from `analyze_step`. */
  detail?: string;
}

/** Keep the gate report consistent with the authoritative acceptance verdict:
 *  an official accept hides local failures, an official reject adds one. */
function reconcileVerdicts(
  verdicts: GateVerdict[],
  accepted: boolean,
  official: OfficialVerdict | undefined,
): GateVerdict[] {
  if (official === undefined) return verdicts;
  const failures = verdicts.filter((v) => !v.ok);
  if (accepted && failures.length > 0) {
    return [
      ...verdicts.filter((v) => v.ok),
      {
        gate: 'official',
        ok: true,
        message: `official gate accepted the STEP after the local gate rejected it (${failures.map((f) => f.code ?? f.gate).join(', ')})`,
      },
    ];
  }
  if (!accepted && failures.length === 0) {
    return [
      ...verdicts,
      {
        gate: 'official',
        ok: false,
        code: 'cadgenbench.official.invalid',
        message: `official gate rejected the STEP: ${official.detail ?? 'invalid'}`,
        hint: 'The benchmark gate is authoritative; rebuild the feature it names.',
      },
    ];
  }
  return verdicts;
}

/**
 * STEP export (which runs the script) → validity pre-check, as one gate suite.
 * The export is the evaluate stage: its error diagnostics are the script's.
 * `cfg.gate` optionally runs first (e.g. the full evaluate + interference suite).
 */
export function createCandidateGate(cfg: PipelineConfig): CandidateGate {
  const base = cfg.gate;
  const exporter = cfg.exportStep ?? exportStep;
  const precheck = cfg.precheck ?? checkStepValidity;
  const validity = new Map<string, StepValidity>();
  const officialVerdicts = new Map<string, OfficialVerdict>();
  const acceptance = new Map<string, boolean>();
  const produced = new Map<string, boolean>();
  const failures = new Map<string, GateVerdict>();
  const stepPathFor = (scriptPath: string) => scriptPath.replace(/(\.kcad)?\.ts$/, '.step');
  return {
    stepPathFor,
    lastValidity: (p) => validity.get(p),
    lastOfficial: (p) => officialVerdicts.get(p),
    lastAcceptance: (p) => acceptance.get(p),
    lastProduced: (p) => produced.get(p),
    lastFailure: (p) => failures.get(p),
    async run(scriptPath: string): Promise<GateReport> {
      const report = await runStages(scriptPath);
      const failed = report.verdicts.find((v) => !v.ok);
      if (failed) failures.set(scriptPath, failed);
      else failures.delete(scriptPath);
      return report;
    },
  };

  async function runStages(scriptPath: string): Promise<GateReport> {
    validity.delete(scriptPath);
    officialVerdicts.delete(scriptPath);
    acceptance.delete(scriptPath);
    produced.delete(scriptPath);
    const report: GateReport = base ? await base.run(scriptPath) : { ok: true, verdicts: [] };
    if (!report.ok) return report;
    const stepPath = stepPathFor(scriptPath);
    if (existsSync(stepPath)) rmSync(stepPath);
    const exported = await exporter(scriptPath, stepPath);
    const stepExists = existsSync(stepPath);
    produced.set(scriptPath, exported.ok && stepExists);
    let v: StepValidity | undefined;
    if (stepExists) {
      v = await precheck(stepPath);
      validity.set(scriptPath, v);
    }
    const verdicts = [...report.verdicts];
    if (!exported.ok) verdicts.push(...verdictsFromExport(exported));
    else if (v) verdicts.push(verdictFromValidity(v));
    else {
      verdicts.push({
        gate: 'validity',
        ok: false,
        code: 'cadgenbench.no-step',
        message: 'STEP export reported success but wrote no file.',
      });
    }

    // The benchmark's own gate is authoritative when available: the local
    // pre-check is a fast mirror (a different tessellator), so it may reject a
    // STEP the grader accepts, or accept one it rejects.
    let accepted = exported.ok && v?.valid === true;
    let official: OfficialVerdict | undefined;
    if (cfg.official && stepExists) {
      try {
        official = await cfg.official(stepPath);
      } catch (e) {
        cfg.log?.(`official gate unavailable for ${scriptPath}: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (official) {
        officialVerdicts.set(scriptPath, official);
        accepted = official.valid;
      }
    }
    acceptance.set(scriptPath, accepted);
    const reconciled = reconcileVerdicts(verdicts, accepted, official);
    if (accepted && v?.valid && cfg.generationLedger) {
      const mismatch = generationLedgerMismatch(readFileSync(scriptPath, 'utf8'), v);
      if (mismatch) {
        reconciled.push({
          gate: 'ledger',
          ok: false,
          code: 'cadgenbench.ledger-mismatch',
          message: mismatch,
          hint: 'Change the geometry so the measured solid matches the drawing. Update the ledger only when the drawing numbers themselves were copied wrong.',
        });
      }
    }
    return { ok: reconciled.every((verdict) => verdict.ok), verdicts: reconciled };
  }
}

/** Editing baseline: the healed import the script receives, not the raw file. */
async function inspectEditingSolid(
  file: string,
): Promise<{ ok: true; report: StepInspectReport } | { ok: false; error: string }> {
  try {
    return { ok: true, report: await inspectNormalizedStepFile(file) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Inspect input and candidate, then run the pure classifier. Any inspection
 *  failure is `unknown` rather than a rejection: a missing measurement is not
 *  evidence that the edit is wrong. */
async function autoEditPromotion(ctx: EditPromotionContext): Promise<EditPromotionResult> {
  const before = await withOcctLock(() => inspectEditingSolid(ctx.inputStepPath));
  if (!before.ok) {
    return unknownEditPromotion(`could not inspect the input solid: ${before.error}`);
  }
  const after = await withOcctLock(() => inspectEditingSolid(ctx.stepPath));
  if (!after.ok) {
    return unknownEditPromotion(`could not inspect the candidate solid: ${after.error}`);
  }
  return classifyEditPromotion({
    request: ctx.task.description,
    before: before.report,
    after: after.report,
  });
}

function promotionVerdict(result: EditPromotionResult): GateVerdict {
  return {
    gate: EDIT_PROMOTION_GATE,
    ok: false,
    code: `cadgenbench.edit.${result.classification}`,
    message: result.reason,
    hint:
      result.classification === 'no-op'
        ? 'The exported STEP is the unchanged input. Actually apply the requested edit; do not bank the baseline and do not return input.step as the answer.'
        : result.classification === 'wrong-direction'
          ? 'The material moved the opposite way from the request. Recheck whether the feature is an internal void or an outer body, then rebuild the edit.'
          : result.classification === 'wrong-magnitude'
            ? 'The edit is in the right direction but has not reached the dimension named in the request. Continue the same edit until that feature matches the requested size; do not stop at a partial change.'
            : result.classification === 'wrong-topology'
              ? 'The candidate added or removed a feature the request did not ask for. Preserve every unmentioned hole, boss, fillet, and solid.'
              : 'The candidate does not satisfy the requested change. Re-read the request and rebuild only that feature.',
  };
}

/**
 * Wrap the validity gate with editing promotion. Promotion runs only after the
 * STEP is valid, so the repair prompt first sees kernel/validity failures and
 * then semantic ones. The wrapper keeps its own failure map because the base
 * gate considers a promotion-rejected candidate valid.
 */
function withPromotionGate(base: CandidateGate, cfg: PipelineConfig, task: CadGenBenchTask): CandidateGate {
  const hook: EditPromotionHook =
    typeof cfg.editPromotion === 'function' ? cfg.editPromotion : autoEditPromotion;
  const promotionFailures = new Map<string, GateVerdict>();
  return {
    stepPathFor: base.stepPathFor,
    lastValidity: (p) => base.lastValidity(p),
    lastOfficial: (p) => base.lastOfficial(p),
    lastAcceptance: (p) => base.lastAcceptance(p),
    lastProduced: (p) => base.lastProduced(p),
    lastFailure: (p) => promotionFailures.get(p) ?? base.lastFailure(p),
    async run(scriptPath: string): Promise<GateReport> {
      const report = await base.run(scriptPath);
      if (!report.ok) {
        promotionFailures.delete(scriptPath);
        return report;
      }
      let result: EditPromotionResult;
      try {
        result = await hook({
          task,
          scriptPath,
          stepPath: base.stepPathFor(scriptPath),
          inputStepPath: join(taskWorkDir(cfg.runDir, task.id), EDIT_INPUT_NAME),
        });
      } catch (e) {
        result = unknownEditPromotion(`promotion inspection failed: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (result.status !== 'failed') {
        promotionFailures.delete(scriptPath);
        return report;
      }
      const verdict = promotionVerdict(result);
      promotionFailures.set(scriptPath, verdict);
      return { ok: false, verdicts: [...report.verdicts, verdict] };
    },
  };
}

interface LoopOutcome {
  passed: boolean;
  scriptPath?: string;
  attempts: number;
  tokensIn: number;
  tokensOut: number;
  transcript: string[];
}

async function runLlmLoop(
  cfg: PipelineConfig,
  agent: AgentClient,
  gate: CandidateGate,
  prompt: string,
  images: AgentImage[],
  scriptPath: string,
): Promise<LoopOutcome> {
  const transcript: string[] = [`# prompt\n\n${prompt}\n\n(${images.length} image(s) attached)`];
  const result = await runClosedLoop({
    prompt,
    gateRunner: gate,
    extractScript: text => /```(?:ts|typescript|javascript|js)?[ \t]*\r?\n[\s\S]*?```/i.test(text) ? extractScript(text.replace(/\r\n/g, '\n')) : null,
    buildRepairPrompt,
    maxAttempts: cfg.maxAttempts,
    candidates: 1,
    writeScript: async (code) => {
      writeFileSync(scriptPath, code);
      return scriptPath;
    },
    generate: async (messages: LoopMessage[]) => {
      // The drawing / renders ride on the first user turn only.
      const withImages = messages.map((m, i) => (i === 0 ? { ...m, images } : m));
      const resp = await agent.generate({
        system: cfg.skillMd,
        messages: withImages,
        model: cfg.model,
        max_tokens: cfg.maxTokens,
        ...(cfg.temperature !== undefined ? { temperature: cfg.temperature } : {}),
      });
      transcript.push(`# assistant\n\n${resp.text}`);
      return { text: resp.text, tokensIn: resp.tokens_in, tokensOut: resp.tokens_out };
    },
    onEvent: (e) => {
      if (e.type === 'repair') transcript.push(`# repair prompt\n\n${e.prompt}`);
    },
  });
  return {
    passed: result.status === 'passed',
    scriptPath: result.status === 'no_script' ? undefined : result.scriptPath,
    attempts: result.attempts,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    transcript,
  };
}

/**
 * One deterministic repair iteration via the `repair_script` tool. Returns
 * true when a patch was accepted (the script on disk is then the patched one).
 */
async function deterministicRepair(scriptPath: string): Promise<boolean> {
  const out = await withOcctLock(() => repairScriptTool({ file: scriptPath, strategy: 'try-all' }));
  if (!out.ok || out.new_code === undefined) return false;
  writeFileSync(scriptPath, out.new_code);
  return true;
}

function baseState(task: CadGenBenchTask, cfg: PipelineConfig): TaskState {
  return {
    id: task.id,
    type: task.type,
    status: 'failed',
    mode: 'none',
    attempts: 0,
    repaired: false,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: null,
    wallMs: 0,
    ...(cfg.agent ? { model: cfg.model } : {}),
    updatedAt: new Date().toISOString(),
  };
}

/** Copy the gated STEP into the submission layout; returns the final status. */
function acceptCandidate(cfg: PipelineConfig, task: CadGenBenchTask, stepPath: string, accepted: boolean): TaskState['status'] {
  if (existsSync(stepPath) && (accepted || cfg.keepInvalid)) {
    mkdirSync(taskSubmissionDir(cfg.runDir, task.id), { recursive: true });
    copyFileSync(stepPath, candidatePath(cfg.runDir, task.id));
  }
  return accepted ? 'valid' : 'invalid';
}

/** Run one task end to end. Never throws: a crash is recorded as `infra_error`. */
export async function runTask(task: CadGenBenchTask, cfg: PipelineConfig): Promise<TaskState> {
  const started = Date.now();
  const log = cfg.log ?? (() => {});
  const state = baseState(task, cfg);
  const workDir = taskWorkDir(cfg.runDir, task.id);
  mkdirSync(workDir, { recursive: true });
  // The submission folder exists for every attempted task, so the zip keeps
  // a `missing` entry for tasks that end without a candidate.
  mkdirSync(taskSubmissionDir(cfg.runDir, task.id), { recursive: true });
  const scriptPath = join(workDir, 'model.kcad.ts');
  const realEdit = Boolean(cfg.agent || cfg.scriptsFrom);
  const baseGate = createCandidateGate(
    task.type === 'generation' && cfg.generationLedger !== false ? { ...cfg, generationLedger: true } : cfg,
  );
  const gate =
    task.type === 'editing' && realEdit && cfg.editPromotion !== 'off'
      ? withPromotionGate(baseGate, cfg, task)
      : baseGate;

  const finish = (patch: Partial<TaskState>, checkedScript = scriptPath): TaskState => {
    const s: TaskState = {
      ...state,
      ...patch,
      costUsd: costUsd(cfg.prices, patch.tokensIn ?? state.tokensIn, patch.tokensOut ?? state.tokensOut),
      wallMs: Date.now() - started,
      updatedAt: new Date().toISOString(),
    };
    const v = gate.lastValidity(checkedScript);
    if (v) s.precheck = { valid: v.valid, errors: v.errors, faceCount: v.faceCount, solidCount: v.solidCount };
    const official = gate.lastOfficial(checkedScript);
    if (official) s.official = { valid: official.valid, detail: official.valid ? 'pass' : official.detail ?? 'invalid' };
    return s;
  };

  try {
    // A retry must not leave the previous result in the submission if this
    // attempt fails. Preserve the old file for audit outside the submission.
    const priorCandidate = candidatePath(cfg.runDir, task.id);
    if (existsSync(priorCandidate)) {
      const archiveDir = join(workDir, 'previous-candidates');
      mkdirSync(archiveDir, { recursive: true });
      renameSync(priorCandidate, join(archiveDir, `${randomUUID()}.step`));
    }
    if (task.type === 'editing') copyFileSync(task.inputStep!, join(workDir, EDIT_INPUT_NAME));

    // 1. Produce a script: pre-written, LLM, or nothing.
    let passed = false;
    let produced = false;
    let checkedScript = scriptPath;
    if (cfg.scriptsFrom) {
      const src = join(cfg.scriptsFrom, `${task.id}.kcad.ts`);
      if (!existsSync(src)) return finish({ mode: 'scripts-from', status: 'failed', error: `no script at ${src}` });
      writeFileSync(scriptPath, readFileSync(src, 'utf8'));
      state.mode = 'scripts-from';
      state.attempts = 1;
      produced = true;
      passed = (await gate.run(scriptPath)).ok;
    } else if (cfg.agent) {
      state.mode = 'llm';
      let prompt: string;
      if (task.type === 'generation') {
        prompt = generationPrompt(task);
      } else {
        const inspected = await withOcctLock(() => inspectEditingSolid(join(workDir, EDIT_INPUT_NAME)));
        prompt = editingPrompt(task, inspected.ok ? inspected.report : null);
      }
      writeFileSync(join(workDir, 'prompt.md'), prompt);
      const loop = await runLlmLoop(cfg, cfg.agent, gate, prompt, loadImages(task.images), scriptPath);
      writeFileSync(join(workDir, 'transcript.md'), loop.transcript.join('\n\n') + '\n');
      state.attempts = loop.attempts;
      state.tokensIn = loop.tokensIn;
      state.tokensOut = loop.tokensOut;
      produced = loop.scriptPath !== undefined;
      passed = loop.passed;
      if (passed && cfg.visualReview && task.type === 'generation') {
        const original = readFileSync(scriptPath, 'utf8');
        const reviewPath = join(workDir, 'visual-review.kcad.ts');
        const refinement = await refineVisualCandidate({
          prompt, referencePrompt: task.description, original, drawing: loadImages(task.images),
          render: async code => {
            const revised = code !== original;
            const views = await (cfg.visualRender ?? renderCandidateViews)(gate.stepPathFor(revised ? reviewPath : scriptPath));
            for (let i = 0; i < views.length; i++) {
              if (views[i].mediaType !== 'image/png') throw new Error('visual preview must be PNG');
              writeFileSync(join(workDir, `visual-${revised ? 'revised-' : ''}view-${i + 1}.png`), Buffer.from(views[i].data, 'base64'));
            }
            return views;
          },
          compare: async () => {
            const paths = [gate.stepPathFor(scriptPath), gate.stepPathFor(reviewPath)] as const;
            const pair = await (cfg.visualComparison ?? renderCandidateComparison)(...paths);
            for (let candidate = 0; candidate < pair.length; candidate++) {
              for (let i = 0; i < pair[candidate].length; i++) {
                const image = pair[candidate][i];
                if (image.mediaType !== 'image/png') throw new Error('visual preview must be PNG');
                writeFileSync(join(workDir, `visual-${candidate ? 'revised-' : 'comparison-'}view-${i + 1}.png`), Buffer.from(image.data, 'base64'));
              }
            }
            return pair;
          },
          revise: messages => cfg.agent!.generate({system: cfg.skillMd, messages, model: cfg.model, max_tokens: cfg.maxTokens, ...(cfg.temperature !== undefined ? {temperature: cfg.temperature} : {})}),
          check: async code => { writeFileSync(reviewPath, code); return (await gate.run(reviewPath)).ok; },
        });
        state.tokensIn += refinement.tokensIn;
        state.tokensOut += refinement.tokensOut;
        if (refinement.outcome !== 'render_failed') state.attempts++;
        const reviewFailure = refinement.outcome === 'rejected' ? gate.lastFailure(reviewPath) : undefined;
        writeFileSync(join(workDir, 'visual-review.json'), JSON.stringify({outcome: refinement.outcome, tokensIn: refinement.tokensIn, tokensOut: refinement.tokensOut, ...(refinement.error ? {error: refinement.error} : {}), ...(reviewFailure ? {gateFailure: reviewFailure} : {})}, null, 2)+'\n');
        if (refinement.responseText !== undefined) writeFileSync(join(workDir, 'visual-response.md'), refinement.responseText+'\n');
        if (refinement.comparisonText !== undefined) writeFileSync(join(workDir, 'visual-comparison.md'), refinement.comparisonText+'\n');
        if (refinement.outcome === 'accepted') {
          copyFileSync(scriptPath, join(workDir, 'visual-checkpoint.kcad.ts'));
          copyFileSync(gate.stepPathFor(scriptPath), join(workDir, 'visual-checkpoint.step'));
          copyFileSync(reviewPath, scriptPath);
          copyFileSync(gate.stepPathFor(reviewPath), gate.stepPathFor(scriptPath));
          checkedScript = reviewPath;
        }
      }
    } else if (task.type === 'generation') {
      writeFileSync(join(workDir, 'prompt.md'), generationPrompt(task));
      return finish({ status: 'needs_key', error: 'generation needs an LLM: set ANTHROPIC_API_KEY (or --base-url + --api-key-env)' });
    }

    // 2. One deterministic repair iteration when the script does not evaluate.
    if (produced && !passed && gate.lastValidity(scriptPath) === undefined) {
      state.repaired = true;
      if (await (cfg.repair ?? deterministicRepair)(scriptPath)) {
        log(`[${task.id}] repair_script applied a patch`);
        passed = (await gate.run(scriptPath)).ok;
      }
    }

    // 3. Accept the gated candidate. A promotion-rejected candidate is still a
    //    valid solid, but it is not an answer to the edit and must not be
    //    submitted. Passthrough remains only for a run with no producer at all;
    //    it is never a silent fallback after a real edit failed.
    const checked = produced ? gate.lastAcceptance(checkedScript) : undefined;
    const exportedCandidate = produced ? gate.lastProduced(checkedScript) : undefined;
    const why = gate.lastFailure(checkedScript);
    const promotionFailed = why?.gate === EDIT_PROMOTION_GATE;
    let status: TaskState['status'] | undefined;
    if (checked === true && !promotionFailed) {
      status = acceptCandidate(cfg, task, gate.stepPathFor(checkedScript), true);
    } else if (checked === false && exportedCandidate === true && !promotionFailed) {
      status = acceptCandidate(cfg, task, gate.stepPathFor(checkedScript), false);
    }
    const fallback =
      task.type === 'editing' &&
      status !== 'valid' &&
      !promotionFailed &&
      !cfg.agent &&
      !cfg.scriptsFrom;
    if (fallback) {
      const fallbackPath = join(workDir, 'passthrough.kcad.ts');
      writeFileSync(fallbackPath, passthroughScript());
      await gate.run(fallbackPath);
      const fbAccepted = gate.lastAcceptance(fallbackPath);
      const fbProduced = gate.lastProduced(fallbackPath) === true;
      const fbStatus = fbAccepted === true || (fbAccepted === false && fbProduced)
        ? acceptCandidate(cfg, task, gate.stepPathFor(fallbackPath), fbAccepted === true)
        : 'failed';
      // Without a producer the passthrough IS the mode; after a failed LLM or
      // scripts-from attempt it is recorded as a fallback of that mode, so a
      // resumed run of the same mode does not pay for the task again.
      return finish(
        state.mode === 'none'
          ? { mode: 'passthrough', status: fbStatus }
          : { mode: state.mode, fallback: 'passthrough', status: fbStatus },
        fallbackPath,
      );
    }
    if (status !== undefined) return finish({ status }, checkedScript);
    return finish({
      status: 'failed',
      error: produced
        ? promotionFailed
          ? `no candidate passed edit promotion — ${why?.code ?? why?.gate}: ${why?.message.slice(0, 200) ?? 'unknown promotion failure'}`
          : `no candidate passed export${why ? ` — ${why.code ?? why.gate}: ${why.message.slice(0, 200)}` : ''}`
        : 'no script extracted',
    });
  } catch (e) {
    return finish({ status: 'infra_error', error: e instanceof Error ? e.message : String(e) });
  }
}

export interface RunAllOptions {
  workers: number;
  /** Rerun tasks that ended `invalid` or `failed`. */
  retryFailed: boolean;
}

function candidateDigest(path: string): string | undefined {
  try {
    const bytes = readFileSync(path);
    return bytes.length ? createHash('sha256').update(bytes).digest('hex') : undefined;
  } catch { return undefined; }
}

/**
 * Run tasks with bounded concurrency and resume: a task whose state.json is
 * already terminal for this run's producer is skipped, every other task runs
 * and its state is written as soon as it ends (a killed run loses at most the
 * tasks in flight).
 */
export async function runAll(
  tasks: CadGenBenchTask[],
  cfg: PipelineConfig,
  opts: RunAllOptions,
): Promise<Array<TaskState & { resumed: boolean }>> {
  const log = cfg.log ?? (() => {});
  const producer: TaskState['mode'] = cfg.scriptsFrom ? 'scripts-from' : cfg.agent ? 'llm' : 'passthrough';
  return mapPool(tasks, opts.workers, async (task, i) => {
    const prev = readTaskState(cfg.runDir, task.id);
    const candidate = candidatePath(cfg.runDir, task.id);
    const invalidResumeCandidate = prev?.status === 'valid' && (!prev.candidateSha256 || candidateDigest(candidate) !== prev.candidateSha256);
    if (isFinished(prev, { retryFailed: opts.retryFailed, mode: producer }) && !invalidResumeCandidate) {
      log(`[${i + 1}/${tasks.length}] ${task.id} ${prev!.status} (resumed, skipped)`);
      return { ...prev!, resumed: true };
    }
    if (invalidResumeCandidate) log(`[${i + 1}/${tasks.length}] ${task.id} submission STEP missing or changed; rerunning`);
    const state = await runTask(task, cfg);
    if (state.status === 'valid') {
      const digest = candidateDigest(candidate);
      if (digest) state.candidateSha256 = digest;
      else { state.status = 'infra_error'; state.error = 'valid candidate is missing or unreadable'; }
    }
    writeTaskState(cfg.runDir, state);
    log(
      `[${i + 1}/${tasks.length}] ${task.id} ${task.type} ${state.status}${state.fallback ? ' (passthrough fallback)' : ''} ` +
        `${(state.wallMs / 1000).toFixed(1)}s${state.error ? ` — ${state.error}` : ''}`,
    );
    return { ...state, resumed: false };
  });
}
