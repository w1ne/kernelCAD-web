// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/directEdit/motionSpec.ts
//
// Derives how a drag maps onto an entity's source transform:
//   param   — the axis argument references a `param()`, edit the param value
//   literal — the axis argument is a numeric literal, edit it in place
//   delta   — computed/uninvertible (or no transform call), append a delta
// Resolution is per axis; plans stay atomic.

import { Node, type CallExpression, type SourceFile } from 'ts-morph';

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

function findOutermostTranslateCall(expr: Node): CallExpression | null {
  if (Node.isCallExpression(expr) && expr.getExpression().getText().endsWith('.translate')) {
    return expr;
  }
  const candidates: CallExpression[] = [];
  const visit = (node: Node): void => {
    if (Node.isCallExpression(node) && node.getExpression().getText().endsWith('.translate')) {
      candidates.push(node);
    }
    node.forEachChild(visit);
  };
  expr.forEachChild(visit);
  return candidates[0] ?? null;
}

function paramMetadataFromCall(call: CallExpression): { name: string; value: number; min?: number; max?: number } | null {
  if (call.getExpression().getText() !== 'param') return null;
  const nameArg = call.getArguments()[0];
  const valueArg = call.getArguments()[1];
  if (!nameArg || !valueArg) return null;
  const name = nameArg.getText().replace(/^['"`]/, '').replace(/['"`]$/, '');
  const value = Number(valueArg.getText());
  if (!Number.isFinite(value)) return null;
  const metaArg = call.getArguments()[2];
  let min: number | undefined;
  let max: number | undefined;
  if (metaArg && Node.isObjectLiteralExpression(metaArg)) {
    for (const prop of metaArg.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) continue;
      const key = prop.getName();
      const raw = Number(prop.getInitializer()?.getText());
      if (!Number.isFinite(raw)) continue;
      if (key === 'min') min = raw;
      if (key === 'max') max = raw;
    }
  }
  return { name, value, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
}

function resolveAxis(axis: Axis, arg: Node | undefined, sf: SourceFile): AxisPlan {
  if (!arg) return { axis, kind: 'delta' };
  if (Node.isNumericLiteral(arg)) {
    return { axis, kind: 'literal', value: Number(arg.getText()), argNode: arg };
  }
  if (Node.isIdentifier(arg)) {
    const decl = sf.getVariableDeclaration(arg.getText());
    const init = decl?.getInitializer();
    if (init && Node.isCallExpression(init)) {
      const meta = paramMetadataFromCall(init);
      if (meta) {
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
    }
  }
  return { axis, kind: 'delta' };
}

export function resolveMotionSpec(expr: Node): MotionSpec {
  const translateCall = findOutermostTranslateCall(expr);
  const sf = expr.getSourceFile();
  if (!translateCall) {
    return {
      translateCall: null,
      hasTranslateCall: false,
      axes: [
        { axis: 0, kind: 'delta' },
        { axis: 1, kind: 'delta' },
        { axis: 2, kind: 'delta' },
      ],
    };
  }
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
