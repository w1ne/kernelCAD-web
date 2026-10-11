// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/addVariableSweep.ts
//
// MCP tool wrapper for `add_variable_sweep`. Normalises the argument shapes
// clients actually send, inserts a `variableSweep(...)` binding into a
// .kcad.ts script, re-evaluates the result so the caller sees capture-time
// and kernel failures inline, and MEASURES the sweep it built (volume + bbox)
// so a sweep that silently produced nothing cannot read as a success.

import { addVariableSweep } from '../edits/addVariableSweep';
import type { AddVariableSweepInput, VariableSweepSectionInput } from '../edits/addVariableSweep';
import { evaluateScriptTool } from './evaluateScript';
import { runMcpScript } from '../runMcpScript';
import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export type { AddVariableSweepInput };

export interface AddVariableSweepOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  /** The swept solid as built: evidence the sweep is real geometry. */
  sweep?: { binding: string; volumeMm3: number; bbox: { min: number[]; max: number[] } };
  /** What the tool inferred or what the caller still has to do. */
  notes?: string[];
  error?: string;
  errorCode?: string;
}

/** Fold the argument names clients reach for onto the schema's own:
 *  `spine` (a binding name, or a point list), and per-section `profile`
 *  (a binding name) / `r` / `diameter`. */
export function normalizeVariableSweepArgs(raw: Record<string, unknown>): AddVariableSweepInput {
  const out: Record<string, unknown> = { ...raw };
  if (out.spine !== undefined && out.spine_binding === undefined && out.spine_points === undefined) {
    if (Array.isArray(out.spine)) out.spine_points = out.spine;
    else out.spine_binding = out.spine;
  }
  delete out.spine;
  if (Array.isArray(out.sections)) {
    out.sections = (out.sections as Array<Record<string, unknown>>).map((s) => normalizeSection(s));
  }
  return out as unknown as AddVariableSweepInput;
}

function normalizeSection(s: Record<string, unknown> | null | undefined): VariableSweepSectionInput {
  if (s === null || typeof s !== 'object') return s as unknown as VariableSweepSectionInput;
  const out: Record<string, unknown> = { ...s };
  if (out.profile_binding === undefined && typeof out.profile === 'string') out.profile_binding = out.profile;
  if (out.radius === undefined && typeof out.r === 'number') out.radius = out.r;
  if (out.radius === undefined && typeof out.diameter === 'number') out.radius = (out.diameter as number) / 2;
  for (const k of ['profile', 'r', 'diameter']) delete out[k];
  return out as VariableSweepSectionInput;
}

/** Lower the edited script and measure the sweep binding's own solid. */
async function measureSweep(code: string): Promise<AddVariableSweepOutput['sweep'] | undefined> {
  const script = await runMcpScript({ code });
  if (!script.ok) return undefined;
  const sweepRecord = [...script.run.records].reverse().find((r) => r.kind === 'variableSweep');
  if (sweepRecord === undefined) return undefined;
  const result = await new RecomputeEngine(createOcctLowerer(script.run.session)).run(script.run.records, {
    paramTable: script.run.paramTable,
  });
  const shape = result.shapes.get(sweepRecord.id);
  if (!(shape instanceof OcctBackend)) return undefined;
  const bb = shape.boundingBox();
  return { binding: '', volumeMm3: shape.volume(), bbox: { min: [...bb.min], max: [...bb.max] } };
}

/** True when the last top-level `return` line mentions the binding. */
function returnUses(code: string, binding: string): boolean {
  const returns = code.split('\n').filter((l) => /^\s*return\b/.test(l));
  const last = returns[returns.length - 1] ?? '';
  return new RegExp(`\\b${binding}\\b`).test(last);
}

export async function addVariableSweepTool(input: AddVariableSweepInput | Record<string, unknown>): Promise<AddVariableSweepOutput> {
  const edit = addVariableSweep(normalizeVariableSweepArgs(input as Record<string, unknown>));
  if (!edit.ok || !edit.new_code || edit.binding === undefined) {
    return { ok: false, error: edit.error, ...(edit.errorCode !== undefined ? { errorCode: edit.errorCode } : {}) };
  }
  const evalResult = await evaluateScriptTool({ code: edit.new_code });
  const notes = [...(edit.notes ?? [])];
  const measured = evalResult.ok ? await measureSweep(edit.new_code) : undefined;
  if (evalResult.ok && measured === undefined) {
    notes.push(`'${edit.binding}' evaluated without errors but built no solid; check the spine and profiles.`);
  }
  if (measured !== undefined && !returnUses(edit.new_code, edit.binding)) {
    notes.push(
      `'${edit.binding}' is declared but the script's return does not use it, so it is not part of the model yet: ` +
        `return it, or union it with add_feature ('${edit.binding}.union(...)').`,
    );
  }
  return {
    ok: evalResult.ok && measured !== undefined && measured.volumeMm3 > 0,
    new_code: edit.new_code,
    diagnostics: evalResult.diagnostics,
    ...(measured !== undefined ? { sweep: { ...measured, binding: edit.binding } } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
