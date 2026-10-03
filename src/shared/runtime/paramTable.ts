// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Param table — session-owned registry of declared symbolic parameters.
// See spec §E.5.
//
// A ParamTable maps canonical name → ParamEntry (value, type, defaults, meta).
// Validation enforced at declare AND at update (spec §G):
//   - Name matches FEATURE_NAME_REGEX (slice-2 reuse).
//   - Duplicate name = fatal.
//   - Numeric value within [min, max] when meta sets bounds.
//   - Type matches declared type.
//
// All errors fold under `feature.invalid-args` with discriminating hints
// (closed milestone-C catalog respected per discipline gate D-1).

import { FEATURE_NAME_REGEX } from '../intent/featureName';
import { invalidArgs } from '../intent/invalidArgs';

/** One minimal correct declaration, inline on every param message. */
const PARAM_EXAMPLE = "param('wallThickness', 3, { min: 1, max: 10, unit: 'mm' })";

export type ParamType = 'number' | 'boolean' | 'choice' | 'string';

export type ParamValue = number | boolean | string;

export interface ParamMetadata {
  min?: number;
  max?: number;
  description?: string;
  /** Required for `type: 'choice'`. The closed set of allowed string values. */
  choices?: string[];
  /** Optional for `type: 'string'`. Max character length. */
  maxLength?: number;
  /** Presentation only (the customizer panel); the kernel ignores these. */
  /** Readable name, e.g. "Plate width". Default: humanised from the name. */
  label?: string;
  /** Display unit, e.g. "mm" or "°". */
  unit?: string;
  /** Slider and arrow-key step for `type: 'number'`. */
  step?: number;
  /** Section the param is listed under, e.g. "Fasteners". */
  group?: string;
}

export interface ParamEntry {
  name: string;
  type: ParamType;
  value: ParamValue;
  defaultValue: ParamValue;
  meta?: ParamMetadata;
}

export interface SerializedParamEntry {
  name: string;
  type: ParamType;
  value: ParamValue;
  defaultValue: ParamValue;
  meta?: ParamMetadata;
}

export interface SerializedParamTable {
  // Keyed by canonical name; matches spec §E.9 schema-v3 envelope.
  [name: string]: SerializedParamEntry;
}

export class ParamTable {
  private entries = new Map<string, ParamEntry>();

  declare(
    name: string,
    type: ParamType,
    defaultValue: ParamValue,
    meta?: ParamMetadata,
  ): ParamEntry {
    if (!FEATURE_NAME_REGEX.test(name)) {
      invalidArgs({
        api: 'param(name, defaultValue, meta)',
        path: 'name',
        got: name,
        showType: typeof name !== 'string',
        requires:
          `a string matching ${FEATURE_NAME_REGEX.source} — start with a letter, then letters, digits, underscores or hyphens, max 32 chars (no spaces, dots or units in the name)`,
        example: PARAM_EXAMPLE,
      });
    }
    if (this.entries.has(name)) {
      invalidArgs({
        api: 'param(name, defaultValue, meta)',
        path: 'name',
        got: name,
        requires:
          `a name not already declared — '${name}' exists in this script; declare each param once and reuse the returned ParamRef, or read it back with the existing ref`,
        example: PARAM_EXAMPLE,
      });
    }
    assertTypeMatches(name, type, defaultValue);
    if (type === 'number') {
      assertWithinBounds(name, defaultValue as number, meta);
    }
    if (type === 'choice') {
      assertValidChoice(name, defaultValue as string, meta);
    }
    if (type === 'string') {
      assertWithinMaxLength(name, defaultValue as string, meta);
    }
    const entry: ParamEntry = {
      name,
      type,
      value: defaultValue,
      defaultValue,
      meta: meta ? { ...meta } : undefined,
    };
    this.entries.set(name, entry);
    return entry;
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  get(name: string): ParamEntry {
    const entry = this.entries.get(name);
    if (!entry) {
      invalidArgs({
        api: 'setParam(name, value)',
        path: 'name',
        got: name,
        requires:
          `the name of a param declared earlier in this script${this.entries.size === 0 ? ' (none are declared yet)' : ` — declared: ${[...this.entries.keys()].join(', ')}`}`,
        example: PARAM_EXAMPLE,
      });
    }
    return entry;
  }

  set(name: string, value: ParamValue): ParamEntry {
    const entry = this.get(name);
    assertTypeMatches(name, entry.type, value);
    if (entry.type === 'number') {
      assertWithinBounds(name, value as number, entry.meta);
    }
    if (entry.type === 'choice') {
      assertValidChoice(name, value as string, entry.meta);
    }
    if (entry.type === 'string') {
      assertWithinMaxLength(name, value as string, entry.meta);
    }
    entry.value = value;
    return entry;
  }

  list(): ParamEntry[] {
    return Array.from(this.entries.values()).map((e) => ({ ...e, meta: e.meta ? { ...e.meta } : undefined }));
  }

  size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  replaceWith(other: ParamTable): void {
    this.entries.clear();
    for (const entry of other.list()) {
      this.entries.set(entry.name, {
        name: entry.name,
        type: entry.type,
        value: entry.value,
        defaultValue: entry.defaultValue,
        meta: entry.meta ? { ...entry.meta } : undefined,
      });
    }
  }

  serialize(): SerializedParamTable {
    const out: SerializedParamTable = {};
    for (const entry of this.entries.values()) {
      out[entry.name] = {
        name: entry.name,
        type: entry.type,
        value: entry.value,
        defaultValue: entry.defaultValue,
        meta: entry.meta ? { ...entry.meta } : undefined,
      };
    }
    return out;
  }

  static deserialize(data: SerializedParamTable | undefined): ParamTable {
    const t = new ParamTable();
    if (!data) return t;
    for (const [name, entry] of Object.entries(data)) {
      // Bypass declare() to preserve current value (which may differ from default).
      t.entries.set(name, {
        name,
        type: entry.type,
        value: entry.value,
        defaultValue: entry.defaultValue,
        meta: entry.meta ? { ...entry.meta } : undefined,
      });
    }
    return t;
  }
}

function jsTypeOf(type: ParamType): 'number' | 'boolean' | 'string' {
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  return 'string'; // 'choice' and 'string' are both JS strings.
}

function assertTypeMatches(name: string, type: ParamType, value: ParamValue): void {
  const expected = jsTypeOf(type);
  if (typeof value !== expected) {
    invalidArgs({
      api: 'param(name, defaultValue, meta)',
      path: `param('${name}') value`,
      got: value,
      showType: true,
      requires: `a ${expected} — param '${name}' is declared as type '${type}'`,
      example: PARAM_EXAMPLE,
    });
  }
}

function assertValidChoice(name: string, value: string, meta: ParamMetadata | undefined): void {
  const choices = meta?.choices;
  if (!choices || choices.length === 0) {
    invalidArgs({
      api: 'param(name, defaultValue, { choices })',
      path: 'meta.choices',
      got: choices,
      showType: true,
      requires:
        `a non-empty array of the allowed strings — param '${name}' is a choice param, so the list of options is required`,
      example: "param('finish', 'matte', { choices: ['matte', 'gloss'] })",
    });
  }
  if (!choices.includes(value)) {
    invalidArgs({
      api: 'param(name, defaultValue, { choices })',
      path: `param('${name}') value`,
      got: value,
      requires: `one of the declared choices [${choices.join(', ')}]`,
      example: `param('${name}', '${choices[0]}', { choices: [${choices.map((c) => `'${c}'`).join(', ')}] })`,
    });
  }
}

function assertWithinMaxLength(name: string, value: string, meta: ParamMetadata | undefined): void {
  if (meta?.maxLength !== undefined && value.length > meta.maxLength) {
    invalidArgs({
      api: 'param(name, defaultValue, { maxLength })',
      path: `param('${name}') value`,
      got: value,
      requires: `a string of at most meta.maxLength = ${meta.maxLength} characters; this one is ${value.length}`,
      example: `param('${name}', 'abc', { maxLength: ${Math.max(meta.maxLength, value.length)} })`,
    });
  }
}

function assertWithinBounds(name: string, value: number, meta: ParamMetadata | undefined): void {
  if (!meta) return;
  // min > max makes every value invalid, so report the declaration itself
  // rather than the value — otherwise the agent keeps changing the value.
  if (meta.min !== undefined && meta.max !== undefined && meta.min > meta.max) {
    invalidArgs({
      api: 'param(name, defaultValue, { min, max })',
      path: `param('${name}') meta.min`,
      got: meta.min,
      requires:
        `meta.min ≤ meta.max — meta.max is ${meta.max}, so no value can satisfy this declaration; swap the two bounds`,
      unit: meta.unit,
      example: `param('${name}', ${meta.min}, { min: ${Math.min(meta.min, meta.max)}, max: ${Math.max(meta.min, meta.max)} })`,
    });
  }
  if (meta.min !== undefined && value < meta.min) {
    invalidArgs({
      api: 'param(name, defaultValue, { min, max })',
      path: `param('${name}') value`,
      got: value,
      requires: `a number ≥ meta.min = ${meta.min}${meta.max !== undefined ? ` and ≤ meta.max = ${meta.max}` : ''}`,
      unit: meta.unit,
      example: `param('${name}', ${meta.min}, { min: ${meta.min}${meta.max !== undefined ? `, max: ${meta.max}` : ''} })`,
    });
  }
  if (meta.max !== undefined && value > meta.max) {
    invalidArgs({
      api: 'param(name, defaultValue, { min, max })',
      path: `param('${name}') value`,
      got: value,
      requires: `a number ≤ meta.max = ${meta.max}${meta.min !== undefined ? ` and ≥ meta.min = ${meta.min}` : ''}`,
      unit: meta.unit,
      example: `param('${name}', ${meta.max}, { ${meta.min !== undefined ? `min: ${meta.min}, ` : ''}max: ${meta.max} })`,
    });
  }
}
