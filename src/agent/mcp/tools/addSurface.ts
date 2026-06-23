// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addNurbsSurfaceTool } from './addNurbsSurface';
import { addSurfaceFromBoundaryTool } from './addSurfaceFromBoundary';
import { surfaceTrimTool } from './surfaceTrimTool';
import { surfaceSewTool } from './surfaceSewTool';
import { shapeDraftTool } from './shapeDraftTool';

/**
 * The surface-construction / surface-finishing kind.
 * Each value maps 1:1 to a dedicated authoring tool.
 */
export type SurfaceKind = 'nurbs' | 'boundary' | 'trim' | 'sew' | 'draft';

export interface AddSurfaceInput {
  kind: SurfaceKind;
  /**
   * Kind-specific params, forwarded verbatim to the selected authoring tool:
   * - nurbs:    { code, controls?, degree?, weights?, knots?, periodic?, section_sketch_ids?, binding_name? }
   * - boundary: { code, curve_bindings, continuity?, sampling?, binding_name? }
   * - trim:     { code, surface_binding, by_binding, op: 'trim'|'split', binding_name? }
   * - sew:      { code, surface_bindings, tolerance?, require_closed?, binding_name? }
   * - draft:    { code, shape_binding, angle_deg, face, neutral_plane?, pull_dir?, binding_name? }
   * Each tool fails closed on its own missing required params.
   */
  [key: string]: unknown;
}

/**
 * Unified surface-authoring and surface-finishing entrypoint.
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
    case 'trim':
      return surfaceTrimTool(rest as unknown as Parameters<typeof surfaceTrimTool>[0]);
    case 'sew':
      return surfaceSewTool(rest as unknown as Parameters<typeof surfaceSewTool>[0]);
    case 'draft':
      return shapeDraftTool(rest as unknown as Parameters<typeof shapeDraftTool>[0]);
    default:
      // Reject (not sync-throw) so the function honors its Promise return type
      // for every input — callers can rely on `.catch(...)`.
      return Promise.reject(
        new Error(`Unknown add_surface kind: ${String(kind)}. Valid: nurbs, boundary, trim, sew, draft.`),
      );
  }
}
