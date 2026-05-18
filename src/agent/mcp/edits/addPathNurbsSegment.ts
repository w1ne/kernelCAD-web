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

export function addPathNurbsSegment(input: AddPathNurbsSegmentInput): AddPathChainResult {
  if (typeof input.chain_anchor !== 'string' || !isValidIdentifier(input.chain_anchor)) {
    return {
      ok: false,
      error: `add_path_nurbs_segment: chain_anchor must be a JS identifier; got ${JSON.stringify(input.chain_anchor)}.`,
    };
  }
  if (!Array.isArray(input.controlPoints) || input.controlPoints.length < 2) {
    return {
      ok: false,
      error: 'add_path_nurbs_segment: controlPoints must be a Vec2[] with at least 2 control points.',
    };
  }
  for (const p of input.controlPoints) {
    if (!Array.isArray(p) || p.length !== 2 || !p.every(n => typeof n === 'number' && Number.isFinite(n))) {
      return {
        ok: false,
        error: 'add_path_nurbs_segment: every controlPoint must be a [x, y] Vec2 of finite numbers.',
      };
    }
  }
  if (input.degree !== undefined && (!Number.isInteger(input.degree) || input.degree < 1)) {
    return {
      ok: false,
      error: `add_path_nurbs_segment: degree must be an integer >= 1; got ${JSON.stringify(input.degree)}.`,
    };
  }
  if (input.weights !== undefined) {
    if (!Array.isArray(input.weights) || input.weights.length !== input.controlPoints.length) {
      return {
        ok: false,
        error: `add_path_nurbs_segment: weights length must equal controlPoints length.`,
      };
    }
    for (const w of input.weights) {
      if (typeof w !== 'number' || !Number.isFinite(w)) {
        return {
          ok: false,
          error: `add_path_nurbs_segment: every weight must be a finite number; got ${JSON.stringify(w)}.`,
        };
      }
    }
  }
  if (input.knots !== undefined) {
    if (!Array.isArray(input.knots) || input.knots.some(k => typeof k !== 'number' || !Number.isFinite(k))) {
      return {
        ok: false,
        error: 'add_path_nurbs_segment: knots must be an array of finite numbers.',
      };
    }
  }

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
