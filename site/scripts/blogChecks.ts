// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Checks that keep a blog post true to its model. The syntax is documented in
// the header of site/scripts/build-blog.ts; in short, a check is an HTML
// comment on its own line, right under the paragraph or code block it covers:
//
//   <!-- check: <path> = <value> -->
//   <!-- check <model>: <path> = <value> -->
//   <!-- check <model>: <path> contains <text> -->
//   <!-- check <model>: source contains block -->
//
// Each failure names the Markdown file and line, and for a quoted value the
// real one.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { formatBendTableCsv, type BendTable, type BendTableJoints } from '../../src/shared/tube/bendTable';
import { plainText, type Block, type CheckBlock } from './blogMarkdown';
import type { RenderedPost } from './build-blog';

/** What `kernelcad evaluate <file> --json` prints. */
export interface EvaluateJson {
  readonly ok: boolean;
  readonly featureCount: number;
  readonly diagnostics: ReadonlyArray<{ readonly code: string; readonly severity: string; readonly message: string }>;
  readonly [key: string]: unknown;
}

export interface Evaluator {
  /** The `--json` output for a script, by its repository path. */
  file(repoPath: string): Promise<EvaluateJson>;
  /** The same for a script given as text: a kcad block. */
  code(source: string): Promise<EvaluateJson>;
}

export interface CheckFailure {
  readonly file: string;
  readonly line: number;
  readonly message: string;
}

export interface CheckReport {
  readonly failures: CheckFailure[];
  /** How many kcad blocks evaluated and how many quoted values matched. */
  readonly kcadBlocks: number;
  readonly quotes: number;
}

/** Every check of one post. Runs the evaluator one script at a time. */
export async function checkPost(rendered: RenderedPost, evaluator: Evaluator, repoRoot: string): Promise<CheckReport> {
  const failures = checkFiles(rendered, repoRoot);
  const blocks = await checkKcadBlocks(rendered, evaluator, failures);
  const quotes = await checkQuotes(rendered, evaluator, repoRoot, failures);
  return { failures, kcadBlocks: blocks, quotes };
}

/** True when the post has anything that needs the kernel. */
export function needsEvaluator(rendered: RenderedPost): boolean {
  return rendered.post.blocks.some((b) => b.kind === 'check' || (b.kind === 'code' && b.lang === 'kcad'));
}

/**
 * Files in a `site/blog/<dir>/` that no published guide builds: the page of a
 * post that went back to draft or was deleted, or a draft's images put there
 * early. The deploy would serve them on their own, so they fail the build
 * until the directory is removed or the post is published. Named by
 * `index.html` when there is one, else by the first file.
 */
export function checkOrphanPages(repoRoot: string, publishedSlugs: readonly string[]): CheckFailure[] {
  const blogDir = path.join(repoRoot, 'site/blog');
  if (!existsSync(blogDir)) return [];
  return readdirSync(blogDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'drafts' && !publishedSlugs.includes(entry.name))
    .flatMap((entry) => {
      const files = readdirSync(path.join(blogDir, entry.name)).sort();
      if (files.length === 0) return [];
      const named = files.includes('index.html') ? 'index.html' : files[0];
      return [{
        file: `site/blog/${entry.name}/${named}`,
        line: 1,
        message: `no published guide builds site/blog/${entry.name}/, so the deploy would serve its files on their own; ` +
          `delete the directory or publish docs/guide/${entry.name}.md (a draft keeps its images outside site/)`,
      }];
    });
}

// ---- files -------------------------------------------------------------------

function checkFiles(rendered: RenderedPost, repoRoot: string): CheckFailure[] {
  const { post } = rendered;
  const failures: CheckFailure[] = [];
  const fail = (line: number, message: string): void => {
    failures.push({ file: post.file, line, message });
  };
  for (const [field, suffix] of [['model', '.kcad.ts'], ['video', '.mp4']] as const) {
    const value = post.meta[field];
    if (value === undefined) continue;
    const line = post.fieldLines[field] ?? 1;
    if (!value.endsWith(suffix)) fail(line, `${field} ${value} must be a ${suffix} file`);
    else if (!existsSync(path.join(repoRoot, value))) fail(line, `${field} ${value} does not exist`);
  }
  // A published page links its images where they are, so they must be under
  // site/. A draft's preview copies them, so they may be anywhere in the repo.
  const draft = post.meta.status === 'draft';
  for (const image of rendered.images) {
    if (!image.inRepo) fail(image.line, `image ${image.src} is outside the repository`);
    else if (!image.underSite && !draft) fail(image.line, `image ${image.src} is not under site/; put it in site/blog/${post.slug}/ and link it from there`);
    else if (!existsSync(image.file)) fail(image.line, `image ${image.src} does not exist`);
  }
  return failures;
}

// ---- kcad blocks ---------------------------------------------------------------

async function checkKcadBlocks(rendered: RenderedPost, evaluator: Evaluator, failures: CheckFailure[]): Promise<number> {
  const blocks = rendered.post.blocks.filter((b): b is Extract<Block, { kind: 'code' }> => b.kind === 'code' && b.lang === 'kcad');
  for (const [i, block] of blocks.entries()) {
    const output = await evaluator.code(block.code);
    const bad = output.diagnostics.filter((d) => d.severity === 'error' || d.severity === 'warning');
    if (!output.ok || bad.length > 0) {
      const detail = bad.map((d) => (d.message.startsWith(d.code) ? d.message : `${d.code}: ${d.message}`)).join('; ') || 'the evaluation failed';
      failures.push({ file: rendered.post.file, line: block.line, message: `kcad block ${i + 1} does not evaluate clean: ${detail}` });
    }
  }
  return blocks.length;
}

// ---- quoted values -----------------------------------------------------------

type Expected =
  | { readonly kind: 'number'; readonly text: string; readonly value: number; readonly decimals: number }
  | { readonly kind: 'numbers'; readonly text: string; readonly items: ReadonlyArray<{ value: number; decimals: number }> }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'block' };

interface Quote {
  readonly line: number;
  readonly model: string | null;
  readonly path: string;
  readonly op: '=' | 'contains';
  readonly expected: Expected;
}

const CHECK = /^(?:([^\s:]+)\s*)?:\s*(\S+)\s+(=|contains)\s+(.+)$/;
const NUMBER = /^-?\d+(?:\.\d+)?$/;
/** The path that names the model file's own text instead of its evaluate output. */
const SOURCE_PATH = 'source';

function readQuote(block: CheckBlock): Quote | string {
  const match = CHECK.exec(block.text);
  if (!match) return 'cannot read the check; write <!-- check [model]: <path> = <value> -->';
  const [, model, pathText, op, raw] = match;
  const value = raw.trim();
  let expected: Expected;
  if (value === 'block') {
    expected = { kind: 'block' };
  } else if (op === '=' && NUMBER.test(value)) {
    expected = { kind: 'number', text: value, value: Number(value), decimals: decimals(value) };
  } else if (op === '=' && /^\[.*\]$/.test(value)) {
    const items = value.slice(1, -1).split(',').map((s) => s.trim());
    if (!items.every((s) => NUMBER.test(s))) return `cannot read ${value} as a list of numbers`;
    expected = { kind: 'numbers', text: value, items: items.map((s) => ({ value: Number(s), decimals: decimals(s) })) };
  } else {
    expected = { kind: 'text', text: /^".*"$/.test(value) ? value.slice(1, -1) : value };
  }
  return { line: block.line, model: model ?? null, path: pathText, op: op as Quote['op'], expected };
}

function decimals(literal: string): number {
  const dot = literal.indexOf('.');
  return dot === -1 ? 0 : literal.length - dot - 1;
}

async function checkQuotes(rendered: RenderedPost, evaluator: Evaluator, repoRoot: string, failures: CheckFailure[]): Promise<number> {
  const { post } = rendered;
  let passed = 0;
  let above: Block | undefined;
  for (const block of post.blocks) {
    if (block.kind !== 'check') {
      above = block;
      continue;
    }
    const problem = await checkOne(block, above, post.meta.model, evaluator, repoRoot);
    if (problem === null) passed += 1;
    else failures.push({ file: post.file, line: block.line, message: problem });
  }
  return passed;
}

async function checkOne(
  block: CheckBlock,
  above: Block | undefined,
  defaultModel: string | undefined,
  evaluator: Evaluator,
  repoRoot: string,
): Promise<string | null> {
  const quote = readQuote(block);
  if (typeof quote === 'string') return quote;
  const model = quote.model ?? defaultModel;
  if (model === undefined) return `the check names no model and the front matter has no "model"`;
  if (!existsSync(path.join(repoRoot, model))) return `the check's model ${model} does not exist`;
  if (above === undefined) return 'a check goes right under the paragraph or code block it covers';

  const shown = shownAbove(quote, above);
  if (shown !== null) return shown;

  // `source` is the model file's own text: no evaluation needed.
  const resolved = quote.path === SOURCE_PATH
    ? { value: readFileSync(path.join(repoRoot, model), 'utf8') }
    : resolvePath(await evaluator.file(model), quote.path);
  if (typeof resolved === 'string') return `${quote.path} in ${model}: ${resolved}`;
  const real = compare(resolved.value, quote, above);
  if (real === null) return null;
  if (quote.expected.kind === 'block' && quote.op === 'contains') {
    return `${quote.path === SOURCE_PATH ? `the source of ${model}` : `${quote.path} in ${model}`} does not contain the code block above`;
  }
  if (quote.expected.kind === 'block') return `${quote.path} in ${model} differs from the code block above; the model gives:\n${real}`;
  return `${quote.path} in ${model} is ${real}; the article says ${describeExpected(quote)}`;
}

/** The value must be in the text above, so what the reader sees is what was checked. */
function shownAbove(quote: Quote, above: Block): string | null {
  if (quote.expected.kind === 'block') {
    return above.kind === 'code' ? null : '"= block" needs a code block right above the check';
  }
  const text = blockText(above);
  const literal = quote.expected.text;
  const found = quote.expected.kind === 'number' ? numberPattern(literal).test(text) : text.includes(literal);
  return found ? null : `${literal} is not shown in the ${describeBlock(above)} above`;
}

function numberPattern(literal: string): RegExp {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  return new RegExp(`(?<![\\d.-])${escaped}(?!\\d|\\.\\d)`);
}

function blockText(block: Block): string {
  switch (block.kind) {
    case 'paragraph':
    case 'heading':
      return plainText(block.text);
    case 'list':
      return block.items.map(plainText).join('\n');
    case 'code':
      return block.code;
    case 'figure':
      return `${block.alt}\n${block.caption === null ? '' : plainText(block.caption)}`;
    case 'check':
      return '';
  }
}

function describeBlock(block: Block): string {
  return block.kind === 'code' ? 'code block' : block.kind;
}

function describeExpected(quote: Quote): string {
  const text = quote.expected.kind === 'block' ? '' : quote.expected.text;
  return quote.op === 'contains' ? `it contains "${text}"` : text;
}

/** null when the real value matches; otherwise the real value, for the message. */
function compare(actual: unknown, quote: Quote, above: Block): string | null {
  const expected = quote.expected;
  switch (expected.kind) {
    case 'number':
      return sameNumber(actual, expected.value, expected.decimals) ? null : show(actual);
    case 'numbers': {
      const ok = Array.isArray(actual) && actual.length === expected.items.length &&
        expected.items.every((item, i) => sameNumber(actual[i], item.value, item.decimals));
      return ok ? null : show(actual);
    }
    case 'block': {
      const code = (above as { code: string }).code;
      if (typeof actual !== 'string') return show(actual);
      const ok = quote.op === 'contains' ? actual.includes(code) : actual.trimEnd() === code.trimEnd();
      return ok ? null : actual.trimEnd();
    }
    case 'text': {
      if (quote.op === 'contains') return typeof actual === 'string' && actual.includes(expected.text) ? null : show(actual);
      const scalar = typeof actual === 'string' || typeof actual === 'number' || typeof actual === 'boolean';
      return scalar && String(actual) === expected.text ? null : show(actual);
    }
  }
}

function sameNumber(actual: unknown, value: number, places: number): boolean {
  return typeof actual === 'number' && Number.isFinite(actual) && Number(actual.toFixed(places)) === value;
}

function show(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

// ---- paths into the output ---------------------------------------------------

type Step =
  | { readonly kind: 'key'; readonly key: string }
  | { readonly kind: 'index'; readonly index: number }
  | { readonly kind: 'where'; readonly conditions: ReadonlyArray<readonly [string, string]> };

function parsePath(text: string): Step[] | string {
  const steps: Step[] = [];
  const pattern = /\.?([A-Za-z_$][\w$-]*)|\[([^\]]*)\]/gy;
  let match: RegExpExecArray | null;
  while (pattern.lastIndex < text.length && (match = pattern.exec(text)) !== null) {
    if (match[1] !== undefined) {
      steps.push({ kind: 'key', key: match[1] });
    } else if (/^\d+$/.test(match[2])) {
      steps.push({ kind: 'index', index: Number(match[2]) });
    } else {
      const conditions = match[2].split(',').map((part) => part.split('='));
      if (!conditions.every((c) => c.length === 2 && c[0].trim() !== '')) return `cannot read the selector [${match[2]}]`;
      steps.push({ kind: 'where', conditions: conditions.map(([k, v]) => [k.trim(), v.trim()] as const) });
    }
  }
  return pattern.lastIndex === text.length && steps.length > 0 ? steps : `cannot read the path ${text}`;
}

/** The value at `text` in the output, or why there is none. */
export function resolvePath(output: unknown, text: string): { value: unknown } | string {
  const steps = parsePath(text);
  if (typeof steps === 'string') return steps;
  let value: unknown = output;
  let at = '';
  for (const step of steps) {
    const next = takeStep(value, step);
    if (typeof next === 'string') return `${next}${at ? ` at ${at}` : ''}`;
    value = next.value;
    at += step.kind === 'key' ? `${at ? '.' : ''}${step.key}` : step.kind === 'index' ? `[${step.index}]` : `[${step.conditions.map((c) => c.join('=')).join(',')}]`;
  }
  return { value };
}

function takeStep(value: unknown, step: Step): { value: unknown } | string {
  if (step.kind === 'index') {
    return Array.isArray(value) && step.index < value.length ? { value: value[step.index] } : `no element ${step.index}`;
  }
  if (step.kind === 'where') {
    if (!Array.isArray(value)) return 'a selector needs a list';
    const hits = value.filter((item) => step.conditions.every(([k, v]) => isRecord(item) && String(item[k]) === v));
    const label = `[${step.conditions.map((c) => c.join('=')).join(',')}]`;
    if (hits.length === 1) return { value: hits[0] };
    return hits.length === 0 ? `${label} matches no element` : `${label} matches ${hits.length} elements`;
  }
  if (step.key === 'length' && Array.isArray(value)) return { value: value.length };
  if (step.key === 'bendTableCsv' && isRecord(value) && Array.isArray(value.lra)) return { value: bendTableCsv(value) };
  if (isRecord(value) && step.key in value) return { value: value[step.key] };
  return `no "${step.key}"`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The CSV `kernelcad export bend-table` writes for one line of `tubes.lines`. */
function bendTableCsv(line: Record<string, unknown>): string {
  const joints: BendTableJoints = {
    ...(line.from !== undefined ? { from: line.from as BendTableJoints['from'] } : {}),
    ...(line.to !== undefined ? { to: line.to as BendTableJoints['to'] } : {}),
    ...(line.branches !== undefined ? { branches: line.branches as BendTableJoints['branches'] } : {}),
  };
  const table: BendTable = {
    lra: line.lra as BendTable['lra'],
    lastStraight: line.lastStraight as number,
    xyz: line.xyz as BendTable['xyz'],
    bendRadius: line.bendRadius as number,
    cutLength: line.cutLength as number,
  };
  return formatBendTableCsv(String(line.name), line.od as number, line.wall as number, table, joints);
}
