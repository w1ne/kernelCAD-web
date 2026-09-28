// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/benchmarks/cadgenbench/pipeline.ts
//
// One CADGenBench task → one `output.step` candidate.
//
//   generation: drawing image(s) → LLM writes a .kcad.ts → gate → STEP
//   editing:    input.step (+ inspect_step summary + renders) → LLM writes a
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

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runClosedLoop } from '../../../src/agent/loop/closedLoop.js';
import type { GateReport, GateRunner, GateVerdict, LoopMessage } from '../../../src/agent/loop/types.js';
import { buildRepairPrompt } from '../../../src/agent/loop/repairPrompt';
import { repairScriptTool } from '../../../src/agent/mcp/tools/repairScript';
import { inspectStepTool } from '../../../src/agent/mcp/tools/inspectStep';
import { exportStep } from '../../oracle/kernelcad-client';
import { extractScript } from '../../lib';
import type { AgentClient, AgentImage, EvaluateResult } from '../../types';
import type { CadGenBenchTask } from './dataset';
import { EDIT_INPUT_NAME, editingPrompt, generationPrompt, loadImages } from './prompts';
import { candidatePath, taskSubmissionDir } from './submission';
import { isFinished, readTaskState, taskWorkDir, writeTaskState, type TaskState } from './state';
import { mapPool } from '../../lib/pool';
import { checkStepValidity, withOcctLock, type StepValidity } from './validity';

export const VALIDITY_GATE = 'cadgenbench-validity';

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
  temperature?: number;
  /** Directory of pre-written `<id>.kcad.ts` scripts; replaces the LLM step. */
  scriptsFrom?: string;
  /** Editing tasks the LLM cannot finish (or all of them, without a key) submit the input unchanged. */
  editFallback: 'none' | 'passthrough';
  /** Write a candidate that fails the pre-check instead of leaving the task missing. */
  keepInvalid: boolean;
  prices?: Prices;
  /** Test seams; default to the kernelCAD CLI and the in-process pre-check. */
  gate?: GateRunner;
  exportStep?: (scriptPath: string, outPath: string) => Promise<EvaluateResult>;
  precheck?: (stepPath: string) => Promise<StepValidity>;
  repair?: (scriptPath: string) => Promise<boolean>;
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
  /** First failing verdict of the last gate run for a script path. */
  lastFailure(scriptPath: string): GateVerdict | undefined;
  stepPathFor(scriptPath: string): string;
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
  const failures = new Map<string, GateVerdict>();
  const stepPathFor = (scriptPath: string) => scriptPath.replace(/(\.kcad)?\.ts$/, '.step');
  return {
    stepPathFor,
    lastValidity: (p) => validity.get(p),
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
    const report: GateReport = base ? await base.run(scriptPath) : { ok: true, verdicts: [] };
    if (!report.ok) return report;
    const stepPath = stepPathFor(scriptPath);
    if (existsSync(stepPath)) rmSync(stepPath);
    const exported = await exporter(scriptPath, stepPath);
    if (!exported.ok || !existsSync(stepPath)) {
      return { ok: false, verdicts: [...report.verdicts, ...verdictsFromExport(exported)] };
    }
    const v = await precheck(stepPath);
    validity.set(scriptPath, v);
    const verdicts = [...report.verdicts, verdictFromValidity(v)];
    return { ok: v.valid, verdicts };
  }
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
    extractScript,
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
function acceptCandidate(cfg: PipelineConfig, task: CadGenBenchTask, stepPath: string, v: StepValidity | undefined): TaskState['status'] {
  const valid = v?.valid === true;
  if (existsSync(stepPath) && (valid || cfg.keepInvalid)) {
    mkdirSync(taskSubmissionDir(cfg.runDir, task.id), { recursive: true });
    copyFileSync(stepPath, candidatePath(cfg.runDir, task.id));
  }
  return valid ? 'valid' : 'invalid';
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
  const gate = createCandidateGate(cfg);

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
    return s;
  };

  try {
    if (task.type === 'editing') copyFileSync(task.inputStep!, join(workDir, EDIT_INPUT_NAME));

    // 1. Produce a script: pre-written, LLM, or nothing.
    let passed = false;
    let produced = false;
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
        const inspected = await withOcctLock(() => inspectStepTool({ file: join(workDir, EDIT_INPUT_NAME) }));
        prompt = editingPrompt(task, inspected.ok ? inspected.report! : null);
      }
      writeFileSync(join(workDir, 'prompt.md'), prompt);
      const loop = await runLlmLoop(cfg, cfg.agent, gate, prompt, loadImages(task.images), scriptPath);
      writeFileSync(join(workDir, 'transcript.md'), loop.transcript.join('\n\n') + '\n');
      state.attempts = loop.attempts;
      state.tokensIn = loop.tokensIn;
      state.tokensOut = loop.tokensOut;
      produced = loop.scriptPath !== undefined;
      passed = loop.passed;
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

    // 3. Accept the gated candidate. An editing task without a valid one
    //    falls back to the unchanged input when asked to (always without an LLM).
    const checked = produced ? gate.lastValidity(scriptPath) : undefined;
    let status: TaskState['status'] | undefined;
    if (checked !== undefined) status = acceptCandidate(cfg, task, gate.stepPathFor(scriptPath), checked);
    const fallback =
      task.type === 'editing' && status !== 'valid' && (cfg.editFallback === 'passthrough' || (!cfg.agent && !cfg.scriptsFrom));
    if (fallback) {
      const fallbackPath = join(workDir, 'passthrough.kcad.ts');
      writeFileSync(fallbackPath, passthroughScript());
      await gate.run(fallbackPath);
      const v = gate.lastValidity(fallbackPath);
      const fbStatus = v ? acceptCandidate(cfg, task, gate.stepPathFor(fallbackPath), v) : 'failed';
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
    if (status !== undefined) return finish({ status });
    const why = gate.lastFailure(scriptPath);
    return finish({
      status: 'failed',
      error: produced
        ? `no candidate passed export${why ? ` — ${why.code ?? why.gate}: ${why.message.slice(0, 200)}` : ''}`
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
    if (isFinished(prev, { retryFailed: opts.retryFailed, mode: producer })) {
      log(`[${i + 1}/${tasks.length}] ${task.id} ${prev!.status} (resumed, skipped)`);
      return { ...prev!, resumed: true };
    }
    const state = await runTask(task, cfg);
    writeTaskState(cfg.runDir, state);
    log(
      `[${i + 1}/${tasks.length}] ${task.id} ${task.type} ${state.status}${state.fallback ? ' (passthrough fallback)' : ''} ` +
        `${(state.wallMs / 1000).toFixed(1)}s${state.error ? ` — ${state.error}` : ''}`,
    );
    return { ...state, resumed: false };
  });
}
