// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/directEdit/motionSpec.ts
//
// Derives how a drag maps onto an entity's source transform:
//   param   — the axis argument references a `param()`, edit the param value
//   literal — the axis argument is a numeric literal, edit it in place
//   delta   — computed/uninvertible (or no transform call), append a delta
// Resolution is per axis; plans stay atomic.

import { Node, SyntaxKind, type CallExpression, type SourceFile, type VariableDeclaration } from 'ts-morph';

export type Axis = 0 | 1 | 2;

export type AxisPlan =
  | {
      axis: Axis;
      kind: 'param';
      paramName: string;
      declaredValue: number;
      min?: number;
      max?: number;
      argNode: Node;
      /** The `param(...)` call that declares this value. */
      paramCall: CallExpression;
    }
  | { axis: Axis; kind: 'literal'; value: number; argNode: Node }
  | { axis: Axis; kind: 'delta' };

export interface MotionSpec {
  /** Outermost `.translate(...)` call in the expression chain, if any. */
  translateCall: CallExpression | null;
  hasTranslateCall: boolean;
  axes: [AxisPlan, AxisPlan, AxisPlan];
}

/** Calls that preserve an entity's world transform when appended after `.translate`. */
const TRANSPARENT_TRAILING_CALLS = new Set(['color', 'material']);

function axesAsDeltas(): [AxisPlan, AxisPlan, AxisPlan] {
  return [
    { axis: 0, kind: 'delta' },
    { axis: 1, kind: 'delta' },
    { axis: 2, kind: 'delta' },
  ];
}

function numericValueOf(node: Node | undefined): number | null {
  if (!node) return null;
  if (Node.isNumericLiteral(node)) {
    const value = node.getLiteralValue();
    return Number.isFinite(value) ? value : null;
  }
  if (Node.isPrefixUnaryExpression(node)) {
    const operator = node.getOperatorToken();
    if (operator !== SyntaxKind.MinusToken && operator !== SyntaxKind.PlusToken) return null;
    const operand = numericValueOf(node.getOperand());
    if (operand === null) return null;
    return operator === SyntaxKind.MinusToken ? -operand : operand;
  }
  if (Node.isParenthesizedExpression(node)) {
    return numericValueOf(node.getExpression());
  }
  return null;
}

function unwrapParentheses(node: Node): Node {
  let current = node;
  while (Node.isParenthesizedExpression(current)) {
    current = current.getExpression();
  }
  return current;
}

function isCalleeChainChild(child: Node, parent: Node): boolean {
  return (
    (Node.isPropertyAccessExpression(parent) && parent.getExpression() === child) ||
    (Node.isCallExpression(parent) && parent.getExpression() === child)
  );
}

/**
 * Returns the calls applied after `call` along the callee spine up to `expr`,
 * or null when `expr` is not reachable through callee positions (e.g. the call
 * sits in an argument of an enclosing call).
 */
function callsAfterOnSpine(call: Node, expr: Node): CallExpression[] | null {
  const after: CallExpression[] = [];
  let node: Node = call;
  while (node !== expr) {
    const parent = node.getParent();
    if (!parent || !isCalleeChainChild(node, parent)) return null;
    if (Node.isPropertyAccessExpression(parent)) {
      const grandparent = parent.getParent();
      if (grandparent && Node.isCallExpression(grandparent) && grandparent.getExpression() === parent) {
        after.push(grandparent);
      }
    }
    node = parent;
  }
  return after;
}

function findOutermostTranslateCall(expr: Node): CallExpression | null {
  const candidates: CallExpression[] = [];
  const collect = (node: Node): void => {
    if (Node.isCallExpression(node) && node.getExpression().getText().endsWith('.translate')) {
      candidates.push(node);
    }
    node.forEachChild(collect);
  };
  collect(expr);
  return candidates.find((candidate) => callsAfterOnSpine(candidate, expr) !== null) ?? null;
}

function paramMetadataFromCall(call: CallExpression): { name: string; value: number; min?: number; max?: number } | null {
  if (call.getExpression().getText() !== 'param') return null;
  const nameArg = call.getArguments()[0];
  const valueArg = call.getArguments()[1];
  if (!nameArg || !valueArg || !Node.isStringLiteral(nameArg)) return null;
  const name = nameArg.getLiteralValue();
  const value = numericValueOf(valueArg);
  if (value === null) return null;
  const metaArg = call.getArguments()[2];
  let min: number | undefined;
  let max: number | undefined;
  if (metaArg && Node.isObjectLiteralExpression(metaArg)) {
    for (const prop of metaArg.getProperties()) {
      // Shorthand bounds (e.g. `{ min, max }`) are not resolved; those bounds are dropped.
      if (!Node.isPropertyAssignment(prop)) continue;
      const key = prop.getName();
      const raw = numericValueOf(prop.getInitializer());
      if (raw === null) continue;
      if (key === 'min') min = raw;
      if (key === 'max') max = raw;
    }
  }
  return { name, value, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
}

function resolveVariableDeclaration(identifier: Node, sf: SourceFile): VariableDeclaration | null {
  const symbol = identifier.getSymbol();
  if (symbol) {
    const declarations = symbol.getDeclarations();
    if (declarations.length !== 1) return null;
    const declaration = declarations[0];
    return Node.isVariableDeclaration(declaration) ? declaration : null;
  }
  // Symbols can be unavailable (e.g. unresolved identifiers); fail closed
  // unless the file-wide name is declared exactly once.
  const declarations = sf
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .filter((declaration) => declaration.getName() === identifier.getText());
  return declarations.length === 1 ? declarations[0] : null;
}

function resolveAxis(axis: Axis, arg: Node | undefined, sf: SourceFile): AxisPlan {
  if (!arg) return { axis, kind: 'delta' };
  const literalValue = numericValueOf(arg);
  if (literalValue !== null) {
    return { axis, kind: 'literal', value: literalValue, argNode: arg };
  }
  const target = unwrapParentheses(arg);
  if (!Node.isIdentifier(target)) return { axis, kind: 'delta' };
  const declaration = resolveVariableDeclaration(target, sf);
  if (!declaration) return { axis, kind: 'delta' };
  const init = declaration.getInitializer();
  if (!init || !Node.isCallExpression(init)) return { axis, kind: 'delta' };
  const meta = paramMetadataFromCall(init);
  if (!meta) return { axis, kind: 'delta' };
  return {
    axis,
    kind: 'param',
    paramName: meta.name,
    declaredValue: meta.value,
    ...(meta.min !== undefined ? { min: meta.min } : {}),
    ...(meta.max !== undefined ? { max: meta.max } : {}),
    argNode: arg,
    paramCall: init,
  };
}

export function resolveMotionSpec(expr: Node): MotionSpec {
  const translateCall = findOutermostTranslateCall(expr);
  if (!translateCall) {
    return { translateCall: null, hasTranslateCall: false, axes: axesAsDeltas() };
  }
  const trailing = callsAfterOnSpine(translateCall, expr);
  const editable =
    trailing !== null &&
    trailing.every((call) => {
      const callee = call.getExpression();
      return Node.isPropertyAccessExpression(callee) && TRANSPARENT_TRAILING_CALLS.has(callee.getName());
    });
  if (!editable) {
    // A transform after `.translate` makes local axes diverge from world axes;
    // appending a world-axis delta at the end of the chain is correct instead.
    return { translateCall, hasTranslateCall: true, axes: axesAsDeltas() };
  }
  const sf = expr.getSourceFile();
  const args = translateCall.getArguments();
  return {
    translateCall,
    hasTranslateCall: true,
    axes: [
      resolveAxis(0, args[0], sf),
      resolveAxis(1, args[1], sf),
      resolveAxis(2, args[2], sf),
    ],
  };
}
