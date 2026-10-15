// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addFeature } from '../edits/addFeature';
import { evaluateScriptTool, type EvaluateScriptOutput } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { SceneSummary } from '../../script-runtime/sceneSummary';

export interface ApplySurfaceBlendInput {
  code: string;
  shape_binding: string;
  operation?: 'fillet' | 'chamfer';
  radius?: number;
  distance?: number;
  selector?: string | { face: string };
  continuity?: 'G1' | 'G2';
}

export interface ApplySurfaceBlendOutput {
  ok: boolean;
  new_code?: string;
  operation?: 'fillet' | 'chamfer';
  selector?: ApplySurfaceBlendInput['selector'];
  step?: EvaluateScriptOutput['step'];
  sceneSummary?: SceneSummary;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

export async function applySurfaceBlendTool(input: ApplySurfaceBlendInput): Promise<ApplySurfaceBlendOutput> {
  const operation = input.operation ?? 'fillet';
  if (!IDENTIFIER.test(input.shape_binding)) return { ok: false, error: 'shape_binding must be a JavaScript identifier.' };
  if (operation === 'fillet' && !(typeof input.radius === 'number' && Number.isFinite(input.radius) && input.radius > 0)) {
    return { ok: false, error: 'fillet requires a positive finite radius.' };
  }
  if (operation === 'chamfer' && !(typeof input.distance === 'number' && Number.isFinite(input.distance) && input.distance > 0)) {
    return { ok: false, error: 'chamfer requires a positive finite distance.' };
  }
  if (input.continuity !== undefined && input.continuity !== 'G1' && input.continuity !== 'G2') {
    return { ok: false, error: "continuity must be 'G1' or 'G2'." };
  }
  if (input.selector !== undefined && typeof input.selector !== 'string'
      && !(input.selector && typeof input.selector === 'object' && typeof input.selector.face === 'string')) {
    return { ok: false, error: 'selector must be an edge selector string or { face: nameOrQuery }.' };
  }
  const selectorCode = input.selector === undefined ? '' : `, ${JSON.stringify(input.selector)}`;
  const optsCode = operation === 'fillet' && input.continuity ? `, { continuity: ${JSON.stringify(input.continuity)} }` : '';
  const amount = operation === 'fillet' ? input.radius : input.distance;
  const featureCode = `const _surface_blend = ${input.shape_binding}.${operation}(${amount}${selectorCode}${optsCode});`;
  const edit = addFeature(input.code, featureCode);
  if (!edit.ok || !edit.new_code) return { ok: false, error: edit.error };
  const evaluated = await evaluateScriptTool({ code: edit.new_code });
  return {
    ok: evaluated.ok,
    new_code: edit.new_code,
    operation,
    ...(input.selector === undefined ? {} : { selector: input.selector }),
    step: evaluated.step,
    sceneSummary: evaluated.sceneSummary,
    diagnostics: evaluated.diagnostics,
  };
}
