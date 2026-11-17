// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Named configurations are a file-level contract: one `configurations({ ... })`
// literal of parameter overrides. `assembly.instance` type-checks a named set
// against the part's `param()` declarations, rewrites those defaults, and
// evaluates the part in a fresh parameter table. Nothing here touches the
// filesystem except the evaluate-cache identity, which goes through the host
// filesystem port.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import { FEATURE_NAME_REGEX } from '../../shared/intent/featureName';
import { getHostFs } from '../../shared/runtime/hostFs';
import { normalizeColor } from '../../shared/runtime/paramColor';
import {
  parseParamDeclaration,
  setParamValue,
  type ParamDeclaration,
} from '../edits/setParamValue';

export type ConfigValue = number | boolean | string;

export interface ConfigurationSet {
  readonly name: string;
  readonly values: Readonly<Record<string, ConfigValue>>;
}

const CONFIG_EXAMPLE = "configurations({ compact: { length: 80, width: 50 } })";
const INSTANCE_EXAMPLE = "arm.instance('block', { source: './part.kcad.ts', configuration: 'compact' })";

function fail(path: string, got: unknown, requires: string, hintSlug: string, example = CONFIG_EXAMPLE): never {
  invalidArgs({
    api: 'configurations(sets)',
    path,
    got,
    showType: true,
    requires,
    example,
    hintSlug,
  });
}

/** Walk source, skipping comments and string literals. */
class SourceCursor {
  private readonly code: string;
  private i: number;

  constructor(code: string, i = 0) {
    this.code = code;
    this.i = i;
  }

  get pos(): number { return this.i; }
  get done(): boolean { return this.i >= this.code.length; }
  peek(offset = 0): string { return this.code[this.i + offset] ?? ''; }
  startsWith(text: string): boolean { return this.code.startsWith(text, this.i); }
  prev(): string { return this.i === 0 ? '' : (this.code[this.i - 1] ?? ''); }
  advance(count = 1): void { this.i += count; }
  slice(from: number): string { return this.code.slice(from, this.i); }
  rest(): string { return this.code.slice(this.i); }

  skipTrivia(): void {
    for (;;) {
      while (this.i < this.code.length && /\s/.test(this.peek())) this.i += 1;
      if (this.startsWith('//')) {
        const nl = this.code.indexOf('\n', this.i);
        this.i = nl < 0 ? this.code.length : nl + 1;
        continue;
      }
      if (this.startsWith('/*')) {
        const end = this.code.indexOf('*/', this.i + 2);
        this.i = end < 0 ? this.code.length : end + 2;
        continue;
      }
      return;
    }
  }
}

function isIdentChar(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch);
}

function findCallSites(code: string, name: string): number[] {
  const cursor = new SourceCursor(code);
  const sites: number[] = [];
  const needle = `${name}(`;
  while (!cursor.done) {
    cursor.skipTrivia();
    if (cursor.done) break;
    const quote = cursor.peek();
    if (quote === '"' || quote === "'" || quote === '`') {
      skipString(cursor);
      continue;
    }
    if (cursor.startsWith(needle) && !isIdentChar(cursor.prev())) {
      sites.push(cursor.pos);
      cursor.advance(needle.length);
      continue;
    }
    cursor.advance(1);
  }
  return sites;
}

function skipString(cursor: SourceCursor): void {
  const quote = cursor.peek();
  cursor.advance(1);
  while (!cursor.done) {
    if (cursor.peek() === '\\') { cursor.advance(2); continue; }
    if (cursor.peek() === quote) { cursor.advance(1); return; }
    cursor.advance(1);
  }
}

function decodeString(cursor: SourceCursor): string {
  const quote = cursor.peek();
  if (quote !== '"' && quote !== "'" && quote !== '`') {
    fail('value', cursor.peek(), 'a number, boolean, or quoted string literal', 'invalid-args.assembly.configuration-syntax');
  }
  const start = cursor.pos;
  cursor.advance(1);
  let out = '';
  while (!cursor.done) {
    const ch = cursor.peek();
    if (ch === '\\') {
      const esc = cursor.peek(1);
      const decoded: Record<string, string> = { n: '\n', r: '\r', t: '\t', '\\': '\\', "'": "'", '"': '"', '`': '`' };
      out += decoded[esc] ?? esc;
      cursor.advance(2);
      continue;
    }
    if (ch === quote) {
      cursor.advance(1);
      if (quote === '`' && out.includes('${')) {
        fail('value', cursor.slice(start), 'a literal without ${} interpolation', 'invalid-args.assembly.configuration-syntax');
      }
      return out;
    }
    out += ch;
    cursor.advance(1);
  }
  fail('value', cursor.slice(start), 'a closed string literal', 'invalid-args.assembly.configuration-syntax');
}

function readNumberFrom(cursor: SourceCursor): number | undefined {
  const m = /^-?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?/.exec(cursor.rest());
  if (!m) return undefined;
  const n = Number(m[0]);
  if (!Number.isFinite(n)) return undefined;
  cursor.advance(m[0].length);
  return n;
}

function readWord(cursor: SourceCursor, word: string): boolean {
  if (!cursor.startsWith(word) || isIdentChar(cursor.peek(word.length))) return false;
  cursor.advance(word.length);
  return true;
}

function readKey(cursor: SourceCursor): string {
  cursor.skipTrivia();
  const quote = cursor.peek();
  if (quote === '"' || quote === "'") return decodeString(cursor);
  const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(cursor.rest());
  if (!m) fail('name', cursor.peek() || 'end of source', 'an identifier or a quoted name', 'invalid-args.assembly.configuration-syntax');
  cursor.advance(m[0].length);
  return m[0];
}

function assertFeatureName(name: string, path: string): void {
  if (FEATURE_NAME_REGEX.test(name)) return;
  fail(path, name, `a name matching ${FEATURE_NAME_REGEX.source}`, 'invalid-args.assembly.configuration-syntax');
}

/** Nested object produced by the configuration literal parser. */
interface ParsedObject {
  [key: string]: ConfigValue | ParsedObject;
}

function parseValue(cursor: SourceCursor): ConfigValue | ParsedObject {
  cursor.skipTrivia();
  if (cursor.peek() === '{') return parseObject(cursor);
  const quote = cursor.peek();
  if (quote === '"' || quote === "'" || quote === '`') return decodeString(cursor);
  if (readWord(cursor, 'true')) return true;
  if (readWord(cursor, 'false')) return false;
  const n = readNumberFrom(cursor);
  if (n !== undefined) return n;
  fail('value', cursor.rest().slice(0, 40), 'a number, boolean, or string literal — expressions are not a configuration value', 'invalid-args.assembly.configuration-syntax');
}

function parseObject(cursor: SourceCursor): ParsedObject {
  cursor.skipTrivia();
  if (cursor.peek() !== '{') {
    fail('sets', cursor.peek() || 'end of source', 'an object literal of named parameter sets', 'invalid-args.assembly.configuration-syntax');
  }
  cursor.advance(1);
  const out: ParsedObject = {};
  for (;;) {
    cursor.skipTrivia();
    if (cursor.peek() === '}') { cursor.advance(1); return out; }
    const key = readKey(cursor);
    if (Object.hasOwn(out, key)) {
      fail(key, key, 'each name once in this object', 'invalid-args.assembly.configuration-syntax');
    }
    cursor.skipTrivia();
    if (cursor.peek() !== ':') fail(key, cursor.peek(), "a ':' after the name", 'invalid-args.assembly.configuration-syntax');
    cursor.advance(1);
    out[key] = parseValue(cursor);
    cursor.skipTrivia();
    if (cursor.peek() === ',') { cursor.advance(1); continue; }
    if (cursor.peek() === '}') { cursor.advance(1); return out; }
    fail(key, cursor.peek() || 'end of source', "',' or '}' after the value", 'invalid-args.assembly.configuration-syntax');
  }
}

function asConfigValues(name: string, value: ConfigValue | ParsedObject): Record<string, ConfigValue> {
  if (typeof value !== 'object' || value === null) {
    fail(name, value, 'an object of parameter literals', 'invalid-args.assembly.configuration-syntax');
  }
  const values: Record<string, ConfigValue> = {};
  for (const [param, raw] of Object.entries(value)) {
    assertFeatureName(param, `${name}.${param}`);
    if (typeof raw === 'number' || typeof raw === 'boolean' || typeof raw === 'string') {
      values[param] = raw;
      continue;
    }
    fail(`${name}.${param}`, raw, 'a number, boolean, or string literal', 'invalid-args.assembly.configuration-syntax');
  }
  return values;
}

/** The single `configurations({ ... })` literal in a part source. */
export function readConfigurations(code: string): readonly ConfigurationSet[] {
  const sites = findCallSites(code, 'configurations');
  if (sites.length === 0) {
    fail('configurations()', 'no configurations() call', 'one configurations({ name: { param: literal } }) call in the part source', 'invalid-args.assembly.configurations-undeclared');
  }
  if (sites.length > 1) {
    fail('configurations()', sites.length, 'exactly one configurations() call per part source', 'invalid-args.assembly.configurations-duplicate');
  }
  const cursor = new SourceCursor(code, sites[0]! + 'configurations'.length);
  if (cursor.peek() !== '(') fail('configurations()', cursor.peek(), "'(' after configurations", 'invalid-args.assembly.configuration-syntax');
  cursor.advance(1);
  const obj = parseObject(cursor);
  cursor.skipTrivia();
  if (cursor.peek() !== ')') {
    fail('configurations()', cursor.peek() || 'end of source', "')' after the sets object", 'invalid-args.assembly.configuration-syntax');
  }
  const names = Object.keys(obj);
  if (names.length === 0) {
    fail('sets', '{}', 'at least one named set', 'invalid-args.assembly.configuration-syntax');
  }
  return names.map((name) => {
    assertFeatureName(name, name);
    return { name, values: asConfigValues(name, obj[name]!) };
  });
}

/** One named set. The error lists the names the file actually declares. */
export function configurationByName(sets: readonly ConfigurationSet[], name: string): ConfigurationSet {
  const found = sets.find((set) => set.name === name);
  if (found) return found;
  const known = sets.map((set) => set.name).join(', ') || '(none)';
  invalidArgs({
    api: 'assembly.instance(name, { configuration })',
    path: 'configuration',
    got: name,
    showType: typeof name !== 'string',
    requires: `one of the configurations declared by the part source: ${known}`,
    example: INSTANCE_EXAMPLE,
    hintSlug: 'invalid-args.assembly.configuration-missing',
  });
}

function failAssignment(setName: string, paramName: string, got: unknown, requires: string): never {
  invalidArgs({
    api: `configurations({ ${setName} })`,
    path: `${setName}.${paramName}`,
    got,
    showType: true,
    requires,
    example: CONFIG_EXAMPLE,
    hintSlug: 'invalid-args.assembly.configuration-invalid-value',
  });
}

function numberRequirement(decl: ParamDeclaration): string {
  if (decl.min !== undefined && decl.max !== undefined) return `a number ≥ ${decl.min} and ≤ ${decl.max}`;
  if (decl.min !== undefined) return `a number ≥ ${decl.min}`;
  if (decl.max !== undefined) return `a number ≤ ${decl.max}`;
  return 'a finite number';
}

function numberInRange(setName: string, paramName: string, value: number, decl: ParamDeclaration): void {
  const low = decl.min === undefined || value >= decl.min;
  const high = decl.max === undefined || value <= decl.max;
  if (low && high && Number.isFinite(value)) return;
  failAssignment(setName, paramName, value, numberRequirement(decl));
}

function checkChoice(setName: string, paramName: string, value: ConfigValue, choices: readonly string[] | undefined): void {
  const allowed = choices?.map((choice) => `'${choice}'`).join(' | ') ?? 'the declared choices';
  if (typeof value === 'string' && choices?.includes(value)) return;
  failAssignment(setName, paramName, value, `one of ${allowed}`);
}

function checkString(setName: string, paramName: string, value: ConfigValue, maxLength: number | undefined): void {
  if (typeof value !== 'string') failAssignment(setName, paramName, value, `a string — param('${paramName}') is a string parameter`);
  if (maxLength !== undefined && value.length > maxLength) {
    failAssignment(setName, paramName, value, `a string of at most ${maxLength} characters`);
  }
}

function checkColor(setName: string, paramName: string, value: ConfigValue): void {
  if (typeof value === 'string' && normalizeColor(value) !== undefined) return;
  failAssignment(setName, paramName, value, "a '#rgb' / '#rrggbb' colour or a basic CSS colour name");
}

function checkTypedAssignment(setName: string, paramName: string, value: ConfigValue, decl: ParamDeclaration): void {
  if (decl.kind === 'number') {
    if (typeof value !== 'number') failAssignment(setName, paramName, value, `a number — param('${paramName}') is a number parameter`);
    numberInRange(setName, paramName, value, decl);
    return;
  }
  if (decl.kind === 'boolean') {
    if (typeof value !== 'boolean') failAssignment(setName, paramName, value, `a boolean — param('${paramName}') is a boolean parameter`);
    return;
  }
  if (decl.kind === 'choice') {
    checkChoice(setName, paramName, value, decl.choices);
    return;
  }
  if (decl.kind === 'string') {
    checkString(setName, paramName, value, decl.maxLength);
    return;
  }
  if (decl.kind === 'color') {
    checkColor(setName, paramName, value);
    return;
  }
  failAssignment(setName, paramName, value, `a param('${paramName}') whose default is a literal, so the configuration value can be type-checked`);
}

function checkAssignment(code: string, setName: string, paramName: string, value: ConfigValue): void {
  const parsed = parseParamDeclaration(code, paramName);
  if (!parsed.ok) {
    invalidArgs({
      api: `configurations({ ${setName} })`,
      path: `${setName}.${paramName}`,
      got: paramName,
      requires: `the name of a param() declared in this part source — '${paramName}' is not declared`,
      example: CONFIG_EXAMPLE,
      hintSlug: 'invalid-args.assembly.configuration-unknown-param',
    });
  }
  checkTypedAssignment(setName, paramName, value, parsed.declaration);
}

/** Type-check one set against `param()` declarations in the same source. */
export function assertConfigurationAssignments(code: string, set: ConfigurationSet): void {
  for (const [paramName, value] of Object.entries(set.values)) {
    checkAssignment(code, set.name, paramName, value);
  }
}

/** Replace `param()` defaults with one set. The input source is not modified. */
export function rewriteParamsForConfiguration(
  code: string,
  values: Readonly<Record<string, ConfigValue>>,
): string {
  let next = code;
  for (const [name, value] of Object.entries(values)) {
    const rewritten = setParamValue(next, name, value);
    if (!rewritten.ok || rewritten.new_code === undefined) {
      invalidArgs({
        api: 'configurations(sets)',
        path: name,
        got: value,
        showType: true,
        requires: `a param('${name}') declaration whose default literal can be replaced — ${rewritten.error ?? 'the declaration was not found'}`,
        example: CONFIG_EXAMPLE,
        hintSlug: 'invalid-args.assembly.configuration-invalid-value',
      });
    }
    next = rewritten.new_code;
  }
  return next;
}

function hashBytes(bytes: Uint8Array): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ bytes.length;
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i] ?? 0;
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x01000193);
  }
  return `${bytes.length.toString(16)}:${(h1 >>> 0).toString(16)}:${(h2 >>> 0).toString(16)}`;
}

/** Stable across calls. The configuration name is part of the key, so two
 *  sets of one file cannot share a lowered solid. */
export function partEvalMemoKey(
  bytes: Uint8Array,
  name: string,
  values: Readonly<Record<string, ConfigValue>>,
): string {
  const ordered: Record<string, ConfigValue> = {};
  for (const key of Object.keys(values).sort()) ordered[key] = values[key]!;
  return `${hashBytes(bytes)}|${name}|${JSON.stringify(ordered)}`;
}

function isQuote(ch: string): boolean {
  return ch === '"' || ch === "'" || ch === '`';
}

function isOpen(ch: string): boolean {
  return ch === '(' || ch === '[' || ch === '{';
}

function isClose(ch: string): boolean {
  return ch === ')' || ch === ']' || ch === '}';
}

function skipArgument(cursor: SourceCursor): void {
  let depth = 0;
  let quote: string | null = null;
  while (!cursor.done) {
    const ch = cursor.peek();
    if (quote) {
      if (ch === '\\') { cursor.advance(2); continue; }
      if (ch === quote) quote = null;
      cursor.advance(1);
      continue;
    }
    if (isQuote(ch)) { quote = ch; cursor.advance(1); continue; }
    if (isOpen(ch)) { depth += 1; cursor.advance(1); continue; }
    if (isClose(ch)) {
      if (depth === 0) return;
      depth -= 1;
      cursor.advance(1);
      continue;
    }
    if (ch === ',' && depth === 0) return;
    cursor.advance(1);
  }
}

interface InstanceDep { source: string; configuration: string }

function instanceDependency(code: string, site: number): InstanceDep | 'unprovable' {
  const cursor = new SourceCursor(code, site + 'instance'.length);
  if (cursor.peek() !== '(') return 'unprovable';
  cursor.advance(1);
  cursor.skipTrivia();
  skipArgument(cursor);
  cursor.skipTrivia();
  if (cursor.peek() !== ',') return 'unprovable';
  cursor.advance(1);
  cursor.skipTrivia();
  if (cursor.peek() !== '{') return 'unprovable';
  let obj: ParsedObject;
  try {
    obj = parseObject(cursor);
  } catch {
    return 'unprovable';
  }
  const source = obj.source;
  const configuration = obj.configuration;
  if (typeof source !== 'string' || typeof configuration !== 'string') return 'unprovable';
  return { source, configuration };
}

function hashPart(source: string, scriptDir: string | undefined): string {
  const fs = getHostFs();
  if (!fs) return `unread:${source}`;
  const abs = fs.resolveScriptRelative(scriptDir, source);
  if (!fs.fileExists(abs)) return `missing:${abs}`;
  try {
    return `${abs}:${hashBytes(fs.readFileBytes(abs))}|config:`;
  } catch {
    return `unreadable:${abs}`;
  }
}

/**
 * Identity of every literal `instance(..., { source, configuration })`.
 * `none` when the script instances nothing. A non-literal source or
 * configuration returns `unprovable:`, and the evaluate cache skips the script.
 */
export async function configurationImportIdentity(code: string, scriptDir?: string): Promise<string> {
  const sites = findCallSites(code, 'instance');
  if (sites.length === 0) return 'none';
  const parts: string[] = [];
  for (const site of sites) {
    const dep = instanceDependency(code, site);
    if (dep === 'unprovable') return 'unprovable:instance';
    const hashed = hashPart(dep.source, scriptDir);
    if (hashed.startsWith('missing:') || hashed.startsWith('unreadable:') || hashed.startsWith('unread:')) {
      return `unprovable:${hashed}`;
    }
    parts.push(`${hashed}${dep.configuration}`);
  }
  return parts.sort().join('|');
}
