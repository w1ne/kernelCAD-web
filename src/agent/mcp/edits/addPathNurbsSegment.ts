// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/addPathNurbsSegment.ts
//
// NURBS Slice D Task 4: insert a `.nurbsSegment([...], opts?)` call into an
// existing PathBuilder chain anchored on a named variable. Pure string
// manipulation — shares the chain-injection helper with addPathSpline.

import { injectIntoChain, isValidIdentifier } from './addPathSpline';
import type { AddPathChainResult } from './addPathSpline';

export interface AddPathNurbsSegmentInput {
  code: string;
  chain_anchor: string;
  controlPoints: Array<[number, number]>;
  degree?: number;
  weights?: number[];
  knots?: number[];
  binding_name?: string;
}

/** Returns an error string when the anchor is invalid, else null. */
function validateChainAnchor(anchor: unknown): string | null {
  if (typeof anchor !== 'string' || !isValidIdentifier(anchor)) {
    return `add_path_nurbs_segment: chain_anchor must be a JS identifier; got ${JSON.stringify(anchor)}.`;
  }
  return null;
}

/** Returns an error string when the control-point list is invalid, else null. */
function validateControlPoints(controlPoints: Array<[number, number]>): string | null {
  if (!Array.isArray(controlPoints) || controlPoints.length < 2) {
    return 'add_path_nurbs_segment: controlPoints must be a Vec2[] with at least 2 control points.';
  }
  for (const p of controlPoints) {
    if (!Array.isArray(p) || p.length !== 2 || !p.every(n => typeof n === 'number' && Number.isFinite(n))) {
      return 'add_path_nurbs_segment: every controlPoint must be a [x, y] Vec2 of finite numbers.';
    }
  }
  return null;
}

/** Returns an error string when degree/weights/knots are invalid, else null. */
function validateNurbsOptions(input: AddPathNurbsSegmentInput): string | null {
  if (input.degree !== undefined && (!Number.isInteger(input.degree) || input.degree < 1)) {
    return `add_path_nurbs_segment: degree must be an integer >= 1; got ${JSON.stringify(input.degree)}.`;
  }
  if (input.weights !== undefined) {
    if (!Array.isArray(input.weights) || input.weights.length !== input.controlPoints.length) {
      return `add_path_nurbs_segment: weights length must equal controlPoints length.`;
    }
    for (const w of input.weights) {
      if (typeof w !== 'number' || !Number.isFinite(w)) {
        return `add_path_nurbs_segment: every weight must be a finite number; got ${JSON.stringify(w)}.`;
      }
    }
  }
  if (input.knots !== undefined) {
    if (!Array.isArray(input.knots) || input.knots.some(k => typeof k !== 'number' || !Number.isFinite(k))) {
      return 'add_path_nurbs_segment: knots must be an array of finite numbers.';
    }
  }
  return null;
}

export function addPathNurbsSegment(input: AddPathNurbsSegmentInput): AddPathChainResult {
  const anchorError = validateChainAnchor(input.chain_anchor);
  if (anchorError !== null) return { ok: false, error: anchorError };
  const controlPointsError = validateControlPoints(input.controlPoints);
  if (controlPointsError !== null) return { ok: false, error: controlPointsError };
  const optionsError = validateNurbsOptions(input);
  if (optionsError !== null) return { ok: false, error: optionsError };

  const controlPointsLiteral = JSON.stringify(input.controlPoints);
  const optsParts: string[] = [];
  if (input.degree !== undefined) optsParts.push(`degree: ${JSON.stringify(input.degree)}`);
  if (input.weights !== undefined) optsParts.push(`weights: ${JSON.stringify(input.weights)}`);
  if (input.knots !== undefined) optsParts.push(`knots: ${JSON.stringify(input.knots)}`);

  const callFragment = optsParts.length > 0
    ? `.nurbsSegment(${controlPointsLiteral}, { ${optsParts.join(', ')} })`
    : `.nurbsSegment(${controlPointsLiteral})`;

  return injectIntoChain(input.code, input.chain_anchor, callFragment);
}
