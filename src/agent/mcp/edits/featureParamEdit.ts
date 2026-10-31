// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Edit one feature's numeric parameters in place, by feature id.
//
// `set_param` rewrites a `param()` default. Most features take literals
// instead (`cylinder(t + 2, 4)`, `.fillet(1)`), and the agent then has to
// find and rewrite the right argument by hand. Here the captured feature
// record names its call site (`FeatureRecord.scriptLocation`); the TypeScript
// syntax tree turns that into the argument to rewrite: a property of an
// options object literal with the parameter's name, else the positional
// argument at the parameter's index.
//
// Every rewrite is checked by capturing the edited script again: the feature
// must now report the requested value, and its other parameters must not
// move. A rewrite that fails that check is never returned, so a wrong guess
// about argument order cannot reach the caller as a plausible edit.

import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import { runMcpScript } from '../runMcpScript';
import { ScriptSpanIndex, type CharRange } from '../../repair/scriptSpans';

export interface FeatureParamEdit {
  param: string;
  before: number;
  after: number;
  unit: string;
  /** Source text of the argument before and after the rewrite. */
  sourceBefore: string;
  sourceAfter: string;
  /** 1-based line of the rewritten argument. */
  line: number;
}

export interface FeatureParamChange {
  feature: string;
  param: string;
  before: number;
  after: number;
}

export type FeatureParamEditPlan =
  | {
      ok: true;
      new_code: string;
      feature: string;
      kind: string;
      edits: FeatureParamEdit[];
      /** Every feature whose captured parameters differ after the edit:
       *  the target, plus any feature built by the same call site (a loop
       *  or helper function). */
      changedParams: FeatureParamChange[];
    }
  | { ok: false; error: string; errorCode: string; hint?: string };

const TOLERANCE = 1e-9;

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Shortest literal that round-trips the value (no 6.6000000000000005). */
export function formatNumberLiteral(value: number): string {
  return String(Number(value.toPrecision(12)));
}

async function capture(code: string): Promise<{ ok: true; records: FeatureRecord[] } | { ok: false; error: string; errorCode: string }> {
  const run = await runMcpScript({ code });
  if (!run.ok) return { ok: false, error: run.error, errorCode: run.errorCode ?? 'cli.script-exception' };
  return { ok: true, records: run.run.records as FeatureRecord[] };
}

function replaceChars(code: string, range: CharRange, text: string): string {
  return code.slice(0, range.start) + text + code.slice(range.end);
}

/** Argument ranges that could hold `param`, most specific first. */
function candidateRanges(spans: ScriptSpanIndex, record: FeatureRecord, param: string): CharRange[] {
  const call = record.scriptLocation === undefined ? undefined : spans.callNodeAt(record.scriptLocation);
  if (call === undefined) return [];
  const out: CharRange[] = [];
  for (let i = 0; i < call.arguments.length; i++) {
    const option = spans.optionValueChars(call, i, param);
    if (option !== undefined) out.push(option);
  }
  const index = Object.keys(record.params).indexOf(param);
  const positional = index >= 0 ? spans.argumentChars(call, index) : undefined;
  if (positional !== undefined) {
    const text = spans.text.slice(positional.start, positional.end).trim();
    // An options object is not the value itself.
    if (!text.startsWith('{') && !out.some((r) => r.start === positional.start)) out.push(positional);
  }
  return out;
}

function changedParams(before: FeatureRecord[], after: FeatureRecord[]): FeatureParamChange[] {
  const byId = new Map(before.map((r) => [r.id, r]));
  const out: FeatureParamChange[] = [];
  for (const record of after) {
    const prior = byId.get(record.id);
    if (prior === undefined) continue;
    for (const [name, p] of Object.entries(record.params)) {
      const old = prior.params[name];
      if (old !== undefined && !near(old.evaluated, p.evaluated)) {
        out.push({ feature: record.id, param: name, before: old.evaluated, after: p.evaluated });
      }
    }
  }
  return out;
}

type Failure = Extract<FeatureParamEditPlan, { ok: false }>;

function invalidChanges(changes: Record<string, unknown>): Failure | undefined {
  const entries = Object.entries(changes);
  if (entries.length === 0) {
    return { ok: false, errorCode: 'feature.invalid-args', error: 'changes must name at least one parameter, e.g. { r: 3.3 }.' };
  }
  for (const [name, value] of entries) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { ok: false, errorCode: 'feature.invalid-args', error: `changes.${name} must be a finite number (got ${JSON.stringify(value)}).` };
    }
  }
  return undefined;
}

function findTarget(records: FeatureRecord[], feature: string): FeatureRecord | Failure {
  const target = records.find((r) => r.id === feature);
  if (target === undefined) {
    const ids = records.map((r) => r.id);
    return {
      ok: false,
      errorCode: 'feature.not-found',
      error: `feature '${feature}' is not in this script.`,
      hint: `Feature ids: ${ids.slice(0, 40).join(', ')}${ids.length > 40 ? ', …' : ''}. inspect({ of: 'features' }) lists them with their parameters.`,
    };
  }
  if (target.scriptLocation === undefined) {
    return {
      ok: false,
      errorCode: 'feature.edit.no-call-site',
      error: `feature '${feature}' has no recorded call site, so its arguments cannot be located in the source.`,
      hint: 'Edit the source directly, or drive the value with param() and use set_param.',
    };
  }
  return target;
}

/** Refuse a parameter the feature lacks, or one a param() drives. */
function uneditableParam(record: FeatureRecord, name: string): Failure | undefined {
  const param = record.params[name];
  if (param === undefined) {
    return {
      ok: false,
      errorCode: 'feature.edit.unknown-param',
      error: `feature '${record.id}' (${record.kind}) has no parameter '${name}'.`,
      hint: `Its parameters: ${Object.keys(record.params).join(', ') || 'none'}.`,
    };
  }
  if (param.paramRef === undefined) return undefined;
  const ref = typeof param.paramRef === 'string' ? param.paramRef : undefined;
  return {
    ok: false,
    errorCode: 'feature.edit.param-driven',
    error: `'${record.id}'.${name} is driven by ${ref ? `param('${ref}')` : 'a param() expression'}; editing it here would detach it from that parameter.`,
    hint: ref
      ? `Use set_param({ code, param_name: '${ref}', new_value: … }) to change it everywhere it is used.`
      : 'Change the param() it derives from with set_param.',
  };
}

/** The feature reports `value` for `name`, and its other parameters held. */
function rewriteHeld(before: FeatureRecord, after: FeatureRecord, name: string, value: number): boolean {
  const got = after.params[name];
  if (got === undefined || !near(got.evaluated, value)) return false;
  return Object.entries(before.params).every(([other, p]) =>
    other === name || (after.params[other] !== undefined && near(after.params[other].evaluated, p.evaluated)));
}

type AppliedStep = { code: string; record: FeatureRecord; edit: FeatureParamEdit };

/** Rewrite one parameter; the first candidate argument whose rewrite verifies wins. */
async function applyOne(code: string, record: FeatureRecord, name: string, value: number): Promise<AppliedStep | Failure> {
  const refused = uneditableParam(record, name);
  if (refused !== undefined) return refused;
  const spans = ScriptSpanIndex.parse(code);
  const literal = formatNumberLiteral(value);
  const param = record.params[name]!;
  for (const range of candidateRanges(spans, record, name)) {
    const revised = replaceChars(code, range, literal);
    const check = await capture(revised);
    const after = check.ok ? check.records.find((r) => r.id === record.id && r.kind === record.kind) : undefined;
    if (after === undefined || !rewriteHeld(record, after, name, value)) continue;
    return {
      code: revised,
      record: after,
      edit: {
        param: name,
        before: param.evaluated,
        after: value,
        unit: param.unit,
        sourceBefore: code.slice(range.start, range.end),
        sourceAfter: literal,
        line: spans.lineOf(range.start),
      },
    };
  }
  return {
    ok: false,
    errorCode: 'feature.edit.unmapped-param',
    error: `could not find the source argument for '${record.id}'.${name}: no rewrite of its call made the feature report ${literal} while keeping its other parameters.`,
    hint: 'Edit that call in the source directly, or put the value behind param() and use set_param.',
  };
}

/**
 * Plan the rewrite of `feature`'s parameters to `changes`. Pure with respect
 * to sessions and files: it captures the script (no geometry build) and
 * returns the revised source.
 */
export async function planFeatureParamEdit(input: {
  code: string;
  feature: string;
  changes: Record<string, unknown>;
}): Promise<FeatureParamEditPlan> {
  const changes = input.changes ?? {};
  const invalid = invalidChanges(changes);
  if (invalid !== undefined) return invalid;

  const baseline = await capture(input.code);
  if (!baseline.ok) return baseline;
  const target = findTarget(baseline.records, input.feature);
  if ('ok' in target) return target;

  let code = input.code;
  let current = target;
  const edits: FeatureParamEdit[] = [];
  for (const [name, value] of Object.entries(changes)) {
    const step = await applyOne(code, current, name, value as number);
    if ('ok' in step) return step;
    code = step.code;
    current = step.record;
    edits.push(step.edit);
  }

  const final = await capture(code);
  if (!final.ok) return final;
  return {
    ok: true,
    new_code: code,
    feature: target.id,
    kind: target.kind,
    edits,
    changedParams: changedParams(baseline.records, final.records),
  };
}
