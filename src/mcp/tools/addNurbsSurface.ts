import { addNurbsSurface } from '../edits/addNurbsSurface';
import type { AddNurbsSurfaceInput } from '../edits/addNurbsSurface';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';

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
