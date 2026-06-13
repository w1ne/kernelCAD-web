import { addNurbsSurfaceTool } from './addNurbsSurface';
import { addSurfaceFromBoundaryTool } from './addSurfaceFromBoundary';

/** The surface-construction kind. Each value maps 1:1 to a dedicated authoring tool. */
export type SurfaceKind = 'nurbs' | 'boundary';

export interface AddSurfaceInput {
  kind: SurfaceKind;
  /**
   * Kind-specific params, forwarded verbatim to the selected authoring tool:
   * - nurbs: { code, controls?, degree?, weights?, knots?, periodic?, section_sketch_ids?, binding_name? }
   * - boundary: { code, curve_bindings, continuity?, sampling?, binding_name? }
   * Each tool fails closed on its own missing required params.
   */
  [key: string]: unknown;
}

/**
 * Unified surface-authoring entrypoint. Replaces add_nurbs_surface and
 * add_surface_from_boundary.
 *
 * Pure routing layer: dispatches on `kind` and forwards all other params to the
 * underlying authoring tool unchanged. The tools' behavior is untouched.
 */
export function addSurfaceTool(input: AddSurfaceInput): Promise<unknown> {
  const { kind, ...rest } = input;
  switch (kind) {
    case 'nurbs':
      return addNurbsSurfaceTool(rest as unknown as Parameters<typeof addNurbsSurfaceTool>[0]);
    case 'boundary':
      return addSurfaceFromBoundaryTool(
        rest as unknown as Parameters<typeof addSurfaceFromBoundaryTool>[0],
      );
    default:
      // Reject (not sync-throw) so the function honors its Promise return type
      // for every input — callers can rely on `.catch(...)`.
      return Promise.reject(
        new Error(`Unknown add_surface kind: ${String(kind)}. Valid: nurbs, boundary.`),
      );
  }
}
