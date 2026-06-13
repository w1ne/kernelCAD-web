import { addPathSplineTool } from './addPathSpline';
import { addPathNurbsSegmentTool } from './addPathNurbsSegment';
import { addPathHermiteG2Tool } from './addPathHermiteG2';

/** The path-segment kind. Each value maps 1:1 to a dedicated authoring tool. */
export type PathSegmentKind = 'spline' | 'nurbs' | 'hermite';

export interface AddPathSegmentInput {
  kind: PathSegmentKind;
  /**
   * Kind-specific params, forwarded verbatim to the selected authoring tool.
   * All kinds share { code, chain_anchor }; additionally:
   * - spline: { points, tension?, startTangent?, endTangent?, binding_name? }
   * - nurbs: { controlPoints, degree?, weights?, knots?, binding_name? }
   * - hermite: { a, b, binding_name? }
   * Each tool fails closed on its own missing required params.
   */
  [key: string]: unknown;
}

/**
 * Unified path-segment-authoring entrypoint. Replaces add_path_spline,
 * add_path_nurbs_segment, and add_path_hermite_g2.
 *
 * Pure routing layer: dispatches on `kind` and forwards all other params to the
 * underlying authoring tool unchanged. The tools' behavior is untouched.
 */
export function addPathSegmentTool(input: AddPathSegmentInput): Promise<unknown> {
  const { kind, ...rest } = input;
  switch (kind) {
    case 'spline':
      return addPathSplineTool(rest as unknown as Parameters<typeof addPathSplineTool>[0]);
    case 'nurbs':
      return addPathNurbsSegmentTool(
        rest as unknown as Parameters<typeof addPathNurbsSegmentTool>[0],
      );
    case 'hermite':
      return addPathHermiteG2Tool(rest as unknown as Parameters<typeof addPathHermiteG2Tool>[0]);
    default:
      // Reject (not sync-throw) so the function honors its Promise return type
      // for every input — callers can rely on `.catch(...)`.
      return Promise.reject(
        new Error(
          `Unknown add_path_segment kind: ${String(kind)}. Valid: spline, nurbs, hermite.`,
        ),
      );
  }
}
