// src/mcp/tools/addFeature.ts
import { addFeature } from '../edits/addFeature';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { defineMCPTool } from '../defineMCPTool';

export interface AddFeatureInput {
  code: string;
  feature_code: string;
}

export interface AddFeatureOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function addFeatureTool(input: AddFeatureInput): Promise<AddFeatureOutput> {
  const edit = addFeature(input.code, input.feature_code);
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

export const addFeatureMcpTool = defineMCPTool<AddFeatureInput>({
  name: 'add_feature',
  description:
    'Insert a new feature line into a kernelCAD script before the last top-level return statement. Returns the modified code as text plus diagnostics from re-evaluating the result. Side-effect-free. Primitives that accept faceLabels (box, cylinder, extrudeRect, extrudeCircle, extrudePolygon, extrudeRoundedRect) can receive `opts.faceLabels` in the inserted code — use `list_api` to see `featureKindFaceLabels` for the full value schema.',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'The .kcad.ts source code.' },
      feature_code: { type: 'string', description: 'Single-statement source line to insert (e.g. `const hole = cylinder(5, 2).translate(10, 10, -1);`).' },
    },
    required: ['code', 'feature_code'],
  },
  handler: addFeatureTool,
});
