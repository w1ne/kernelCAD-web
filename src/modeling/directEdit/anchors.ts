// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/directEdit/anchors.ts
//
// Maps a named runtime entity to its AST construction site. Names are the
// viewer's existing identity convention: assembly part names, returned
// variable names, and `sdf.bind` names. Ambiguity fails closed.

import { Node, Project, SyntaxKind, type CallExpression, type SourceFile } from 'ts-morph';
import { expressionCarriesTransform } from './motionSpec';

export type DirectEditAnchor =
  | { kind: 'part'; name: string }
  | { kind: 'variable'; name: string }
  | { kind: 'sdfBinding'; name: string };

export class AnchorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnchorError';
  }
}

export function parseSource(source: string): SourceFile {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true, target: 99 },
  });
  return project.createSourceFile('model.ts', source, { overwrite: true });
}

function unquote(text: string): string {
  return text.replace(/^['"`]/, '').replace(/['"`]$/, '');
}

function findCallsByStringArg(
  sf: SourceFile,
  expressionPredicate: (text: string) => boolean,
  argIndex: number,
  expected: string,
): CallExpression[] {
  const matches: CallExpression[] = [];
  const calls = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const call of calls) {
    if (!expressionPredicate(call.getExpression().getText())) continue;
    const arg = call.getArguments()[argIndex];
    if (arg && unquote(arg.getText()) === expected) matches.push(call);
  }
  return matches;
}

function resolveUniqueCall(
  sf: SourceFile,
  expressionPredicate: (text: string) => boolean,
  argIndex: number,
  expected: string,
  notFoundMessage: string,
  ambiguousLabel: string,
): CallExpression {
  const matches = findCallsByStringArg(sf, expressionPredicate, argIndex, expected);
  if (matches.length === 0) throw new AnchorError(notFoundMessage);
  if (matches.length > 1) {
    throw new AnchorError(
      `ambiguous ${ambiguousLabel} '${expected}' (${matches.length} call sites); rename one or qualify the anchor`,
    );
  }
  return matches[0];
}

/** True when `expr` contains a value reference to `name` (property keys do
 *  not count). Used to tell "reassigned from itself" (`u = u.subtract(...)`)
 *  apart from "replaced by unrelated geometry" (`u = box(2, 2, 2)`). */
function expressionReferencesName(expr: Node, name: string): boolean {
  if (Node.isIdentifier(expr)) return expr.getText() === name;
  return expr.getDescendantsOfKind(SyntaxKind.Identifier).some((identifier) => {
    if (identifier.getText() !== name) return false;
    const parent = identifier.getParent();
    if (parent && Node.isPropertyAccessExpression(parent) && parent.getNameNode() === identifier) {
      return false;
    }
    if (parent && Node.isPropertyAssignment(parent)) return false;
    return true;
  });
}

/**
 * The planner rewrites the anchor's initializer, so the anchor must be the
 * one place the target geometry is derived. Fail closed:
 * - any reassignment whose RHS does not derive from the anchor replaces the
 *   target with unrelated geometry — the planner would edit a dead
 *   initializer while the viewport previews the replacement;
 * - a self-derived reassignment carrying a transform still invalidates the
 *   initializer's frame (pre-existing rule).
 */
function assertNoUnsafeReassignment(sf: SourceFile, name: string): void {
  const assignments = sf.getDescendantsOfKind(SyntaxKind.BinaryExpression).filter((expr) => {
    if (expr.getOperatorToken().getKind() !== SyntaxKind.EqualsToken) return false;
    return expr.getLeft().getText().trim() === name;
  });
  for (const assignment of assignments) {
    const rhs = assignment.getRight();
    if (!expressionReferencesName(rhs, name)) {
      throw new AnchorError(
        `variable '${name}' is reassigned to a value that does not derive from it; drag cannot target it safely`,
      );
    }
    if (expressionCarriesTransform(rhs)) {
      throw new AnchorError(
        `variable '${name}' is reassigned with a transform after its declaration; drag cannot target it safely`,
      );
    }
  }
}

export function resolveAnchorExpression(sf: SourceFile, anchor: DirectEditAnchor): Node {
  if (anchor.kind === 'variable') {
    const decls = sf
      .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
      .filter((decl) => decl.getName() === anchor.name);
    if (decls.length === 0) throw new AnchorError(`variable '${anchor.name}' not found`);
    if (decls.length > 1) {
      throw new AnchorError(
        `ambiguous variable '${anchor.name}' (${decls.length} declarations); rename one or qualify the anchor`,
      );
    }
    const init = decls[0].getInitializer();
    if (!init) throw new AnchorError(`variable '${anchor.name}' has no initializer`);
    assertNoUnsafeReassignment(sf, anchor.name);
    return init;
  }

  if (anchor.kind === 'part') {
    const call = resolveUniqueCall(
      sf,
      (text) => text.endsWith('.part'),
      0,
      anchor.name,
      `assembly part '${anchor.name}' not found`,
      'assembly part',
    );
    const shapeArg = call.getArguments()[1];
    if (!shapeArg) throw new AnchorError(`part '${anchor.name}' has no shape argument`);
    return shapeArg;
  }

  const call = resolveUniqueCall(
    sf,
    (text) => text === 'sdf.bind',
    0,
    anchor.name,
    `sdf binding '${anchor.name}' not found`,
    'sdf binding',
  );
  const fieldArg = call.getArguments()[1];
  if (!fieldArg) throw new AnchorError(`sdf binding '${anchor.name}' has no field argument`);
  return fieldArg;
}
