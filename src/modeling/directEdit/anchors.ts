// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/directEdit/anchors.ts
//
// Maps a named runtime entity to its AST construction site. Names are the
// viewer's existing identity convention: assembly part names, returned
// variable names, and `sdf.bind` names. Ambiguity fails closed.

import { Project, SyntaxKind, type CallExpression, type Node, type SourceFile } from 'ts-morph';

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

function findCallByStringArg(
  sf: SourceFile,
  expressionPredicate: (text: string) => boolean,
  argIndex: number,
  expected: string,
): CallExpression | null {
  const calls = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const call of calls) {
    if (!expressionPredicate(call.getExpression().getText())) continue;
    const arg = call.getArguments()[argIndex];
    if (arg && unquote(arg.getText()) === expected) return call;
  }
  return null;
}

export function resolveAnchorExpression(sf: SourceFile, anchor: DirectEditAnchor): Node {
  if (anchor.kind === 'variable') {
    const decl = sf.getVariableDeclaration(anchor.name);
    if (!decl) throw new AnchorError(`variable '${anchor.name}' not found`);
    const init = decl.getInitializer();
    if (!init) throw new AnchorError(`variable '${anchor.name}' has no initializer`);
    return init;
  }

  if (anchor.kind === 'part') {
    const call = findCallByStringArg(sf, (text) => text.endsWith('.part'), 0, anchor.name);
    if (!call) throw new AnchorError(`assembly part '${anchor.name}' not found`);
    const shapeArg = call.getArguments()[1];
    if (!shapeArg) throw new AnchorError(`part '${anchor.name}' has no shape argument`);
    return shapeArg;
  }

  const call = findCallByStringArg(sf, (text) => text === 'sdf.bind', 0, anchor.name);
  if (!call) throw new AnchorError(`sdf binding '${anchor.name}' not found`);
  const fieldArg = call.getArguments()[1];
  if (!fieldArg) throw new AnchorError(`sdf binding '${anchor.name}' has no field argument`);
  return fieldArg;
}
