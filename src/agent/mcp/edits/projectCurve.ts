// src/agent/mcp/edits/projectCurve.ts
//
// W3: insert a `<shape>.projectCurve({...})` chained call into a .kcad.ts
// script before the last top-level `return`. Pure-string AST edit.

import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';

export interface AddProjectCurveInput {
  /** The .kcad.ts source code to edit. */
  code: string;
  /** Variable name of the Shape to chain onto. */
  target: string;
  /** JS expression returning a closed Sketch / closed path (e.g.
   *  `path().moveTo(0,0).lineTo(10,0).lineTo(10,10).close().build()`).
   *  Inserted verbatim into the emitted call as the `curve:` field. */
  curveExpression: string;
  /** Target face: canonical name or label. */
  face: string;
  /** `Drawing.sketchOnFace` scaling mode; defaults to 'original'. */
  scaleMode?: 'original' | 'native' | 'bounds';
  /** Project as an open edge instead of a closed face-bound sketch.
   *  Currently deferred — the lowerer emits a deferred-feature diagnostic. */
  asEdge?: boolean;
  /** Optional local variable name. Emits `const <bindAs> = <target>.projectCurve(...);`. */
  bindAs?: string;
}

function serializeOpts(input: AddProjectCurveInput): string {
  const fields: string[] = [];
  // curveExpression is inserted verbatim — the caller is responsible for
  // providing a syntactically valid JS expression.
  fields.push(`curve: ${input.curveExpression}`);
  fields.push(`face: '${input.face}'`);
  if (input.scaleMode !== undefined) fields.push(`scaleMode: '${input.scaleMode}'`);
  if (input.asEdge !== undefined) fields.push(`asEdge: ${input.asEdge}`);
  return `{ ${fields.join(', ')} }`;
}

export function addProjectCurve(input: AddProjectCurveInput): AddFeatureResult {
  if (typeof input.target !== 'string' || input.target.length === 0) {
    return { ok: false, error: 'add_project_curve: target Shape variable name is required.' };
  }
  if (typeof input.curveExpression !== 'string' || input.curveExpression.trim().length === 0) {
    return { ok: false, error: 'add_project_curve: curveExpression must be a non-empty JS expression.' };
  }
  const optsLiteral = serializeOpts(input);
  const callExpr = `${input.target}.projectCurve(${optsLiteral})`;
  const featureLine = input.bindAs
    ? `const ${input.bindAs} = ${callExpr};`
    : `${callExpr};`;
  return addFeature(input.code, featureLine);
}
