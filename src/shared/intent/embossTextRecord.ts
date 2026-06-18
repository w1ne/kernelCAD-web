// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/embossTextRecord.ts
//
// Capture-time metadata for the `Shape.embossText({...})` face-authoring
// feature. An embossText record raises or recesses text on a target face by
// running replicad's `drawText → drawing.sketchOnFace(face, scaleMode) →
// sketch.extrude(|depth|) → parent.fuse|.cut` pipeline.
//
// Signed `depth`:
//   - positive — emboss out (fuse onto parent along outward face normal)
//   - negative — engrave in (cut from parent along inward face normal)
//   - zero     — flagged at capture time (`feature.emboss-text.depth-zero`)
//
// UV anchor (`anchorU`, `anchorV`) is the [0..1] face-bound parametric
// coordinate at which the text's alignment anchor lands. 0 = umin/vmin,
// 1 = umax/vmax, 0.5 = face center.
//
// `scaleMode` mirrors replicad's `Drawing.sketchOnFace(face, mode)` arg:
//   - 'original'  — no scaling; glyphs use the literal `size` in mm.
//   - 'native'    — uses the face's own (u, v) parameterisation domain.
//   - 'bounds'    — normalises against the face bounding box (default
//                    for replicad).
// We default to 'original' so the user's millimetre `size` is preserved.

import type { FaceRef, Param } from './types';

export type EmbossTextAlign = 'left' | 'center' | 'right';

export type EmbossTextScaleMode = 'original' | 'native' | 'bounds';

export interface EmbossTextMetadata {
  /** Text content (UTF-8). Must contain at least one printable glyph. */
  textContent: string;
  /** Optional logical font family name or path to a `.ttf`. */
  fontFamily?: string;
  /** Glyph cap height in mm — Param-shaped so the value is editable. */
  size: Param;
  /** Signed extrusion depth in mm. Sign selects fuse (>0) vs cut (<0). */
  depth: Param;
  /** Horizontal alignment of the glyph block relative to the anchor. */
  align: EmbossTextAlign;
  /** U anchor in [0, 1] (face-local). */
  anchorU: Param;
  /** V anchor in [0, 1] (face-local). */
  anchorV: Param;
  /** Rotation in CCW degrees, in the face's tangent plane. */
  rotation: Param;
  /** `Drawing.sketchOnFace` scaling mode. */
  scaleMode: EmbossTextScaleMode;
  /** The face on the parent shape to author onto. */
  faceRef: FaceRef;
}

function isParamShape(p: unknown): p is Param {
  if (p === null || typeof p !== 'object') return false;
  const o = p as { evaluated?: unknown };
  return typeof o.evaluated === 'number';
}

export function isEmbossTextMetadata(value: unknown): value is EmbossTextMetadata {
  if (value === null || typeof value !== 'object') return false;
  const m = value as Partial<EmbossTextMetadata>;
  if (typeof m.textContent !== 'string') return false;
  if (!isParamShape(m.size)) return false;
  if (!isParamShape(m.depth)) return false;
  if (!isParamShape(m.anchorU)) return false;
  if (!isParamShape(m.anchorV)) return false;
  if (!isParamShape(m.rotation)) return false;
  if (m.align !== 'left' && m.align !== 'center' && m.align !== 'right') return false;
  if (m.scaleMode !== 'original' && m.scaleMode !== 'native' && m.scaleMode !== 'bounds') return false;
  if (m.faceRef === undefined || typeof m.faceRef !== 'object') return false;
  return true;
}
