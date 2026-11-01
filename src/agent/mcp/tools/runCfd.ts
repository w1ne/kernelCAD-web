// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/runCfd.ts
//
// MCP `run_cfd` tool — "how much pressure does this duct cost me, and how
// much drag does this part see?" Steady incompressible flow through an
// external OpenFOAM (simpleFoam on a snappyHexMesh mesh) on the shape a
// script builds. Returns evidence, not a verdict: pressure drop, per-patch
// flow and mass balance, drag / lift, max velocity, the residual history
// with a convergence verdict, checkMesh quality, the Reynolds number with
// the turbulence model it implied, and a mid-plane velocity PNG.
//
// Long runs: the run directory is keyed by a hash of the generated case, so
// calling again with the same inputs returns the finished result or joins
// the live run instead of starting a second solver (kernel/cfd/job.ts).

import { isAbsolute, resolve } from 'node:path';
import { runCfdStudy, type RunCfdOptions, type RunCfdResult } from '../../../kernel/cfd/runCfd';
import { detectCfdToolchain, type CfdToolchain } from '../../../kernel/cfd/toolchain';
import type { CfdSummary } from '../../../kernel/cfd/types';
import { resolveRootId } from '../../../composition/buildModel';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { CfdStudyMetadata } from '../../../shared/intent/cfdStudyRecord';
import { findCfdStudies, selectCfdStudy, type FoundCfdStudy } from '../../../modeling/runtime/cfd/findCfdStudies';
import { runMcpScript } from '../runMcpScript';
import { lowerStudyShape } from './runFea';
import { inlineCfdFields, resolveCfdArgs, RUN_CFD_EXAMPLE } from './runCfdArgs';

export interface RunCfdInput {
  file?: string;
  code?: string;
  /** Declared study name, or an inline study object. */
  study?: string | Record<string, unknown>;
  output_dir?: string;
  /** Solver processes, 1..KERNELCAD_CFD_MAX_CORES (default 1; cap 2). */
  cores?: number;
  export_vtk?: boolean;
  preview?: boolean;
  mesh_timeout_ms?: number;
  solve_timeout_ms?: number;
  [field: string]: unknown;
}

export interface RunCfdOutput {
  ok: boolean;
  summary?: CfdSummary;
  images?: string[];
  out_dir?: string;
  artifacts?: RunCfdResult['artifacts'];
  /** 'finished': an identical earlier run; 'joined': waited on a live one. */
  reused?: 'finished' | 'joined';
  diagnostics?: CompilerDiagnostic[];
  toolchain?: { missing: readonly string[]; hint?: string };
  error?: string;
  errorCode?: string;
}

function unavailable(tc: CfdToolchain): RunCfdOutput {
  const message = `run_cfd: no OpenFOAM install found (${tc.missing.join(', ')}). No flow evidence was produced; this is not a pass. ${tc.hint ?? ''}`;
  return {
    ok: false,
    error: message,
    errorCode: 'cfd.solver.unavailable',
    toolchain: { missing: tc.missing, ...(tc.hint !== undefined ? { hint: tc.hint } : {}) },
    diagnostics: [{ target: 'export-occt', code: 'cfd.solver.unavailable', severity: 'error', message, hint: tc.hint ?? '' }],
  };
}

type Resolved = { ok: false; output: RunCfdOutput } | { ok: true; shapeId: string; metadata: CfdStudyMetadata; run: Awaited<ReturnType<typeof runMcpScript>> & { ok: true } };

const argError = (error: string, errorCode = 'feature.invalid-args'): Resolved => ({ ok: false, output: { ok: false, error, errorCode } });

/** The declared study the call means, or an error; undefined = inline only. */
function pickDeclared(studies: FoundCfdStudy[], name: string | undefined, inline: boolean): FoundCfdStudy | undefined | Resolved {
  const declared = !inline || name !== undefined ? selectCfdStudy(studies, name) : undefined;
  if (name !== undefined && declared === undefined) {
    return argError(`No cfdStudy named '${name}'. Declared: ${studies.map(s => s.metadata.name).join(', ') || 'none'}.`);
  }
  if (declared === undefined && !inline) {
    return argError(`The script declares no cfdStudy. Add shape.cfdStudy({ flow, ... }) or pass the study on the call: ${RUN_CFD_EXAMPLE}.`);
  }
  return declared;
}

async function resolveStudy(input: RunCfdInput): Promise<Resolved> {
  const fields = inlineCfdFields(input);
  const script = await runMcpScript(input);
  if (!script.ok) return { ok: false, output: script };
  const name = typeof input.study === 'string' ? input.study : undefined;
  const declared = pickDeclared(findCfdStudies(script.run.records), name, fields.flow !== undefined);
  if (declared !== undefined && 'ok' in declared) return declared;
  const args = resolveCfdArgs(declared?.metadata, fields);
  if (args.kind === 'error') return argError(args.error, args.errorCode);
  const run = script.run;
  const tailId = run.records.length > 0 ? run.records[run.records.length - 1].id : undefined;
  const shapeId = declared?.shapeId ?? resolveRootId(run.returnValue, tailId);
  if (shapeId === undefined) return argError(`run_cfd: the script returns no shape to analyse. Example: ${RUN_CFD_EXAMPLE}.`, 'export.no-shape');
  return { ok: true, shapeId, metadata: args.metadata, run: script };
}

function badNumber(input: RunCfdInput): RunCfdOutput | undefined {
  const c = input.cores;
  if (c !== undefined && !(Number.isInteger(c) && c >= 1)) {
    return { ok: false, error: `run_cfd: cores must be a positive integer; got ${JSON.stringify(c)}. Example: ${RUN_CFD_EXAMPLE}.`, errorCode: 'feature.invalid-args' };
  }
  return undefined;
}

function runOptions(input: RunCfdInput, outDir: string | undefined): Partial<RunCfdOptions> {
  const opts: Partial<RunCfdOptions> = {};
  if (outDir !== undefined) opts.outDir = outDir;
  if (input.cores !== undefined) opts.cores = input.cores;
  if (input.export_vtk === true) opts.exportVtk = true;
  if (input.preview === false) opts.preview = false;
  if (input.mesh_timeout_ms !== undefined) opts.meshTimeoutMs = input.mesh_timeout_ms;
  if (input.solve_timeout_ms !== undefined) opts.solveTimeoutMs = input.solve_timeout_ms;
  return opts;
}

function toOutput(r: RunCfdResult): RunCfdOutput {
  const firstError = r.diagnostics.find(d => d.severity === 'error')
    ?? (r.ok ? undefined : r.diagnostics.find(d => d.code === 'cfd.solve.not-converged'));
  const out: RunCfdOutput = { ok: r.ok, artifacts: r.artifacts, diagnostics: r.diagnostics };
  if (r.summary !== undefined) out.summary = r.summary;
  if (r.artifacts.previewPng !== undefined) out.images = [r.artifacts.previewPng];
  if (r.outDir !== undefined) out.out_dir = r.outDir;
  if (r.reused !== undefined) out.reused = r.reused === true ? 'finished' : 'joined';
  if (r.toolchain !== undefined) out.toolchain = r.toolchain;
  if (firstError !== undefined) {
    out.error = firstError.message;
    out.errorCode = firstError.code;
  }
  return out;
}

/** `run_cfd` MCP tool. */
export async function runCfdTool(input: RunCfdInput): Promise<RunCfdOutput> {
  const bad = badNumber(input);
  if (bad !== undefined) return bad;
  const tc = await detectCfdToolchain();
  if (!tc.ok) return unavailable(tc);
  const resolved = await resolveStudy(input);
  if (!resolved.ok) return resolved.output;
  const lowered = await lowerStudyShape(resolved.run.run, { shapeId: resolved.shapeId });
  if (!lowered.ok) {
    const { error, errorCode } = lowered.output;
    return { ok: false, ...(error !== undefined ? { error } : {}), ...(errorCode !== undefined ? { errorCode } : {}) };
  }
  const outDir = input.output_dir === undefined ? undefined : isAbsolute(input.output_dir) ? input.output_dir : resolve(input.output_dir);
  const r = await runCfdStudy(lowered.shape, resolved.metadata, {
    owner: resolved.shapeId,
    records: resolved.run.run.records,
    toolchain: tc,
    ...runOptions(input, outDir),
  });
  return toOutput(r);
}
