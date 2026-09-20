// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Program } from 'acorn';
import { parseCode } from '../../shared/codeGeneration/ast';

/** Persist edits to directly declared params so save/export use the visible size.
 * Dynamic or ambiguous declarations keep the existing kernel override path. */
export function sourceParamEdits(code: string, edits: { name: string; value: number | boolean | string }[]): string | null {
  let ast: Program;
  try { ast = parseCode(code) as Program; } catch { return null; }
  const calls = ast.body.flatMap(statement => statement.type === 'VariableDeclaration'
    ? statement.declarations.flatMap(declaration => declaration.init?.type === 'CallExpression' ? [declaration.init] : [])
    : []);
  const changes: { start: number; end: number; text: string }[] = [];
  for (const edit of edits) {
    if (typeof edit.value === 'number' && !Number.isFinite(edit.value)) return null;
    const matches = calls.filter(call => call.callee.type === 'Identifier' && call.callee.name === 'param'
      && call.arguments[0]?.type === 'Literal' && call.arguments[0].value === edit.name);
    if (matches.length !== 1) return null;
    const argument = matches[0].arguments[1];
    if (!argument || argument.type === 'SpreadElement') return null;
    changes.push({ start: argument.start, end: argument.end, text: JSON.stringify(edit.value) });
  }
  return changes.sort((a, b) => b.start - a.start).reduce((source, edit) => source.slice(0, edit.start) + edit.text + source.slice(edit.end), code);
}
