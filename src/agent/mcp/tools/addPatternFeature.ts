// src/mcp/tools/addPatternFeature.ts
//
// Typed AST-edit MCP tool — composes a Shape.patternLinear / .patternCircular /
// .patternGrid call from structured input and inserts it via the shared
// addFeature helper, then re-evaluates the script.

import { addFeature } from '../edits/addFeature';
import { evaluateScriptTool } from './evaluateScript';
import { validateLinear, validateCircular, validateGridAxis } from '../../../shared/intent/patternValidation';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { defineMCPTool } from '../defineMCPTool';

type Vec3Tuple = [number, number, number];

export interface AddPatternFeatureInput {
  code: string;
  target: string;
  kind: 'linear' | 'circular' | 'grid';
  linear?: { count: number; direction: Vec3Tuple; spacing: number };
  circular?: { count: number; axis: Vec3Tuple; angleDeg?: number };
  grid?: {
    x: { count: number; direction: Vec3Tuple; spacing: number };
    y: { count: number; direction: Vec3Tuple; spacing: number };
  };
  assign_to?: string;
}

export interface AddPatternFeatureOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
  errorCode?: 'feature.pattern.count-out-of-range' | 'feature.invalid-args';
}

function fmtVec3(v: Vec3Tuple): string {
  return `[${v[0]}, ${v[1]}, ${v[2]}]`;
}

export async function addPatternFeatureTool(
  input: AddPatternFeatureInput,
): Promise<AddPatternFeatureOutput> {
  // 1. Kind-arg combo validation.
  if (!input.target || typeof input.target !== 'string') {
    return { ok: false, error: 'target must be a non-empty string.', errorCode: 'feature.invalid-args' };
  }
  let call: string;
  if (input.kind === 'linear') {
    if (!input.linear) return { ok: false, error: "kind: 'linear' requires the `linear` field.", errorCode: 'feature.invalid-args' };
    const err = validateLinear(input.linear);
    if (err) {
      const code = err.field === 'count'
        ? 'feature.pattern.count-out-of-range'
        : 'feature.invalid-args';
      return { ok: false, error: err.message, errorCode: code };
    }
    call = `${input.target}.patternLinear({ count: ${input.linear.count}, direction: ${fmtVec3(input.linear.direction)}, spacing: ${input.linear.spacing} });`;
  } else if (input.kind === 'circular') {
    if (!input.circular) return { ok: false, error: "kind: 'circular' requires the `circular` field.", errorCode: 'feature.invalid-args' };
    const angleDeg = input.circular.angleDeg ?? 360;
    const err = validateCircular({ count: input.circular.count, axis: input.circular.axis, angleDeg });
    if (err) {
      const code = err.field === 'count'
        ? 'feature.pattern.count-out-of-range'
        : 'feature.invalid-args';
      return { ok: false, error: err.message, errorCode: code };
    }
    const angleClause = input.circular.angleDeg !== undefined ? `, angleDeg: ${input.circular.angleDeg}` : '';
    call = `${input.target}.patternCircular({ count: ${input.circular.count}, axis: ${fmtVec3(input.circular.axis)}${angleClause} });`;
  } else if (input.kind === 'grid') {
    if (!input.grid) return { ok: false, error: "kind: 'grid' requires the `grid` field.", errorCode: 'feature.invalid-args' };
    const xErr = validateGridAxis('x', input.grid.x);
    if (xErr) {
      const code = xErr.field.endsWith('count') ? 'feature.pattern.count-out-of-range' : 'feature.invalid-args';
      return { ok: false, error: xErr.message, errorCode: code };
    }
    const yErr = validateGridAxis('y', input.grid.y);
    if (yErr) {
      const code = yErr.field.endsWith('count') ? 'feature.pattern.count-out-of-range' : 'feature.invalid-args';
      return { ok: false, error: yErr.message, errorCode: code };
    }
    call = `${input.target}.patternGrid({ x: { count: ${input.grid.x.count}, direction: ${fmtVec3(input.grid.x.direction)}, spacing: ${input.grid.x.spacing} }, y: { count: ${input.grid.y.count}, direction: ${fmtVec3(input.grid.y.direction)}, spacing: ${input.grid.y.spacing} } });`;
  } else {
    return { ok: false, error: `kind must be 'linear' | 'circular' | 'grid'; got ${String(input.kind)}.`, errorCode: 'feature.invalid-args' };
  }

  const feature_code = input.assign_to ? `const ${input.assign_to} = ${call}` : call;
  const edit = addFeature(input.code, feature_code);
  if (!edit.ok || !edit.new_code) return { ok: false, error: edit.error };
  const evalResult = await evaluateScriptTool({ code: edit.new_code });
  return { ok: true, new_code: edit.new_code, diagnostics: evalResult.diagnostics };
}

export const addPatternFeatureMcpTool = defineMCPTool<AddPatternFeatureInput>({
  name: 'add_pattern_feature',
  description:
    "Insert a Shape.patternLinear / .patternCircular / .patternGrid call into a kernelCAD script before the last top-level return. Pass structured args (kind + the matching spec object). Returns the modified code plus diagnostics from re-evaluating. Side-effect-free. The pattern feature is a single editable unit; pattern-instance face refs resolve via `<sourceId>_pattern_<i>` on the pattern feature's lineage. Geometric note: pattern is implemented as cumulative boolean union of transformed source copies — additive features (boxes, ribs, fins, spokes) pattern cleanly; patterning a subtractive feature (hole, cutout) only preserves the per-instance void when adjacent bodies are disjoint.",
  inputSchema: {
    type: 'object',
    properties: {
      code:      { type: 'string', description: 'The .kcad.ts source code.' },
      target:    { type: 'string', description: 'Variable name of the Shape to pattern (inserted verbatim as the LHS receiver).' },
      kind:      { type: 'string', enum: ['linear', 'circular', 'grid'] },
      linear:    { type: 'object', description: 'Required when kind=linear.', properties: {
        count: { type: 'integer', minimum: 2 },
        direction: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        spacing: { type: 'number' },
      }, required: ['count', 'direction', 'spacing'] },
      circular:  { type: 'object', description: 'Required when kind=circular.', properties: {
        count: { type: 'integer', minimum: 2 },
        axis: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
        angleDeg: { type: 'number', description: 'Optional; defaults to 360.' },
      }, required: ['count', 'axis'] },
      grid:      { type: 'object', description: 'Required when kind=grid.', properties: {
        x: { type: 'object' }, y: { type: 'object' },
      }, required: ['x', 'y'] },
      assign_to: { type: 'string', description: "Optional const-binding name; emits `const <assign_to> = <target>.patternX(...);`. Omit for statement form." },
    },
    required: ['code', 'target', 'kind'],
  },
  handler: addPatternFeatureTool,
});
