// src/mcp/tools/addSketchText.ts
//
// MCP tool: AST-edit a `sketch.text(...)` call into a kernelCAD script.
// Defers the actual line insertion to the existing `addFeature` edit helper,
// then re-evaluates the modified script and returns diagnostics.

import { addFeature } from '../edits/addFeature';
import { evaluateScriptTool } from './evaluateScript';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { defineMCPTool } from '../defineMCPTool';

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
    ok: true,
    new_code: edit.new_code,
    diagnostics: evalResult.diagnostics,
  };
}

export const addSketchTextMcpTool = defineMCPTool<AddSketchTextInput>({
  name: 'add_sketch_text',
  description:
    'Insert a sketch.text(...) call into a kernelCAD script before the last top-level return statement. Returns the modified code as text plus diagnostics from re-evaluating the result. Side-effect-free. The emitted sketch is chainable: pair with subsequent .extrude(...) / cut(...) edits to land an engraved or raised text feature. Default font is the runtime-bundled Liberation Sans; pass `font` as a `.ttf` path to load a custom font.',
  inputSchema: {
    type: 'object',
    properties: {
      code:     { type: 'string', description: 'The .kcad.ts source code.' },
      content:  { type: 'string', description: 'Text content (UTF-8, non-empty, non-whitespace).' },
      size:     { type: 'number', description: 'Glyph cap height in mm (positive finite).' },
      font:     { type: 'string', description: 'Optional logical font name or .ttf file path; defaults to bundled Liberation Sans.' },
      align:    { type: 'string', enum: ['left', 'center', 'right'], description: 'Horizontal alignment relative to position. Default left.' },
      position: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] anchor in mm. Default [0, 0].' },
      rotation: { type: 'number', description: 'CCW rotation in degrees around position. Default 0.' },
      bindAs:   { type: 'string', description: 'Optional local variable name; emits const <bindAs> = sketch.text(...).' },
    },
    required: ['code', 'content', 'size'],
  },
  handler: addSketchTextTool,
});
