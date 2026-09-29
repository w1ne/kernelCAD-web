// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pure logic behind the public-page model customizer: turn the script's
// declared `param()` table into controls, validate values that arrive from a
// shared link, write the current values back into the URL, bake values into
// the source for export, and name the download.

import { setParamValue } from '../../modeling/edits/setParamValue';
import type { ParamType, ParamValue, SerializedParamEntry } from '../../shared/runtime/paramTable';
import {
  guessUnit,
  humanizeParamName,
  looksLikeCount,
  sliderRange,
  sliderStep,
  type SliderRange,
} from './paramPresentation';

/** Presentation hints a saved project may carry next to its code
 *  (`projects.parameters`). The script's own declarations stay the source of
 *  truth for type, range and choices; a hint only adds a unit and a step. */
export interface CustomizerParamHint {
  name: string;
  unit?: string;
  step?: number;
  kind?: string;
}

export interface CustomizerParam {
  name: string;
  /** Readable name: the declared `label`, else humanised from `name`. */
  label: string;
  type: ParamType;
  /** The value declared in the saved source. Reset returns here. */
  defaultValue: ParamValue;
  /** Declared bounds. Values outside them are refused. */
  min?: number;
  max?: number;
  /** Numbers: the slider's travel. The declared bounds, or a range derived
   *  from the default where none is declared. Typing may go past a derived end. */
  range?: SliderRange;
  /** Numbers: slider and arrow-key step. */
  step?: number;
  unit?: string;
  group?: string;
  choices?: string[];
  maxLength?: number;
  description?: string;
}

export type CustomizerValues = Record<string, ParamValue>;

/** Query-string prefix for a configured value: `?p.Width=60`. */
export const URL_PARAM_PREFIX = 'p.';

export type CustomizerFormat = 'stl' | '3mf' | 'step';

export const CUSTOMIZER_FORMATS: readonly CustomizerFormat[] = ['stl', '3mf', 'step'];

function nonEmpty(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  return trimmed ? trimmed : undefined;
}

/** Declared step, then the project hint, then a step derived from the range. */
function numberStep(
  entry: SerializedParamEntry,
  hint: CustomizerParamHint | undefined,
  range: SliderRange,
): number {
  const declared = entry.meta?.step;
  if (typeof declared === 'number' && declared > 0) return declared;
  if (typeof hint?.step === 'number' && hint.step > 0) return hint.step;
  const isCount = hint?.kind === 'integer' || looksLikeCount(entry.name);
  return sliderStep(entry.defaultValue as number, range, isCount);
}

function addNumberPresentation(
  param: CustomizerParam,
  entry: SerializedParamEntry,
  hint: CustomizerParamHint | undefined,
): void {
  param.unit ??= guessUnit(entry.name);
  const range = sliderRange(entry.defaultValue as number, { min: param.min, max: param.max }, param.unit);
  param.range = range;
  param.step = numberStep(entry, hint, range);
}

function customizerParamFrom(entry: SerializedParamEntry, hint: CustomizerParamHint | undefined): CustomizerParam {
  const meta = entry.meta;
  const param: CustomizerParam = {
    name: entry.name,
    label: nonEmpty(meta?.label) ?? humanizeParamName(entry.name),
    type: entry.type,
    defaultValue: entry.defaultValue,
  };
  if (typeof meta?.min === 'number') param.min = meta.min;
  if (typeof meta?.max === 'number') param.max = meta.max;
  if (meta?.choices) param.choices = [...meta.choices];
  if (typeof meta?.maxLength === 'number') param.maxLength = meta.maxLength;
  if (meta?.description) param.description = meta.description;
  const unit = nonEmpty(meta?.unit) ?? nonEmpty(hint?.unit);
  if (unit) param.unit = unit;
  const group = nonEmpty(meta?.group);
  if (group) param.group = group;
  if (entry.type === 'number') addNumberPresentation(param, entry, hint);
  return param;
}

/** Build one control description per declared parameter, in declaration order. */
export function customizerParamsFrom(
  entries: readonly SerializedParamEntry[],
  hints: readonly CustomizerParamHint[] = [],
): CustomizerParam[] {
  const hintByName = new Map(hints.map((hint) => [hint.name, hint]));
  return entries.map((entry) => customizerParamFrom(entry, hintByName.get(entry.name)));
}

export function defaultValues(params: readonly CustomizerParam[]): CustomizerValues {
  return Object.fromEntries(params.map((param) => [param.name, param.defaultValue]));
}

export type ValueCheck = { ok: true; value: ParamValue } | { ok: false; reason: string };

function checkNumber(param: CustomizerParam, value: ParamValue): ValueCheck {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, reason: 'not a number' };
  if (param.min !== undefined && value < param.min) return { ok: false, reason: `below ${param.min}` };
  if (param.max !== undefined && value > param.max) return { ok: false, reason: `above ${param.max}` };
  return { ok: true, value };
}

function checkString(param: CustomizerParam, value: ParamValue): ValueCheck {
  if (typeof value !== 'string') return { ok: false, reason: 'not text' };
  if (param.maxLength !== undefined && value.length > param.maxLength) {
    return { ok: false, reason: `longer than ${param.maxLength} characters` };
  }
  return { ok: true, value };
}

const VALUE_CHECKS: Record<ParamType, (param: CustomizerParam, value: ParamValue) => ValueCheck> = {
  number: checkNumber,
  boolean: (_param, value) => (typeof value === 'boolean' ? { ok: true, value } : { ok: false, reason: 'not true/false' }),
  choice: (param, value) => (typeof value === 'string' && (param.choices ?? []).includes(value)
    ? { ok: true, value }
    : { ok: false, reason: 'not one of the options' }),
  string: checkString,
};

/** Check a typed value against its declaration (type, range, choices, length). */
export function checkParamValue(param: CustomizerParam, value: ParamValue): ValueCheck {
  const check = VALUE_CHECKS[param.type];
  return check ? check(param, value) : { ok: false, reason: 'unsupported type' };
}

/** Parse the raw text of a URL value into the declared type, then validate it. */
export function parseParamValue(param: CustomizerParam, raw: string): ValueCheck {
  if (param.type === 'number') {
    const trimmed = raw.trim();
    const value = trimmed === '' ? Number.NaN : Number(trimmed);
    return checkParamValue(param, value);
  }
  if (param.type === 'boolean') {
    if (raw === 'true' || raw === '1') return { ok: true, value: true };
    if (raw === 'false' || raw === '0') return { ok: true, value: false };
    return { ok: false, reason: 'not true/false' };
  }
  return checkParamValue(param, raw);
}

export interface UrlValues {
  /** Valid values from the URL, keyed by param name. */
  values: CustomizerValues;
  /** One line per ignored URL value: unknown name or invalid value. */
  ignored: string[];
}

/** Read `p.<name>=<value>` pairs from a query string. */
export function readUrlValues(search: string, params: readonly CustomizerParam[]): UrlValues {
  const byName = new Map(params.map((param) => [param.name, param]));
  const values: CustomizerValues = {};
  const ignored: string[] = [];
  for (const [key, raw] of new URLSearchParams(search)) {
    if (!key.startsWith(URL_PARAM_PREFIX)) continue;
    const name = key.slice(URL_PARAM_PREFIX.length);
    const param = byName.get(name);
    if (!param) {
      ignored.push(`${name}: no such parameter`);
      continue;
    }
    const parsed = parseParamValue(param, raw);
    if (parsed.ok) values[name] = parsed.value;
    else ignored.push(`${name}=${raw}: ${parsed.reason}`);
  }
  return { values, ignored };
}

/** Return `search` with every `p.*` key replaced by the non-default values.
 *  Other query keys (version, mode, …) stay as they are. */
export function writeUrlValues(
  search: string,
  params: readonly CustomizerParam[],
  values: CustomizerValues,
): string {
  const query = new URLSearchParams(search);
  for (const key of [...query.keys()]) {
    if (key.startsWith(URL_PARAM_PREFIX)) query.delete(key);
  }
  for (const param of params) {
    const value = values[param.name];
    if (value === undefined || value === param.defaultValue) continue;
    query.set(`${URL_PARAM_PREFIX}${param.name}`, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

/** The values that differ from their declared default. */
export function changedValues(params: readonly CustomizerParam[], values: CustomizerValues): CustomizerValues {
  const out: CustomizerValues = {};
  for (const param of params) {
    const value = values[param.name];
    if (value !== undefined && value !== param.defaultValue) out[param.name] = value;
  }
  return out;
}

/** Write every value into its `param()` default in the source. Export has no
 *  override channel, so the configured source IS the configuration. */
export function bakeParamValues(code: string, values: CustomizerValues): string {
  let next = code;
  for (const [name, value] of Object.entries(values)) {
    const edit = setParamValue(next, name, value);
    if (!edit.ok || edit.new_code === undefined) {
      throw new Error(edit.error ?? `param '${name}' could not be set`);
    }
    next = edit.new_code;
  }
  return next;
}

function fileSafe(text: string): string {
  return text.replace(/[^A-Za-z0-9.-]+/g, '_').replace(/^_+|_+$/g, '');
}

function formatSummaryValue(value: ParamValue): string {
  if (typeof value === 'number') return String(Number(value.toFixed(4)));
  return String(value);
}

const MAX_SUMMARY_LENGTH = 80;

/** `<slug>-<changed params>.<ext>`, e.g. `bracket-Width60_HasLidfalse.stl`.
 *  All-default configurations read `<slug>-default.<ext>`. */
export function downloadFileName(
  slug: string,
  params: readonly CustomizerParam[],
  values: CustomizerValues,
  format: CustomizerFormat,
): string {
  const parts = params
    .filter((param) => values[param.name] !== undefined && values[param.name] !== param.defaultValue)
    .map((param) => fileSafe(`${param.name}${formatSummaryValue(values[param.name])}`))
    .filter((part) => part.length > 0);
  const summary = (parts.join('_') || 'default').slice(0, MAX_SUMMARY_LENGTH);
  const base = fileSafe(slug) || 'model';
  return `${base}-${summary}.${format}`;
}
