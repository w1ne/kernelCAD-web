// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/directEdit/planDrag.ts
//
// Turns a viewer drag (anchor + world-axis delta) into one atomic source edit.
// Pure: parses `input.source` into a throwaway ts-morph project, applies every
// mutation in memory, and returns the rewritten text plus structured
// diagnostics. Nothing is written or executed here.

import type { Node } from 'ts-morph';
import { AnchorError, parseSource, resolveAnchorExpression, type DirectEditAnchor } from './anchors';
import { resolveMotionSpec, type MotionSpec } from './motionSpec';
import { DIAGNOSTIC_REGISTRY } from '../../shared/diagnostics/registry';
import type { NextAction } from '../../shared/diagnostics/nextAction';

export type DragPlanDiagnosticCode =
  | 'feature.direct-edit.clamped'
  | 'feature.direct-edit.delta-wrapper'
  | 'feature.direct-edit.unresolved';

export interface DragPlanDiagnostic {
  code: DragPlanDiagnosticCode;
  severity: 'info' | 'warning' | 'error';
  message: string;
  hint: string;
  nextAction?: NextAction;
}

export interface PlanDragInput {
  source: string;
  anchor: DirectEditAnchor;
  delta: readonly [number, number, number];
  mated?: boolean;
}

export interface DragPlan {
  fromCode: string;
  toCode: string | null;
  anchor: DirectEditAnchor;
  spec: MotionSpec | null;
  diagnostics: readonly DragPlanDiagnostic[];
  intent: string;
}

/** Marker appended after a delta wrapper so later plans can recognize it. */
const DELTA_MARKER = ' /* @direct-edit */';

/** Rounds to 3 decimals; normalizes -0 so intent strings stay canonical. */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function clampedDiagnostic(paramName: string, bound: 'min' | 'max', limit: number): DragPlanDiagnostic {
  const spec = DIAGNOSTIC_REGISTRY['feature.direct-edit.clamped'];
  return {
    code: 'feature.direct-edit.clamped',
    severity: 'info',
    message: `param '${paramName}' clamped to ${bound} ${formatNumber(limit)}`,
    hint: spec.hintTemplate,
    nextAction: spec.nextAction,
  };
}

function deltaWrapperDiagnostic(): DragPlanDiagnostic {
  const spec = DIAGNOSTIC_REGISTRY['feature.direct-edit.delta-wrapper'];
  return {
    code: 'feature.direct-edit.delta-wrapper',
    severity: 'warning',
    message:
      'could not invert a computed transform axis; appended a marked .translate(...) delta wrapper',
    hint: spec.hintTemplate,
    nextAction: spec.nextAction,
  };
}

function unresolvedDiagnostic(message: string): DragPlanDiagnostic {
  const spec = DIAGNOSTIC_REGISTRY['feature.direct-edit.unresolved'];
  return {
    code: 'feature.direct-edit.unresolved',
    severity: 'error',
    message,
    hint: spec.hintTemplate,
    nextAction: spec.nextAction,
  };
}

export function planDrag(input: PlanDragInput): DragPlan {
  const { source, anchor, delta } = input;
  const intent =
    `Translate ${anchor.kind} '${anchor.name}' by ` +
    `(${formatNumber(delta[0])}, ${formatNumber(delta[1])}, ${formatNumber(delta[2])}) mm`;
  const base = { fromCode: source, anchor, spec: null, intent } as const;

  if (input.mated) {
    return {
      ...base,
      toCode: null,
      diagnostics: [
        unresolvedDiagnostic(
          `${anchor.kind} '${anchor.name}' is mate-driven; a direct-edit drag cannot move it — edit the mate instead`,
        ),
      ],
    };
  }

  const sf = parseSource(source);
  let expr: Node;
  try {
    expr = resolveAnchorExpression(sf, anchor);
  } catch (error) {
    if (!(error instanceof AnchorError)) throw error;
    return { ...base, toCode: null, diagnostics: [unresolvedDiagnostic(error.message)] };
  }

  const spec = resolveMotionSpec(expr);
  const diagnostics: DragPlanDiagnostic[] = [];
  const pendingDeltas: [number, number, number] = [0, 0, 0];

  // In-place edits first; the delta append below rewrites `expr` wholesale, so
  // its descendants must already be settled when `expr.getText()` is read.
  for (const axis of [0, 1, 2] as const) {
    const axisPlan = spec.axes[axis];
    const axisDelta = delta[axis];
    if (axisPlan.kind === 'param') {
      const raw = axisPlan.declaredValue + axisDelta;
      let next = raw;
      if (axisPlan.min !== undefined && next < axisPlan.min) {
        next = axisPlan.min;
        diagnostics.push(clampedDiagnostic(axisPlan.paramName, 'min', axisPlan.min));
      } else if (axisPlan.max !== undefined && next > axisPlan.max) {
        next = axisPlan.max;
        diagnostics.push(clampedDiagnostic(axisPlan.paramName, 'max', axisPlan.max));
      }
      axisPlan.paramCall.getArguments()[1].replaceWithText(formatNumber(next));
    } else if (axisPlan.kind === 'literal') {
      axisPlan.argNode.replaceWithText(formatNumber(axisPlan.value + axisDelta));
    } else {
      pendingDeltas[axis] += axisDelta;
    }
  }

  if (pendingDeltas.some((value) => value !== 0)) {
    const appended = `.translate(${pendingDeltas.map(formatNumber).join(', ')})`;
    if (spec.hasTranslateCall) {
      expr.replaceWithText(`${expr.getText()}${appended}${DELTA_MARKER}`);
      diagnostics.push(deltaWrapperDiagnostic());
    } else {
      // No transform to wrap: a plain append is the whole edit, no marker.
      expr.replaceWithText(`${expr.getText()}${appended}`);
    }
  }

  return { ...base, spec, toCode: sf.getFullText(), diagnostics };
}
