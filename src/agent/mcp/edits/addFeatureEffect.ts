// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/addFeatureEffect.ts
//
// Safety analysis for add_feature. Shape methods are immutable: they return a
// new Shape and leave the receiver unchanged. Inserting a bare call such as
// `plate.fillet(1.5)` before `return plate;` therefore returns the original
// geometry without any diagnostic. This module classifies the snippet, points
// the return statement at the new value when the intent is unambiguous, and
// fails closed otherwise.

import { parseCode } from '../../../shared/codeGeneration/ast';

export type FeatureCodeEffect =
  | { kind: 'insert' }
  | { kind: 'rewrite-return'; returnLine: string; insertFeatureCode: boolean }
  | { kind: 'reject'; error: string };

interface AcornNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

function asNode(value: unknown): AcornNode | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { type?: unknown; start?: unknown; end?: unknown };
  return typeof candidate.type === 'string'
    && typeof candidate.start === 'number'
    && typeof candidate.end === 'number'
    ? (value as AcornNode)
    : null;
}

function nodeList(value: unknown): AcornNode[] {
  if (!Array.isArray(value)) return [];
  return value.map(asNode).filter((node): node is AcornNode => node !== null);
}

/** Root receiver/callee identifier of a fluent expression, if any. */
function rootIdentifier(node: AcornNode | null): string | null {
  if (!node) return null;
  switch (node.type) {
    case 'Identifier':
      return typeof node.name === 'string' ? node.name : null;
    case 'AwaitExpression':
      return rootIdentifier(asNode(node.argument));
    case 'ChainExpression':
      return rootIdentifier(asNode(node.expression));
    case 'MemberExpression':
      return rootIdentifier(asNode(node.object));
    case 'CallExpression':
      return rootIdentifier(asNode(node.callee));
    default:
      return null;
  }
}

interface ProgramShape {
  statements: AcornNode[];
}

function parseProgram(source: string): ProgramShape | null {
  try {
    return { statements: nodeList((parseCode(source) as unknown as { body?: unknown }).body) };
  } catch {
    // Leave malformed snippets to the evaluator; it reports a real diagnostic.
    return null;
  }
}

interface ReturnSite {
  lineIndex: number;
  target: string | null;
}

function locationLine(node: AcornNode, edge: 'start' | 'end'): number | null {
  const loc = node.loc;
  if (typeof loc !== 'object' || loc === null) return null;
  const line = (loc as Record<string, { line?: unknown } | undefined>)[edge]?.line;
  return typeof line === 'number' ? line : null;
}

function lastReturnStatement(statements: AcornNode[]): AcornNode | null {
  let last: AcornNode | null = null;
  for (const statement of statements) {
    if (statement.type === 'ReturnStatement') last = statement;
  }
  return last;
}

/**
 * The single identifier a return statement exposes, when the whole statement
 * is on one line. Multi-line or complex return expressions are not reported:
 * rewriting them could break the chain.
 */
function returnedIdentifier(statement: AcornNode): string | null {
  const argument = asNode(statement.argument);
  if (argument?.type !== 'Identifier' || typeof argument.name !== 'string') return null;
  const start = locationLine(statement, 'start');
  const end = locationLine(statement, 'end');
  return start !== null && start === end ? argument.name : null;
}

/** Locate the last top-level `return` in the script. */
function findReturnSite(code: string): ReturnSite | null {
  const program = parseProgram(code);
  if (!program) return null;
  const last = lastReturnStatement(program.statements);
  if (!last) return null;
  const start = locationLine(last, 'start');
  if (start === null) return null;
  return { lineIndex: start - 1, target: returnedIdentifier(last) };
}

function leadingWhitespace(line: string): string {
  const match = line.match(/^\s*/);
  return match ? match[0] : '';
}

/** Whether a statement is a string-literal directive (`'use strict';`). */
function isDirective(statement: AcornNode): boolean {
  return statement.type === 'ExpressionStatement'
    && asNode(statement.expression)?.type === 'Literal'
    && typeof (statement.expression as { value?: unknown }).value === 'string';
}

function rejectBareExpression(featureCode: string, returnTarget: string | null): FeatureCodeEffect {
  const targetHint = returnTarget
    ? `The script still returns "${returnTarget}", so the new value is discarded.`
    : 'The script return value does not change, so the new value is discarded.';
  return {
    kind: 'reject',
    error: `feature_code is a bare expression, not an edit of the returned value: ${featureCode.trim()}. `
      + 'Shape methods return a new Shape and do not mutate the receiver. '
      + `${targetHint} `
      + 'Assign the result to a binding used by the return statement (for example '
      + '`const __feature = plate.fillet(1.5); return __feature;`), or return the edited shape directly.',
  };
}

/**
 * Classify how `featureCode` affects the script's last top-level return.
 *
 * - A single bare expression rooted at the returned binding replaces the return
 *   expression (`plate.fillet(1.5)` + `return plate;` -> `return plate.fillet(1.5);`).
 * - Declarations derived from the returned binding chain the return to the last
 *   derived binding (`const f = plate.fillet(1.5)` -> insert + `return f;`).
 * - Any other bare expression fails closed; it cannot change the returned geometry.
 */
function bareExpressionStatements(statements: AcornNode[]): AcornNode[] {
  return statements.filter(
    statement => statement.type === 'ExpressionStatement' && !isDirective(statement),
  );
}

/**
 * A single bare expression over the returned binding can replace the return.
 * Every other bare statement would be discarded, so it fails closed.
 */
function classifyBareCode(
  featureCode: string,
  statements: AcornNode[],
  returnTarget: string | null,
  indent: string,
): FeatureCodeEffect {
  if (statements.length === 1 && returnTarget) {
    const expression = asNode(statements[0].expression);
    // A bare `plate` would rewrite `return plate;` to itself: a silent no-op.
    if (expression && expression.type !== 'Identifier' && rootIdentifier(expression) === returnTarget) {
      const expressionText = featureCode.slice(expression.start, expression.end).trim();
      return {
        kind: 'rewrite-return',
        returnLine: `${indent}return ${expressionText};`,
        insertFeatureCode: false,
      };
    }
  }
  return rejectBareExpression(featureCode, returnTarget);
}

/**
 * Follow declaration chains that start at the returned binding. Only a method
 * chain rooted at a reachable binding is an edit of that object; constructors
 * that merely take it as an argument return a different entity.
 */
function derivedBinding(statements: AcornNode[], returnTarget: string): string | null {
  const reachable = new Set([returnTarget]);
  let derived: string | null = null;
  for (const statement of statements) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declarator of nodeList(statement.declarations)) {
      const id = asNode(declarator.id);
      const init = asNode(declarator.init);
      if (id?.type !== 'Identifier' || typeof id.name !== 'string' || !init) continue;
      const initRoot = rootIdentifier(init);
      if (initRoot === null || !reachable.has(initRoot)) continue;
      reachable.add(id.name);
      derived = id.name;
    }
  }
  return derived;
}

export interface ClassifyFeatureCodeOptions {
  /**
   * When true, a declaration that cannot retarget the top-level `return` fails
   * closed instead of falling back to dead-code insertion.
   */
  requireReturnRewrite?: boolean;
}

function rejectNonReturnedDeclaration(returnTarget: string | null): FeatureCodeEffect {
  const detail = returnTarget
    ? `it does not derive from the returned binding "${returnTarget}"`
    : 'the script does not end with a single-line `return <binding>;`';
  return {
    kind: 'reject',
    error:
      `Shape methods are immutable, so this edit cannot affect the returned geometry because ${detail}. ` +
      `Target the returned binding directly, or update the script so the modified binding is returned.`,
  };
}

export function classifyFeatureCode(
  code: string,
  featureCode: string,
  returnIndex: number,
  options: ClassifyFeatureCodeOptions = {},
): FeatureCodeEffect {
  const program = parseProgram(featureCode);
  if (!program || program.statements.length === 0) return { kind: 'insert' };

  const returnSite = findReturnSite(code);
  const returnTarget = returnSite && returnSite.lineIndex === returnIndex ? returnSite.target : null;
  const indent = leadingWhitespace(code.split('\n')[returnIndex] ?? '');

  if (bareExpressionStatements(program.statements).length > 0) {
    return classifyBareCode(featureCode, program.statements, returnTarget, indent);
  }
  if (!returnTarget) {
    return options.requireReturnRewrite ? rejectNonReturnedDeclaration(null) : { kind: 'insert' };
  }

  const derived = derivedBinding(program.statements, returnTarget);
  if (!derived) {
    return options.requireReturnRewrite ? rejectNonReturnedDeclaration(returnTarget) : { kind: 'insert' };
  }
  return {
    kind: 'rewrite-return',
    returnLine: `${indent}return ${derived};`,
    insertFeatureCode: true,
  };
}
