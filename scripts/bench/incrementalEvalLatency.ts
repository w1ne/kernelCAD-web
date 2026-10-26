#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Task 0 of the multi-agent collaboration plan: measure how long one
// single-parameter edit takes through the three evaluation paths the change-set
// queue can choose from.
//
//   npx tsx scripts/bench/incrementalEvalLatency.ts [--json]
//
// Modes per edit:
//   capture     — re-run the script to capture records (no lowering)
//   full        — buildModel from source (every record lowered)
//   incremental — rebuildModelIncremental against the previous build
//   paramUpdate — session.params.update on an already-built model
//
// The plan's decision gate reads the p95 of `incremental`.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildModel, rebuildModelIncremental, type BuiltModel } from '../../src/modeling/buildModel';
import { runScript } from '../../src/modeling/runtime/runScript';
import { setParamValue } from '../../src/modeling/edits/setParamValue';
import type { ParamEntry } from '../../src/shared/runtime/paramTable';
import { lazyTs as ts } from '../../src/shared/runtime/lazyTypescript';
import type * as TS from 'typescript';

const EDITS_PER_MODEL = 20;
const SEED = 0x5eed_2026;

interface ModelSpec {
  name: string;
  file: string;
}

const MODELS: readonly ModelSpec[] = [
  { name: 'desktop-3axis-mates', file: 'examples/robot-arm/desktop-3axis-mates.kcad.ts' },
  { name: 'two-link-connector-arm', file: 'examples/assemblies/two-link-connector-arm.kcad.ts' },
  { name: 'functional-clevis-robot-hand', file: 'examples/robot-hand/functional-clevis-robot-hand.kcad.ts' },
  { name: 'mech40-01-plate-four-corner-holes', file: 'eval/tasks/mech40/01-plate-four-corner-holes/solution-expert.kcad.ts' },
  { name: 'mech40-15-shelled-enclosure', file: 'eval/tasks/mech40/15-shelled-enclosure/solution-expert.kcad.ts' },
];

type Mode = 'capture' | 'full' | 'incremental' | 'paramUpdate';

interface Edit {
  strategy: 'param' | 'literal';
  name: string;
  from: number;
  to: number;
  source: string;
}

/** Deterministic 32-bit PRNG so a rerun measures the same 20 edits. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function numericParams(entries: readonly ParamEntry[]): ParamEntry[] {
  return entries.filter((e) => e.type === 'number');
}

function changedValue(entry: ParamEntry, random: () => number): number {
  const current = typeof entry.value === 'number' ? entry.value : Number(entry.defaultValue);
  const spread = Math.max(Math.abs(current) * 0.12, 1);
  let next = current + (random() * 2 - 1) * spread;
  if (Math.abs(next - current) < 1e-6) next = current + spread;
  const min = entry.meta?.min;
  const max = entry.meta?.max;
  if (typeof min === 'number' && typeof max === 'number' && max > min) {
    next = Math.min(max, Math.max(min, next));
    if (Math.abs(next - current) < 1e-6) {
      next = current <= (min + max) / 2 ? Math.min(max, current + spread) : Math.max(min, current - spread);
    }
  }
  return Number(next.toFixed(4));
}

function literalEdits(source: string, random: () => number): Edit[] {
  const sourceFile = ts.createSourceFile('bench.kcad.ts', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const literals: { start: number; end: number; value: number }[] = [];
  const visit = (node: TS.Node): void => {
    if (ts.isNumericLiteral(node)) {
      const value = Number(node.text);
      if (Number.isFinite(value) && value !== 0) literals.push({ start: node.getStart(sourceFile), end: node.getEnd(), value });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (literals.length === 0) throw new Error('no numeric literal to edit');
  const edits: Edit[] = [];
  for (let i = 0; i < EDITS_PER_MODEL; i += 1) {
    const literal = literals[Math.floor(random() * literals.length)]!;
    const spread = Math.max(Math.abs(literal.value) * 0.1, 0.5);
    const to = Number((literal.value + (random() * 2 - 1) * spread).toFixed(3)) || literal.value + 1;
    const nextSource = `${source.slice(0, literal.start)}${to}${source.slice(literal.end)}`;
    edits.push({ strategy: 'literal', name: `literal@${literal.start}`, from: literal.value, to, source: nextSource });
  }
  return edits;
}

function paramEdits(source: string, entries: readonly ParamEntry[], random: () => number): Edit[] {
  const params = numericParams(entries);
  if (params.length === 0) return literalEdits(source, random);
  const edits: Edit[] = [];
  for (let i = 0; i < EDITS_PER_MODEL; i += 1) {
    const entry = params[Math.floor(random() * params.length)]!;
    const from = typeof entry.value === 'number' ? entry.value : Number(entry.defaultValue);
    const to = changedValue(entry, random);
    const rewritten = setParamValue(source, entry.name, to);
    if (!rewritten.ok || rewritten.new_code === undefined) {
      throw new Error(`setParamValue(${entry.name}) failed: ${rewritten.error ?? 'no code'}`);
    }
    edits.push({ strategy: 'param', name: entry.name, from, to, source: rewritten.new_code });
  }
  return edits;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index]!;
}

function summarize(samples: readonly number[]): { p50: number; p95: number; mean: number; n: number } {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    p50: Number(percentile(sorted, 50).toFixed(1)),
    p95: Number(percentile(sorted, 95).toFixed(1)),
    mean: Number((samples.reduce((a, b) => a + b, 0) / Math.max(samples.length, 1)).toFixed(1)),
    n: samples.length,
  };
}

async function timeOne(run: () => Promise<unknown> | unknown): Promise<{ ms: number; error?: string }> {
  const start = performance.now();
  try {
    await run();
    return { ms: performance.now() - start };
  } catch (err) {
    return { ms: performance.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

interface ModelResult {
  name: string;
  file: string;
  editStrategy: 'param' | 'literal';
  samples: Record<Mode, number[]>;
  failures: string[];
}

async function benchModel(spec: ModelSpec, random: () => number): Promise<ModelResult> {
  const file = resolve(spec.file);
  const source = readFileSync(file, 'utf8');
  const scriptDir = dirname(file);

  const warm = await buildModel({ code: source, fileName: file, scriptDir });
  const entries = warm.session.paramTable.list();
  const edits = paramEdits(source, entries, random);
  const strategy = edits[0]?.strategy ?? 'literal';

  const samples: Record<Mode, number[]> = { capture: [], full: [], incremental: [], paramUpdate: [] };
  const failures: string[] = [];

  let previousSource = source;
  let previousModel: BuiltModel = warm;
  let liveModel: BuiltModel = warm;

  for (const edit of edits) {
    // capture only — no lowering.
    const captured = await timeOne(async () => {
      await runScript({ code: edit.source, fileName: file, scriptDir });
    });
    samples.capture.push(captured.ms);
    if (captured.error !== undefined) failures.push(`capture:${edit.name}:${captured.error}`);

    // full rebuild of the edited source.
    let fullModel: BuiltModel | undefined;
    const full = await timeOne(async () => {
      fullModel = await buildModel({ code: edit.source, fileName: file, scriptDir });
      if (fullModel.diagnostics.some((d) => d.severity === 'error')) failures.push(`full:${edit.name}`);
    });
    samples.full.push(full.ms);
    if (full.error !== undefined) failures.push(`full:${edit.name}:${full.error}`);

    // today's incremental path against the previous build.
    const modelForIncremental = previousModel;
    const incremental = await timeOne(async () => {
      const next = await rebuildModelIncremental(modelForIncremental, {
        code: edit.source,
        fileName: file,
        scriptDir,
      });
      if (next.diagnostics.some((d) => d.severity === 'error')) failures.push(`incremental:${edit.name}`);
    });
    samples.incremental.push(incremental.ms);
    if (incremental.error !== undefined) failures.push(`incremental:${edit.name}:${incremental.error}`);

    // In-memory param update, only for declared number params.
    if (edit.strategy === 'param') {
      const target = liveModel;
      const updated = await timeOne(async () => {
        await target.session.params.update([{ name: edit.name, value: edit.to }]);
      });
      samples.paramUpdate.push(updated.ms);
      if (updated.error !== undefined) {
        failures.push(`paramUpdate:${edit.name}:${updated.error}`);
        // A failed update leaves the live session's caches suspect; rebuild it.
        try {
          liveModel = await buildModel({ code: edit.source, fileName: file, scriptDir });
        } catch {
          liveModel = target;
        }
      }
    }

    previousSource = edit.source;
    previousModel = fullModel ?? previousModel;
  }

  void previousSource;
  return { name: spec.name, file: spec.file, editStrategy: strategy, samples, failures };
}

async function main(): Promise<void> {
  const json = process.argv.includes('--json');
  const random = mulberry32(SEED);
  const results: ModelResult[] = [];

  for (const spec of MODELS) {
    if (!json) process.stderr.write(`bench ${spec.name} … `);
    const result = await benchModel(spec, random);
    results.push(result);
    if (!json) {
      const row = (['capture', 'full', 'incremental', 'paramUpdate'] as const)
        .map((mode) => `${mode} p50=${summarize(result.samples[mode]).p50}ms p95=${summarize(result.samples[mode]).p95}ms`)
        .join(' · ');
      process.stderr.write(`${row}\n`);
    }
  }

  const modes: Mode[] = ['capture', 'full', 'incremental', 'paramUpdate'];
  const overall: Record<string, { p50: number; p95: number; mean: number; n: number }> = {};
  for (const mode of modes) overall[mode] = summarize(results.flatMap((r) => r.samples[mode]));

  const report = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    seed: SEED,
    editsPerModel: EDITS_PER_MODEL,
    results: results.map((r) => ({
      name: r.name,
      file: r.file,
      editStrategy: r.editStrategy,
      metrics: Object.fromEntries(modes.map((mode) => [mode, summarize(r.samples[mode])])),
      failures: r.failures,
    })),
    overall,
  };

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write('\nmodel | mode | p50 ms | p95 ms | n\n');
  for (const result of results) {
    for (const mode of modes) {
      const s = summarize(result.samples[mode]);
      if (s.n > 0) process.stdout.write(`${result.name} | ${mode} | ${s.p50} | ${s.p95} | ${s.n}\n`);
    }
  }
  process.stdout.write('\noverall | mode | p50 ms | p95 ms | n\n');
  for (const mode of modes) {
    const s = overall[mode]!;
    if (s.n > 0) process.stdout.write(`all models | ${mode} | ${s.p50} | ${s.p95} | ${s.n}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
