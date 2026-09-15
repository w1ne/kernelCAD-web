// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// AST spans for a `.kcad.ts` script.
//
// A captured feature knows the (line, column) it was authored at. Turning that
// point into an editable REGION — and into the exact character range of the one
// argument a repair should rewrite — needs the script's syntax tree. This module
// owns that lookup, using the TypeScript compiler the script runtime already
// depends on, so spans are real parse results rather than regex guesses.

import * as ts from 'typescript';
import type { ScriptLocation } from '../../shared/intent/types';

/** 1-based inclusive line range in the original file. */
export interface ScriptRange {
  startLine: number;
  endLine: number;
}

/** Half-open character range in the original file text. */
export interface CharRange {
  start: number;
  end: number;
}

export interface CallSpan {
  /** Name of the function or method invoked (`box`, `subtract`, `fillet`). */
  callee: string;
  /** Character range of the whole call expression. */
  chars: CharRange;
  /** Line range of the whole call expression. */
  nodeRange: ScriptRange;
  /** Line range of the enclosing statement — the unit a bounded edit rewrites. */
  statementRange: ScriptRange;
}

/**
 * Parsed view of one script: converts positions to spans and locates the
 * argument sub-ranges a repair candidate needs to rewrite.
 */
export class ScriptSpanIndex {
  private readonly sourceFile: ts.SourceFile;
  private readonly calls: readonly ts.CallExpression[];
  readonly text: string;

  private constructor(
    sourceFile: ts.SourceFile,
    calls: readonly ts.CallExpression[],
    text: string,
  ) {
    this.sourceFile = sourceFile;
    this.calls = calls;
    this.text = text;
  }

  static parse(code: string, fileName = 'script.kcad.ts'): ScriptSpanIndex {
    const sourceFile = ts.createSourceFile(
      fileName,
      code,
      ts.ScriptTarget.ES2022,
      /* setParentNodes */ true,
      ts.ScriptKind.TS,
    );
    const calls: ts.CallExpression[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) calls.push(node);
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return new ScriptSpanIndex(sourceFile, calls, code);
  }

  /** 1-based line of a character offset. */
  lineOf(position: number): number {
    return this.sourceFile.getLineAndCharacterOfPosition(position).line + 1;
  }

  /** Character offset of a 1-based (line, column). */
  offsetOf(line: number, column: number): number | undefined {
    const lineStarts = this.sourceFile.getLineStarts();
    if (line < 1 || line > lineStarts.length) return undefined;
    return lineStarts[line - 1] + (column - 1);
  }

  /** Character range covering whole lines `startLine`..`endLine` inclusive. */
  charsOfLines(range: ScriptRange): CharRange | undefined {
    const lineStarts = this.sourceFile.getLineStarts();
    if (range.startLine < 1 || range.endLine > lineStarts.length) return undefined;
    const start = lineStarts[range.startLine - 1];
    const end = range.endLine < lineStarts.length
      ? lineStarts[range.endLine] - 1 // stop before the newline
      : this.text.length;
    return { start, end };
  }

  /**
   * The call expression authored at `location`.
   *
   * V8 reports the callee-name position: the identifier for `box(...)`, the
   * method name for `shape.fillet(...)`. Match that exactly first, because a
   * chained expression nests several calls around the same point and only the
   * exact match names the right one. Fall back to the innermost call containing
   * the position when the exact anchor is unavailable (a differently-shaped
   * emit, or a location recovered from a diagnostic rather than a frame).
   */
  callAt(location: Pick<ScriptLocation, 'line' | 'column'>): CallSpan | undefined {
    const position = this.offsetOf(location.line, location.column);
    if (position === undefined) return undefined;

    const exact = this.calls.find(call => calleeNamePosition(call) === position);
    if (exact !== undefined) return this.spanOf(exact);

    let innermost: ts.CallExpression | undefined;
    for (const call of this.calls) {
      const start = call.getStart(this.sourceFile);
      if (position < start || position >= call.getEnd()) continue;
      if (innermost === undefined || start >= innermost.getStart(this.sourceFile)) {
        innermost = call;
      }
    }
    return innermost === undefined ? undefined : this.spanOf(innermost);
  }

  /** Raw AST node for the call authored at `location` (internal edit paths). */
  callNodeAt(location: Pick<ScriptLocation, 'line' | 'column'>): ts.CallExpression | undefined {
    const position = this.offsetOf(location.line, location.column);
    if (position === undefined) return undefined;
    const exact = this.calls.find(call => calleeNamePosition(call) === position);
    if (exact !== undefined) return exact;
    let innermost: ts.CallExpression | undefined;
    for (const call of this.calls) {
      const start = call.getStart(this.sourceFile);
      if (position < start || position >= call.getEnd()) continue;
      if (innermost === undefined || start >= innermost.getStart(this.sourceFile)) {
        innermost = call;
      }
    }
    return innermost;
  }

  spanOf(call: ts.CallExpression): CallSpan {
    const start = call.getStart(this.sourceFile);
    const end = call.getEnd();
    return {
      callee: calleeName(call),
      chars: { start, end },
      nodeRange: { startLine: this.lineOf(start), endLine: this.lineOf(end) },
      statementRange: this.statementRangeOf(call),
    };
  }

  /** Line range of the statement enclosing `node`. */
  statementRangeOf(node: ts.Node): ScriptRange {
    let current: ts.Node | undefined = node;
    while (current !== undefined && !ts.isStatement(current)) current = current.parent;
    const statement = current ?? node;
    return {
      startLine: this.lineOf(statement.getStart(this.sourceFile)),
      endLine: this.lineOf(statement.getEnd()),
    };
  }

  /**
   * Statement range of the `param('<name>', …)` declaration for `name`.
   * A feature's numeric inputs are frequently symbolic, so the declaration
   * line is a legitimate parameter source for a repair region.
   */
  paramDeclarationRange(name: string): ScriptRange | undefined {
    for (const call of this.calls) {
      if (calleeName(call) !== 'param') continue;
      const first = call.arguments[0];
      if (first === undefined || !ts.isStringLiteralLike(first)) continue;
      if (first.text !== name) continue;
      return this.statementRangeOf(call);
    }
    return undefined;
  }

  /** Character range of positional argument `index` of `call`. */
  argumentChars(call: ts.CallExpression, index: number): CharRange | undefined {
    const argument = call.arguments[index];
    if (argument === undefined) return undefined;
    return { start: argument.getStart(this.sourceFile), end: argument.getEnd() };
  }

  /**
   * Character range of the VALUE of property `name` inside the object literal
   * passed as argument `index`. Returns undefined when the argument is not an
   * object literal or carries no such property.
   */
  optionValueChars(
    call: ts.CallExpression,
    index: number,
    name: string,
  ): CharRange | undefined {
    const argument = call.arguments[index];
    if (argument === undefined || !ts.isObjectLiteralExpression(argument)) return undefined;
    for (const property of argument.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key = propertyKeyName(property.name);
      if (key !== name) continue;
      return {
        start: property.initializer.getStart(this.sourceFile),
        end: property.initializer.getEnd(),
      };
    }
    return undefined;
  }

  /**
   * Walk outwards from `call` through a fluent chain looking for `.<method>(…)`.
   * `box(2,2,2).translate(100,100,100)` captures the feature at `box`, but the
   * placement a repair must correct lives on the enclosing `translate` call.
   */
  chainedCallAfter(call: ts.CallExpression, method: string): ts.CallExpression | undefined {
    let current: ts.Node = call;
    while (
      current.parent !== undefined &&
      ts.isPropertyAccessExpression(current.parent) &&
      current.parent.parent !== undefined &&
      ts.isCallExpression(current.parent.parent)
    ) {
      const outer = current.parent.parent;
      if (current.parent.name.text === method) return outer;
      current = outer;
    }
    return undefined;
  }

  /** Outermost call of the fluent chain `call` participates in. */
  chainTail(call: ts.CallExpression): ts.CallExpression {
    let current: ts.CallExpression = call;
    while (
      current.parent !== undefined &&
      ts.isPropertyAccessExpression(current.parent) &&
      current.parent.parent !== undefined &&
      ts.isCallExpression(current.parent.parent)
    ) {
      current = current.parent.parent;
    }
    return current;
  }
}

function calleeName(call: ts.CallExpression): string {
  const expression = call.expression;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (ts.isIdentifier(expression)) return expression.text;
  return expression.getText();
}

function calleeNamePosition(call: ts.CallExpression): number {
  const expression = call.expression;
  const sourceFile = call.getSourceFile();
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.getStart(sourceFile);
  }
  return expression.getStart(sourceFile);
}

function propertyKeyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  return undefined;
}
