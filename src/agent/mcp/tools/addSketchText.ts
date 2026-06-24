// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/addSketchText.ts
//
// MCP tool: AST-edit a `sketch.text(...)` call into a kernelCAD script.
// Defers the actual line insertion to the existing `addFeature` edit helper,
// then re-evaluates the modified script and returns diagnostics.

import { addFeature } from '../edits/addFeature';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

export interface AddSketchTextInput {
  /** The .kcad.ts source code to edit. */
  code: string;
  /** Text content (UTF-8). Must be non-empty / non-whitespace-only. */
  content: string;
  /** Glyph cap height in mm. Positive finite. */
  size: number;
  /** Logical font name OR a font file path (TTF). Defaults to bundled Liberation Sans. */
  font?: string;
  /** Alignment; default 'left'. */
  align?: 'left' | 'center' | 'right';
  /** 2D anchor position in mm; default [0, 0]. */
  position?: [number, number];
  /** Rotation in degrees CCW; default 0. */
  rotation?: number;
  /** Optional local variable name. If provided, emits
   *  `const <bindAs> = sketch.text(...);`. Otherwise unbound expression. */
  bindAs?: string;
}

export interface AddSketchTextOutput {
  ok: boolean;
  new_code?: string;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

function serializeOpts(input: AddSketchTextInput): string {
  const fields: string[] = [`size: ${input.size}`];
  if (input.align !== undefined) fields.push(`align: '${input.align}'`);
  if (input.position !== undefined) fields.push(`position: [${input.position[0]}, ${input.position[1]}]`);
  if (input.rotation !== undefined) fields.push(`rotation: ${input.rotation}`);
  if (input.font !== undefined) {
    // If font ends in .ttf, wrap in fontPath(...); else use as a logical name.
    const expr = input.font.endsWith('.ttf')
      ? `fontPath(${JSON.stringify(input.font)})`
      : JSON.stringify(input.font);
    fields.push(`font: ${expr}`);
  }
  return `{ ${fields.join(', ')} }`;
}

export async function addSketchTextTool(input: AddSketchTextInput): Promise<AddSketchTextOutput> {
  const optsLiteral = serializeOpts(input);
  const callExpr = `sketch.text(${JSON.stringify(input.content)}, ${optsLiteral})`;
  const featureLine = input.bindAs
    ? `const ${input.bindAs} = ${callExpr};`
    : `${callExpr};`;
  const edit = addFeature(input.code, featureLine);
  if (!edit.ok || !edit.new_code) {
    return { ok: false, error: edit.error };
  }
  const evalResult = await evaluateScriptTool({ code: edit.new_code });
  return {
    ok: evalResult.ok,
    new_code: edit.new_code,
    diagnostics: evalResult.diagnostics,
  };
}
