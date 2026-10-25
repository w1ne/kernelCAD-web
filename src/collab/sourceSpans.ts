// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// AST character spans for collaborative source edits. Capture records carry the
// authored call-site (line, column); this module turns that point into the
// statement range the merge rewrites and finds top-level source no feature owns.

import type * as TS from 'typescript';
import { lazyTs as ts } from '../shared/runtime/lazyTypescript';
import type { ScriptLocation } from '../shared/intent/types';
import type { SourceSpan, UnownedSpan } from './types';

export interface CallSpanInfo {
  callee: string;
  /** Character range of the whole call expression. */
  call: SourceSpan;
  /** Character range of the enclosing statement. */
  statement: SourceSpan;
}

function calleeName(call: TS.CallExpression): string {
  const expression = call.expression;
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return '';
}

function calleePosition(call: TS.CallExpression): number {
  const expression = call.expression;
  if (ts.isIdentifier(expression)) return expression.getStart(call.getSourceFile());
  if (ts.isPropertyAccessExpression(expression)) return expression.name.getStart(call.getSourceFile());
  return expression.getStart(call.getSourceFile());
}

/** Parsed, position-aware view of one `.kcad.ts` source text. */
export class CollabSpanIndex {
  private readonly sourceFile: TS.SourceFile;
  private readonly calls: readonly TS.CallExpression[];
  readonly text: string;

  private constructor(sourceFile: TS.SourceFile, calls: readonly TS.CallExpression[], text: string) {
    this.sourceFile = sourceFile;
    this.calls = calls;
    this.text = text;
  }

  static parse(code: string, fileName = 'model.kcad.ts'): CollabSpanIndex {
    const sourceFile = ts.createSourceFile(
      fileName,
      code,
      ts.ScriptTarget.ES2022,
      /* setParentNodes */ true,
      ts.ScriptKind.TS,
    );
    const calls: TS.CallExpression[] = [];
    const visit = (node: TS.Node): void => {
      if (ts.isCallExpression(node)) calls.push(node);
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return new CollabSpanIndex(sourceFile, calls, code);
  }

  offsetOf(location: Pick<ScriptLocation, 'line' | 'column'>): number | undefined {
    const lineStarts = this.sourceFile.getLineStarts();
    if (location.line < 1 || location.line > lineStarts.length) return undefined;
    return lineStarts[location.line - 1]! + (location.column - 1);
  }

  /** The call authored at the capture record's location. */
  callAt(location: Pick<ScriptLocation, 'line' | 'column'>): CallSpanInfo | undefined {
    const position = this.offsetOf(location);
    if (position === undefined) return undefined;

    const exact = this.calls.find((call) => calleePosition(call) === position);
    if (exact !== undefined) return this.spanOf(exact);

    let innermost: TS.CallExpression | undefined;
    for (const call of this.calls) {
      const start = call.getStart(this.sourceFile);
      if (position < start || position >= call.getEnd()) continue;
      if (innermost === undefined || start >= innermost.getStart(this.sourceFile)) innermost = call;
    }
    return innermost === undefined ? undefined : this.spanOf(innermost);
  }

  /** Calls named `name`, in source order. */
  callsNamed(name: string): TS.CallExpression[] {
    return this.calls.filter((call) => calleeName(call) === name);
  }

  spanOfCall(call: TS.CallExpression): SourceSpan {
    const start = call.getStart(this.sourceFile);
    return { start, end: call.getEnd() };
  }

  private spanOf(call: TS.CallExpression): CallSpanInfo {
    const callSpan = this.spanOfCall(call);
    return { callee: calleeName(call), call: callSpan, statement: this.statementSpanOf(call) };
  }

  private statementSpanOf(node: TS.Node): SourceSpan {
    let current: TS.Node | undefined = node;
    while (current !== undefined && !ts.isStatement(current)) current = current.parent;
    const statement = current ?? node;
    return { start: statement.getStart(this.sourceFile), end: statement.getEnd() };
  }

  /**
   * Top-level statements that own no feature, requirement or `param(...)`
   * declaration. These are the helper/import spans a merge three-way merges as
   * text. Comments and blank lines are not statements and stay out.
   */
  unownedStatements(owned: readonly SourceSpan[]): UnownedSpan[] {
    const protectedCalls = new Set<TS.CallExpression>([
      ...this.callsNamed('param'),
      ...this.callsNamed('require'),
    ]);
    const protectedSpans = new Set<SourceSpan>(
      [...protectedCalls].map((call) => this.statementSpanOf(call)),
    );
    const out: UnownedSpan[] = [];
    for (const statement of this.sourceFile.statements) {
      if (ts.isReturnStatement(statement)) continue;
      const span = { start: statement.getStart(this.sourceFile), end: statement.getEnd() };
      if (owned.some((s) => overlaps(s, span))) continue;
      if ([...protectedSpans].some((s) => s.start === span.start && s.end === span.end)) continue;
      out.push({ ...span, text: this.text.slice(span.start, span.end) });
    }
    return out;
  }
}

function overlaps(a: SourceSpan, b: SourceSpan): boolean {
  return a.start < b.end && b.start < a.end;
}
