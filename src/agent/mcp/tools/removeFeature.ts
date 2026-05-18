// src/mcp/tools/removeFeature.ts
import { removeFeature } from '../edits/removeFeature';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { defineMCPTool } from '../defineMCPTool';

export interface RemoveFeatureInput {
  code: string;
  match: string;
}

export interface RemoveFeatureOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function removeFeatureTool(
  input: RemoveFeatureInput,
): Promise<RemoveFeatureOutput> {
  const edit = removeFeature(input.code, input.match);
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

export const removeFeatureMcpTool = defineMCPTool<RemoveFeatureInput>({
  name: 'remove_feature',
  description:
    'Remove a single line from a kernelCAD script identified by a substring match. Returns the modified code plus diagnostics from re-evaluating. Refuses to remove the line containing the return statement. Side-effect-free.',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'The .kcad.ts source code.' },
      match: { type: 'string', description: 'A substring that uniquely identifies the line to remove (e.g. `const hole = cylinder(5,`).' },
    },
    required: ['code', 'match'],
  },
  handler: removeFeatureTool,
});
