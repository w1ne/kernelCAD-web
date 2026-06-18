// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/backends/occt/textLowerer.ts
//
// Lower a sketch FeatureRecord whose metadata carries text content (instead of
// a SketchCommand polyline) into a sketch-tagged OcctBackend. Uses
// replicad.drawText + opentype.js (transitive) to materialize glyph outlines,
// then applies alignment, position, and rotation as 2D Drawing transforms.

import * as replicad from 'replicad';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { OcctBackend } from './occtBackend';
import { resolveAndLoadFont } from '../../../shared/fonts/index';
import { KernelError } from '../../../shared/intent/kernelError';

export interface TextMetadata {
  textContent: string;
  textOpts: {
    size: { evaluated: number };
    align: 'left' | 'center' | 'right';
    position: { x: { evaluated: number }; y: { evaluated: number } };
    rotation: { evaluated: number };
  };
  fontFamily?: string;
}

export function isTextMetadata(meta: unknown): meta is TextMetadata {
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as { textContent?: unknown };
  return typeof m.textContent === 'string';
}

export interface LowerSketchTextOk { ok: true; backend: OcctBackend; }
export interface LowerSketchTextErr { ok: false; diagnostics: CompilerDiagnostic[]; }

export async function lowerSketchText(
  r: FeatureRecord,
  scriptDir: string | undefined,
): Promise<LowerSketchTextOk | LowerSketchTextErr> {
  const meta = r.metadata as unknown as TextMetadata;
  const diagnostics: CompilerDiagnostic[] = [];
  try {
    const { fontFamily } = await resolveAndLoadFont(meta.fontFamily, scriptDir);
    const drawing = replicad.drawText(meta.textContent, {
      fontSize: meta.textOpts.size.evaluated,
      fontFamily,
    });
    // Alignment: translate so the chosen anchor lands on the origin.
    const bb = drawing.boundingBox;
    const [minPt, maxPt] = bb.bounds;
    let translated: replicad.Drawing;
    const align = meta.textOpts.align;
    if (align === 'left') {
      translated = drawing.translate(-minPt[0], 0);
    } else if (align === 'center') {
      const cx = (minPt[0] + maxPt[0]) / 2;
      translated = drawing.translate(-cx, 0);
    } else /* 'right' */ {
      translated = drawing.translate(-maxPt[0], 0);
    }
    // Position.
    const px = meta.textOpts.position.x.evaluated;
    const py = meta.textOpts.position.y.evaluated;
    translated = translated.translate(px, py);
    // Rotation (CCW degrees, around the resolved anchor position).
    const rot = meta.textOpts.rotation.evaluated;
    if (rot !== 0) {
      translated = translated.rotate(rot, [px, py]);
    }
    const backend = OcctBackend.fromDrawing(translated);
    return { ok: true, backend };
  } catch (e) {
    if (e instanceof KernelError) {
      diagnostics.push({
        target: 'export-occt',
        code: e.code,
        featureId: r.id,
        severity: 'error',
        message: e.message,
        hint: e.hint ?? '',
      });
    } else {
      const msg = e instanceof Error ? e.message : String(e);
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.kernel-failed',
        featureId: r.id,
        severity: 'error',
        message: `sketch.text construction failed: ${msg}`,
        hint: 'replicad.drawText raised an exception — read the message; common causes include an unregistered font family or a degenerate-glyph contour at the requested size.',
      });
    }
    return { ok: false, diagnostics };
  }
}
