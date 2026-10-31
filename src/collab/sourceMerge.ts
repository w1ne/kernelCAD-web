// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Source-text primitives for the structural merge: literal param rewrites,
// statement extraction and deterministic edit application.

import { setParamValue } from '../modeling/edits/setParamValue';
import type { FeatureNode, SourceSpan } from './types';
import { CollabSpanIndex } from './sourceSpans';

export interface TextEdit {
  start: number;
  end: number;
  text: string;
}

export interface RewriteSpan {
  span: SourceSpan;
  text: string;
}

function quoteSingle(text: string): string {
  return `'${text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')}'`;
}

export function literalFor(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return quoteSingle(value);
  return undefined;
}

/**
 * Span of the default value a `param('<name>', …)` rewrite replaces, derived by
 * diffing the pre/post source. Returns undefined when the param is absent.
 */
export function projectParamRewrite(source: string, name: string, value: unknown): RewriteSpan | undefined {
  const replacement = literalFor(value);
  if (replacement === undefined) return undefined;
  const rewritten = setParamValue(source, name, value as number | string | boolean);
  if (!rewritten.ok || rewritten.new_code === undefined) return undefined;
  const before = source;
  const after = rewritten.new_code;
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (beforeEnd > start && afterEnd > start && before[beforeEnd - 1] === after[afterEnd - 1]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }
  return { span: { start, end: beforeEnd }, text: after.slice(start, afterEnd) };
}

function isIdentifierChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_$]/.test(char);
}

function findLiteral(text: string, value: unknown): SourceSpan | undefined {
  const candidates = literalFor(value) === undefined
    ? []
    : [literalFor(value)!, typeof value === 'string' ? `"${value}"` : undefined].filter(
        (v): v is string => v !== undefined,
      );
  for (const candidate of candidates) {
    let from = 0;
    while (from <= text.length) {
      const index = text.indexOf(candidate, from);
      if (index < 0) break;
      const before = text[index - 1];
      const after = text[index + candidate.length];
      const boundary = typeof value === 'number'
        ? !isIdentifierChar(before) && before !== '.' && !isIdentifierChar(after) && after !== '.'
        : !isIdentifierChar(before) && !isIdentifierChar(after);
      if (boundary) return { start: index, end: index + candidate.length };
      from = index + 1;
    }
  }
  return undefined;
}

/** Positional argument carrying each named param for the feature kinds whose
 *  capture shape is stable. Kinds not listed fall back to a literal search. */
const ARGUMENT_INDEX: Record<string, Record<string, number>> = {
  box: { x: 0, y: 1, z: 2 },
  cylinder: { height: 0, radius: 1 },
  sphere: { radius: 0 },
  fillet: { radius: 0 },
  chamfer: { distance: 0 },
  shell: { thickness: 0 },
  extrude: { height: 0 },
  revolve: { angle: 0 },
  draft: { angleDeg: 0 },
};

/** Rewrite one feature-param cell inside the statement that authored the node. */
export function featureParamRewrite(
  source: string,
  node: FeatureNode,
  name: string,
  value: unknown,
): RewriteSpan | undefined {
  const replacement = literalFor(value);
  if (replacement === undefined) return undefined;

  const argumentIndex = ARGUMENT_INDEX[node.kind]?.[name];
  if (argumentIndex !== undefined && node.callSpan !== undefined) {
    const spans = CollabSpanIndex.parse(source);
    const call = spans.callNodeByStart(node.callSpan.start);
    if (call !== undefined) {
      const argument = spans.argumentSpan(call, argumentIndex);
      if (argument !== undefined) return { span: argument, text: replacement };
    }
  }

  const statement = source.slice(node.sourceSpan.start, node.sourceSpan.end);
  const local = findLiteral(statement, node.params[name]);
  if (local === undefined) return undefined;
  return {
    span: { start: node.sourceSpan.start + local.start, end: node.sourceSpan.start + local.end },
    text: replacement,
  };
}

export function statementText(source: string, span: SourceSpan): string {
  return source.slice(span.start, span.end);
}

/** True when the statement is a `return …;` (a node's call is in the returned expression). */
export function statementIsReturn(source: string, span: SourceSpan): boolean {
  return /^\s*return\b/.test(source.slice(span.start, span.end));
}

/** Replace the text of a span. */
export function replaceSpan(source: string, span: SourceSpan, text: string): string {
  return source.slice(0, span.start) + text + source.slice(span.end);
}

/** Apply edits from the end so earlier offsets stay valid. */
export function applyTextEdits(source: string, edits: readonly TextEdit[]): string {
  const ordered = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
  let out = source;
  for (const edit of ordered) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }
  return out;
}
