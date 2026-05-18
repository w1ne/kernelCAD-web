// src/agent/mcp/edits/addPathHermiteG2.ts
//
// NURBS Slice D Task 4: insert a `.hermiteG2(a, b)` call into an existing
// PathBuilder chain anchored on a named variable. Pure string manipulation —
// shares the chain-injection helper with addPathSpline.

import { injectIntoChain, isValidIdentifier } from './addPathSpline';
import type { AddPathChainResult } from './addPathSpline';

export interface HermiteEndpoint2DInput {
  point: [number, number];
  tangent: [number, number];
  curvature?: [number, number];
}

export interface AddPathHermiteG2Input {
  code: string;
  chain_anchor: string;
  a: HermiteEndpoint2DInput;
  b: HermiteEndpoint2DInput;
  binding_name?: string;
}

function validateEndpoint(label: string, ep: HermiteEndpoint2DInput): string | null {
  if (!ep || typeof ep !== 'object') return `${label} must be an endpoint object.`;
  if (!Array.isArray(ep.point) || ep.point.length !== 2 || !ep.point.every(n => typeof n === 'number' && Number.isFinite(n))) {
    return `${label}.point must be a [x, y] Vec2 of finite numbers.`;
  }
  if (!Array.isArray(ep.tangent) || ep.tangent.length !== 2 || !ep.tangent.every(n => typeof n === 'number' && Number.isFinite(n))) {
    return `${label}.tangent must be a [x, y] Vec2 of finite numbers.`;
  }
  if (ep.curvature !== undefined) {
    if (!Array.isArray(ep.curvature) || ep.curvature.length !== 2 || !ep.curvature.every(n => typeof n === 'number' && Number.isFinite(n))) {
      return `${label}.curvature must be a [x, y] Vec2 of finite numbers when provided.`;
    }
  }
  return null;
}

export function addPathHermiteG2(input: AddPathHermiteG2Input): AddPathChainResult {
  if (typeof input.chain_anchor !== 'string' || !isValidIdentifier(input.chain_anchor)) {
    return {
      ok: false,
      error: `add_path_hermite_g2: chain_anchor must be a JS identifier; got ${JSON.stringify(input.chain_anchor)}.`,
    };
  }
  const aErr = validateEndpoint('a', input.a);
  if (aErr) return { ok: false, error: `add_path_hermite_g2: ${aErr}` };
  const bErr = validateEndpoint('b', input.b);
  if (bErr) return { ok: false, error: `add_path_hermite_g2: ${bErr}` };

  const aLit = endpointLiteral(input.a);
  const bLit = endpointLiteral(input.b);
  const callFragment = `.hermiteG2(${aLit}, ${bLit})`;

  return injectIntoChain(input.code, input.chain_anchor, callFragment);
}

function endpointLiteral(ep: HermiteEndpoint2DInput): string {
  const parts: string[] = [
    `point: ${JSON.stringify(ep.point)}`,
    `tangent: ${JSON.stringify(ep.tangent)}`,
  ];
  if (ep.curvature !== undefined) parts.push(`curvature: ${JSON.stringify(ep.curvature)}`);
  return `{ ${parts.join(', ')} }`;
}
