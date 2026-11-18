// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/runFlight.ts
//
// MCP `run_flight` tool — "how high does this rocket go, is it stable, and
// how fast does it come down?" Runs a declared `flightStudy` (or one passed
// on the call) against the lowered model: mass and CG from the parts,
// Barrowman CP and static margin, an RK4 point-mass trajectory with ISA
// atmosphere, rail and recovery. Returns the summary, a time series (JSON
// columns or CSV) and an animationView-compatible track.

import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { resolveRootId } from '../../../composition/buildModel';
import {
  flightAnimation,
  seriesCsv,
  seriesRows,
  SERIES_COLUMNS,
  type FlightAnimation,
  type FlightSummary,
  type FlightVehicle,
} from '../../../kernel/flight/runFlight';
import { normalizeFlightStudy } from '../../../kernel/flight/studySpec';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { findFlightStudies, selectFlightStudy, type FoundFlightStudy } from '../../../modeling/runtime/flight/flightBodies';
import { runFlightOnModel } from '../../../modeling/runtime/flight/runFlightGate';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { FlightStudyMetadata, FlightStudySpec } from '../../../shared/intent/flightStudyRecord';
import { isKernelError } from '../../../shared/intent/kernelError';
import { runMcpScript } from '../runMcpScript';

export const RUN_FLIGHT_EXAMPLE =
  "run_flight({ code: 'const r = cylinder(400, 21); return r;', motor: { thrustCurve: [[0, 0], [0.15, 30], [1.9, 12], [2.12, 0]], totalMassKg: 0.062, propellantKg: 0.03 }, " +
  "aero: { cd: 0.55, refDiameterMm: 42 }, launch: { railM: 1.5, siteAltitudeM: 120 }, recovery: [{ cd: 1.5, diameterMm: 450, deploy: 'apogee+1' }], dry_mass_kg: 0.285 })";

export interface RunFlightInput {
  file?: string;
  code?: string;
  /** Declared study name, or an inline study object. */
  study?: string | Record<string, unknown>;
  /** 'json' (default): columns + rows; 'csv': one CSV string; 'none'. */
  series?: 'json' | 'csv' | 'none';
  /** Series row spacing, s. Default 0.1. */
  sample_dt_s?: number;
  /** Animation playback speed-up. Default 1 (real time). */
  animation_speed?: number;
  /** Write flight.csv, summary.json and animation.json here. */
  output_dir?: string;
  [field: string]: unknown;
}

export interface RunFlightOutput {
  ok: boolean;
  summary?: FlightSummary;
  /** Mass / motor / stability when the trajectory could not run. */
  vehicle?: FlightVehicle;
  series?: { columns: readonly string[]; rows: number[][]; sample_dt_s: number } | { csv: string; sample_dt_s: number };
  animation?: FlightAnimation;
  files?: { csv: string; summary: string; animation: string };
  diagnostics?: CompilerDiagnostic[];
  error?: string;
  errorCode?: string;
}

/** Study field -> accepted call spellings. */
const FIELDS: ReadonlyArray<[keyof FlightStudySpec, readonly string[]]> = [
  ['motor', ['motor']],
  ['aero', ['aero']],
  ['launch', ['launch']],
  ['recovery', ['recovery']],
  ['dryMassKg', ['dry_mass_kg', 'dryMassKg']],
  ['cgFromNoseMm', ['cg_from_nose_mm', 'cgFromNoseMm']],
  ['minStabilityCal', ['min_stability_cal', 'minStabilityCal']],
  ['maxTimeS', ['max_time_s', 'maxTimeS']],
  ['dtS', ['dt_s', 'dtS']],
];

export function inlineFlightFields(input: Record<string, unknown>): Partial<FlightStudySpec> {
  const src = typeof input.study === 'object' && input.study !== null ? (input.study as Record<string, unknown>) : input;
  const out: Record<string, unknown> = {};
  for (const [field, keys] of FIELDS) {
    for (const k of keys) {
      if (src[k] !== undefined) { out[field] = src[k]; break; }
    }
  }
  return out as Partial<FlightStudySpec>;
}

/** Normalized metadata back to a spec, so call fields can override a declared study. */
export function flightSpecFromMetadata(m: FlightStudyMetadata): FlightStudySpec {
  return {
    name: m.name,
    motor: { ...m.motor, thrustCurve: m.motor.thrustCurve },
    aero: m.aero,
    launch: m.launch,
    recovery: m.recovery.map(r => ({
      cd: r.cd,
      diameterMm: r.diameterMm,
      deploy: r.deploy.kind === 'time' ? { atS: r.deploy.atS } : (`apogee+${r.deploy.delayS}` as const),
      inflateS: r.inflateS,
      separates: r.separates,
      ...(r.part !== undefined ? { part: r.part } : {}),
    })),
    ...(m.dryMassKg !== undefined ? { dryMassKg: m.dryMassKg } : {}),
    ...(m.cgFromNoseMm !== undefined ? { cgFromNoseMm: m.cgFromNoseMm } : {}),
    ...(m.minStabilityCal !== undefined ? { minStabilityCal: m.minStabilityCal } : {}),
    maxTimeS: m.maxTimeS,
    dtS: m.dtS,
  };
}

const err = (error: string, errorCode = 'feature.invalid-args'): RunFlightOutput => ({ ok: false, error, errorCode });

function checkOptions(input: RunFlightInput): RunFlightOutput | undefined {
  if (input.series !== undefined && !['json', 'csv', 'none'].includes(input.series)) {
    return err(`run_flight: series must be 'json', 'csv' or 'none'; got ${JSON.stringify(input.series)}.`);
  }
  for (const k of ['sample_dt_s', 'animation_speed'] as const) {
    const v = input[k];
    if (v !== undefined && !(typeof v === 'number' && Number.isFinite(v) && v > 0)) return err(`run_flight: ${k} must be a positive number; got ${JSON.stringify(v)}.`);
  }
  return undefined;
}

type ScriptRun = Extract<Awaited<ReturnType<typeof runMcpScript>>, { ok: true }>['run'];
type Resolved = { ok: true; study: FoundFlightStudy; metadata: FlightStudyMetadata } | { ok: false; output: RunFlightOutput };

/** The declared study the call means (merged with inline fields), or an error. */
function resolveStudy(run: ScriptRun, input: RunFlightInput): Resolved {
  const fields = inlineFlightFields(input);
  const inline = fields.motor !== undefined;
  const studies = findFlightStudies(run.records);
  const name = typeof input.study === 'string' ? input.study : undefined;
  const declared = !inline || name !== undefined ? selectFlightStudy(studies, name) : undefined;
  if (name !== undefined && declared === undefined) {
    return { ok: false, output: err(`run_flight: no flightStudy named '${name}'. Declared: ${studies.map(s => s.metadata.name).join(', ') || 'none'}.`) };
  }
  if (declared === undefined && !inline) {
    return { ok: false, output: err(`run_flight: the script declares no flightStudy. Add arm.flightStudy({ motor, aero, launch, recovery }) or pass the study on the call: ${RUN_FLIGHT_EXAMPLE}.`) };
  }
  let metadata: FlightStudyMetadata;
  try {
    const merged = { ...(declared !== undefined ? flightSpecFromMetadata(declared.metadata) : {}), ...fields } as FlightStudySpec;
    metadata = normalizeFlightStudy(merged, 'run_flight');
  } catch (e) {
    const message = isKernelError(e) || e instanceof Error ? e.message : String(e);
    return { ok: false, output: err(`${message} Full call example: ${RUN_FLIGHT_EXAMPLE}.`) };
  }
  return bindStudy(run, declared, metadata);
}

/** Attach the study's target: the declared one, else the script's assembly, else the returned shape. */
function bindStudy(run: ScriptRun, declared: FoundFlightStudy | undefined, metadata: FlightStudyMetadata): Resolved {
  if (declared !== undefined) {
    const assembly = declared.metadata.assembly;
    return { ok: true, study: declared, metadata: assembly !== undefined ? { ...metadata, assembly } : metadata };
  }
  const asm = [...run.session.assemblies.keys()];
  if (asm.length > 0) {
    const bound = { ...metadata, assembly: asm[asm.length - 1] };
    return { ok: true, study: { recordId: 'run_flight', metadata: bound }, metadata: bound };
  }
  const tailId = run.records.length > 0 ? run.records[run.records.length - 1].id : undefined;
  const shapeId = resolveRootId(run.returnValue, tailId);
  return { ok: true, study: { recordId: 'run_flight', ...(shapeId !== undefined ? { shapeId } : {}), metadata }, metadata };
}

async function writeFiles(dirIn: string, out: RunFlightOutput, rows: Parameters<typeof seriesCsv>[0], sampleS: number): Promise<RunFlightOutput['files']> {
  const dir = isAbsolute(dirIn) ? dirIn : resolve(dirIn);
  await mkdir(dir, { recursive: true });
  const files = { csv: join(dir, 'flight.csv'), summary: join(dir, 'summary.json'), animation: join(dir, 'animation.json') };
  await writeFile(files.csv, seriesCsv(rows, Math.min(sampleS, 0.01)));
  await writeFile(files.summary, JSON.stringify(out.summary, null, 2));
  await writeFile(files.animation, JSON.stringify(out.animation, null, 2));
  return files;
}

function seriesOutput(mode: RunFlightInput['series'], rows: Parameters<typeof seriesCsv>[0], sampleS: number): RunFlightOutput['series'] {
  if (mode === 'none') return undefined;
  if (mode === 'csv') return { csv: seriesCsv(rows, sampleS), sample_dt_s: sampleS };
  return { columns: SERIES_COLUMNS, rows: seriesRows(rows, sampleS), sample_dt_s: sampleS };
}

/** `run_flight` MCP tool. */
export async function runFlightTool(input: RunFlightInput): Promise<RunFlightOutput> {
  const bad = checkOptions(input);
  if (bad !== undefined) return bad;
  const script = await runMcpScript(input);
  if (!script.ok) return { ok: false, error: script.error, ...(script.errorCode !== undefined ? { errorCode: script.errorCode } : {}) };
  const run = script.run;
  const resolved = resolveStudy(run, input);
  if (!resolved.ok) return resolved.output;

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const lowered = await engine.run(run.records, { paramTable: run.paramTable });
  const r = runFlightOnModel({ records: run.records, shapes: lowered.shapes, assemblies: run.session.assemblies }, resolved.study, resolved.metadata);

  const firstError = r.diagnostics.find(d => d.severity === 'error');
  const out: RunFlightOutput = { ok: r.ok, diagnostics: r.diagnostics };
  if (firstError !== undefined) { out.error = firstError.message; out.errorCode = firstError.code; }
  if (r.summary === undefined) {
    if (r.vehicle !== undefined) out.vehicle = r.vehicle;
    return out;
  }
  out.summary = r.summary;
  const sampleS = input.sample_dt_s ?? 0.1;
  const series = seriesOutput(input.series, r.rows, sampleS);
  if (series !== undefined) out.series = series;
  out.animation = flightAnimation(r.summary, r.rows, resolved.metadata, { speed: input.animation_speed ?? 1 });
  if (input.output_dir !== undefined) out.files = await writeFiles(input.output_dir, out, r.rows, sampleS);
  return out;
}
