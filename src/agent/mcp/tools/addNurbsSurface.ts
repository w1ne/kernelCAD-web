import { addNurbsSurface } from '../edits/addNurbsSurface';
import type { AddNurbsSurfaceInput } from '../edits/addNurbsSurface';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { defineMCPTool } from '../defineMCPTool';

export type { AddNurbsSurfaceInput };

export interface AddNurbsSurfaceOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

/**
 * MCP tool entry for `add_nurbs_surface`.
 *
 * Inserts a `nurbsSurface(...)` or `surfaceFromCurves(...)` statement into
 * the user's `.kcad.ts`. The returned `Surface` binding does NOT produce a
 * `Shape` until you chain `.thicken(t)` or `.toShape()` on it (which the
 * existing `add_feature` MCP tool handles).
 *
 * Re-evaluates the modified script and returns its diagnostics so callers
 * see capture-time validation failures (e.g. nurbs.degenerate-controls)
 * before they commit the edit.
 */
export async function addNurbsSurfaceTool(input: AddNurbsSurfaceInput): Promise<AddNurbsSurfaceOutput> {
  const edit = addNurbsSurface(input);
  if (!edit.ok || !edit.new_code) {
    return { ok: false, error: edit.error };
  }
  const evalResult = await evaluateScriptTool({ code: edit.new_code });
  return {
    ok: true,
    new_code: edit.new_code,
    diagnostics: evalResult.diagnostics,
  };
}

export const addNurbsSurfaceMcpTool = defineMCPTool<AddNurbsSurfaceInput>({
  name: 'add_nurbs_surface',
  description:
    "Insert a nurbsSurface(...) or surfaceFromCurves(...) call into the user's .kcad.ts. The returned Surface is captured but produces no Shape until you chain .thicken(t) or .toShape() (do that via add_feature on the binding name). Pass either { controls, degree, weights?, knots?, periodic? } for direct construction, OR { section_sketch_ids } for skinning. Returns the modified code + diagnostics. Slice-1 limitation: weights are accepted but currently ignored (TColStd_Array2OfReal not exposed in WASM bindings); surfaces are non-rational.",
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Current .kcad.ts source.' },
      controls: {
        type: 'array',
        description: 'Control-point grid for direct construction (controls[u][v] = [x, y, z], mm).',
        items: {
          type: 'array',
          items: { type: 'array', items: { type: 'number' } },
        },
      },
      weights: {
        type: 'array',
        description: 'Optional rational weights, same grid shape as controls. Ignored in slice-1.',
        items: { type: 'array', items: { type: 'number' } },
      },
      degree: {
        type: 'object',
        description: 'Degrees in U and V; each in [1, nU-1] / [1, nV-1].',
        properties: {
          u: { type: 'integer', minimum: 1 },
          v: { type: 'integer', minimum: 1 },
        },
        required: ['u', 'v'],
      },
      knots: {
        type: 'object',
        description: 'Optional explicit knot vectors; missing => clamped uniform inferred.',
        properties: {
          u: { type: 'array', items: { type: 'number' } },
          v: { type: 'array', items: { type: 'number' } },
        },
      },
      periodic: {
        type: 'object',
        description: 'Optional periodic flags per parametric direction.',
        properties: {
          u: { type: 'boolean' },
          v: { type: 'boolean' },
        },
      },
      section_sketch_ids: {
        type: 'array',
        description: 'Existing sketch FeatureIds (2 or more) to skin a surface through, in order.',
        items: { type: 'string' },
      },
      binding_name: {
        type: 'string',
        description: 'JS const name for the new Surface binding (default: surface_<N>).',
      },
    },
    required: ['code'],
  },
  handler: addNurbsSurfaceTool,
});
