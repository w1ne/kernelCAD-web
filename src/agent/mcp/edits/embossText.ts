// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/embossText.ts
//
// W3: insert a `<shape>.embossText({...})` chained call into a .kcad.ts
// script before the last top-level `return`. Pure-string AST edit; mirrors
// `addSketchText` / `addNurbsCurve`.

import { addFeature } from './addFeature';
import type { AddFeatureResult } from './addFeature';
import { isValidIdentifier } from './sourceEditUtils';

export interface AddEmbossTextInput {
  /** The .kcad.ts source code to edit. */
  code: string;
  /** Variable name of the Shape to chain onto (inserted verbatim as LHS). */
  target: string;
  /** Text content (UTF-8, non-empty, non-whitespace). */
  textContent: string;
  /** Glyph cap height in mm (positive finite). */
  size: number;
  /** Signed extrusion depth in mm (positive = emboss out, negative = engrave in). */
  depth: number;
  /** Target face: canonical name, label, or omit to let kernel default. */
  face: string;
  /** Optional logical font name or `.ttf` file path. */
  fontFamily?: string;
  /** Horizontal alignment; defaults to 'center'. */
  align?: 'left' | 'center' | 'right';
  /** U anchor in [0, 1]; defaults to 0.5. */
  anchorU?: number;
  /** V anchor in [0, 1]; defaults to 0.5. */
  anchorV?: number;
  /** CCW rotation in degrees, in the face's tangent plane. */
  rotation?: number;
  /** `Drawing.sketchOnFace` scaling mode; defaults to 'original'. */
  scaleMode?: 'original' | 'native' | 'bounds';
  /** Optional local variable name. Emits `const <bindAs> = <target>.embossText(...);`. */
  bindAs?: string;
}

function serializeOpts(input: AddEmbossTextInput): string {
  const fields: string[] = [];
  // Proxy API key is `textContent` (capture/proxy.ts embossText). Emitting
  // `text:` left textContent undefined → a `sketch.text.empty-content` error
  // at evaluation that the old hardcoded `ok: true` masked.
  fields.push(`textContent: ${JSON.stringify(input.textContent)}`);
  fields.push(`size: ${input.size}`);
  fields.push(`depth: ${input.depth}`);
  fields.push(`face: '${input.face}'`);
  if (input.fontFamily !== undefined) {
    const expr = input.fontFamily.endsWith('.ttf')
      ? `fontPath(${JSON.stringify(input.fontFamily)})`
      : JSON.stringify(input.fontFamily);
    fields.push(`fontFamily: ${expr}`);
  }
  if (input.align !== undefined) fields.push(`align: '${input.align}'`);
  if (input.anchorU !== undefined) fields.push(`anchorU: ${input.anchorU}`);
  if (input.anchorV !== undefined) fields.push(`anchorV: ${input.anchorV}`);
  if (input.rotation !== undefined) fields.push(`rotation: ${input.rotation}`);
  if (input.scaleMode !== undefined) fields.push(`scaleMode: '${input.scaleMode}'`);
  return `{ ${fields.join(', ')} }`;
}

function deriveDefaultBinding(code: string): string {
  let max = 0;
  for (const m of code.matchAll(/const\s+_embossed_(\d+)\s*=/g)) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return `_embossed_${max + 1}`;
}

export function addEmbossText(input: AddEmbossTextInput): AddFeatureResult {
  if (typeof input.target !== 'string' || input.target.length === 0) {
    return { ok: false, error: 'add_emboss_text: target Shape variable name is required.' };
  }
  if (!isValidIdentifier(input.target)) {
    return { ok: false, error: `add_emboss_text: target must be a valid JS identifier; got ${JSON.stringify(input.target)}.` };
  }
  if (input.bindAs !== undefined && (typeof input.bindAs !== 'string' || !isValidIdentifier(input.bindAs))) {
    return { ok: false, error: `add_emboss_text: bindAs must be a valid JS identifier; got ${JSON.stringify(input.bindAs)}.` };
  }
  if (typeof input.textContent !== 'string' || input.textContent.trim().length === 0) {
    return { ok: false, error: 'add_emboss_text: textContent must be a non-empty string.' };
  }
  const binding = input.bindAs ?? deriveDefaultBinding(input.code);
  const optsLiteral = serializeOpts(input);
  const featureLine = `const ${binding} = ${input.target}.embossText(${optsLiteral});`;
  return addFeature(input.code, featureLine, { requireReturnRewrite: true });
}
