// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addNurbsCurveTool } from './addNurbsCurve';
import { addHermiteG2Tool } from './addHermiteG2';

/** The curve-construction kind. Each value maps 1:1 to a dedicated authoring tool. */
export type CurveKind = 'nurbs' | 'hermite';

export interface AddCurveInput {
  kind: CurveKind;
  /**
   * Kind-specific params, forwarded verbatim to the selected authoring tool:
   * - nurbs: { code, controlPoints, degree?, weights?, knots?, closed?, binding_name? }
   * - hermite: { code, a, b, binding_name? }
   * Each tool fails closed on its own missing required params.
   */
  [key: string]: unknown;
}

/**
 * Unified 3D-curve-authoring entrypoint. Replaces add_nurbs_curve and
 * add_hermite_g2.
 *
 * Pure routing layer: dispatches on `kind` and forwards all other params to the
 * underlying authoring tool unchanged. The tools' behavior is untouched.
 */
export function addCurveTool(input: AddCurveInput): Promise<unknown> {
  const { kind, ...rest } = input;
  switch (kind) {
    case 'nurbs':
      return addNurbsCurveTool(rest as unknown as Parameters<typeof addNurbsCurveTool>[0]);
    case 'hermite':
      return addHermiteG2Tool(rest as unknown as Parameters<typeof addHermiteG2Tool>[0]);
    default:
      // Reject (not sync-throw) so the function honors its Promise return type
      // for every input — callers can rely on `.catch(...)`.
      return Promise.reject(
        new Error(`Unknown add_curve kind: ${String(kind)}. Valid: nurbs, hermite.`),
      );
  }
}
