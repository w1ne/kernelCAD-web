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

function validateSurfaceBlendInput(input: ApplySurfaceBlendInput):
  | { ok: true; operation: 'fillet' | 'chamfer'; amount: number }
  | { ok: false; error: string } {
  const operation = input.operation ?? 'fillet';
  const amountError = surfaceBlendAmountError(operation, input);
  if (!IDENTIFIER.test(input.shape_binding)) return { ok: false, error: 'shape_binding must be a JavaScript identifier.' };
  if (amountError) return { ok: false, error: amountError };
  if (input.continuity !== undefined && input.continuity !== 'G1' && input.continuity !== 'G2') {
    return { ok: false, error: "continuity must be 'G1' or 'G2'." };
  }
  if (surfaceBlendSelectorInvalid(input.selector)) {
    return { ok: false, error: 'selector must be an edge selector string or { face: nameOrQuery }.' };
  }
  return { ok: true, operation, amount: operation === 'fillet' ? input.radius! : input.distance! };
}

function surfaceBlendAmountError(operation: 'fillet' | 'chamfer', input: ApplySurfaceBlendInput): string | undefined {
  const value = operation === 'fillet' ? input.radius : input.distance;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return undefined;
  return operation === 'fillet' ? 'fillet requires a positive finite radius.' : 'chamfer requires a positive finite distance.';
}

function surfaceBlendSelectorInvalid(selector: ApplySurfaceBlendInput['selector']): boolean {
  if (selector === undefined || typeof selector === 'string') return false;
  return !(selector && typeof selector === 'object' && typeof selector.face === 'string');
}

function nextSurfaceBlendBindingInput['selector']): boolean {
  if (selector === undefined || typeof selector === 'string') return false;
  return !(selector && typeof selector === 'object' && typeof selector.face === 'string');
}

function nextSurfaceBlendBindingfunction nextSurfaceBlendBinding(code: string): string {
  const taken = new Set<string>();
  for (const match of code.matchAll(/\bconst\s+(_surface_blend(?:_\d+)?)\b/g)) taken.add(match[1]!);
  if (!taken.has('_surface_blend')) return '_surface_blend';
  let i = 2;
  while (taken.has(`_surface_blend_${i}`)) i += 1;
  return `_surface_blend_${i}`;
}


export async function applySurfaceBlendTool(input: ApplySurfaceBlendInput): Promise<ApplySurfaceBlendOutput> {
  const validated = validateSurfaceBlendInput(input);
  if (!validated.ok) return validated;
  const { operation, amount } = validated;
  const selectorCode = input.selector === undefined ? '' : `, ${JSON.stringify(input.selector)}`;
  const optsCode = operation === 'fillet' && input.continuity ? `, { continuity: ${JSON.stringify(input.continuity)} }` : '';
  const blendBinding = nextSurfaceBlendBinding(input.code);
  const featureCode = `const ${blendBinding} = ${input.shape_binding}.${operation}(${amount}${selectorCode}${optsCode});`;
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
