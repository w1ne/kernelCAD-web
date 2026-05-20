// src/modeling/backends/occt/embossTextLowerer.ts
//
// Lower a W3 `embossText` FeatureRecord into a face-authored solid.
//
// Pipeline:
//   1. Resolve the target face via the shared `pickFace` helper.
//   2. Load the requested font via `resolveAndLoadFont` (mirrors textLowerer).
//   3. Build the glyph drawing with `replicad.drawText`.
//   4. Apply alignment (translate the bbox so the chosen anchor lands on
//      the origin) and rotation (CCW around the origin).
//   5. Translate the drawing by `(anchorU - 0.5) * uExtent,
//      (anchorV - 0.5) * vExtent` so the alignment anchor lands at the
//      requested UV anchor on the face.
//   6. `drawing.sketchOnFace(face, scaleMode)` to wrap onto the face.
//   7. `sketch.extrude(|depth|)` extrudes along the face normal.
//   8. `parent.union(extruded)` (depth > 0) or `parent.subtract(extruded)`
//      (depth < 0). Sign of depth selects fuse vs cut at face level so that
//      both fuse and cut share a single `sketch.extrude(|d|)` step.

import * as replicad from 'replicad';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { pickFace } from '../../../kernel/backends/occt/edgeSelection';
import { resolveAndLoadFont } from '../../../shared/fonts/index';
import { isEmbossTextMetadata, type EmbossTextMetadata } from '../../../shared/intent/embossTextRecord';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';

export interface LowerEmbossTextOk { ok: true; backend: OcctBackend; }
export interface LowerEmbossTextErr { ok: false; diagnostics: CompilerDiagnostic[]; }

export async function lowerEmbossText(
  r: FeatureRecord,
  parent: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
  scriptDir: string | undefined,
): Promise<LowerEmbossTextOk | LowerEmbossTextErr> {
  const diagnostics: CompilerDiagnostic[] = [];

  // Surface any capture-time diagnostics stashed on metadata.diagnostics.
  const stashed = (r.metadata as { diagnostics?: CompilerDiagnostic[] } | undefined)?.diagnostics;
  if (stashed && stashed.length > 0) {
    diagnostics.push(...stashed);
    // If any are errors, refuse to lower (validation was authoritative).
    if (stashed.some((d) => d.severity === 'error')) {
      return { ok: false, diagnostics };
    }
  }

  if (!isEmbossTextMetadata(r.metadata)) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `embossText record '${r.id}' is missing valid metadata.`,
      hint: 'Build the record via Shape.embossText({...}) so the validators run.',
    });
    return { ok: false, diagnostics };
  }
  const meta: EmbossTextMetadata = r.metadata;

  // 1. Resolve target face on the parent.
  const faceResult = pickFace(r, parent, records);
  if ('error' in faceResult) {
    diagnostics.push(faceResult.error);
    return { ok: false, diagnostics };
  }
  const face = faceResult;

  // 2-4. Build the glyph drawing.
  let drawing: replicad.Drawing;
  try {
    const { fontFamily } = await resolveAndLoadFont(meta.fontFamily, scriptDir);
    drawing = replicad.drawText(meta.textContent, {
      fontSize: meta.size.evaluated,
      fontFamily,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `embossText drawText failed: ${msg}`,
      hint: 'replicad.drawText raised — check the font family is registered and the size is positive.',
    });
    return { ok: false, diagnostics };
  }

  // 4a. Alignment translate (so the chosen anchor lands on (0, 0)).
  const bb = drawing.boundingBox;
  const [minPt, maxPt] = bb.bounds;
  if (meta.align === 'left') {
    drawing = drawing.translate(-minPt[0], -(minPt[1] + maxPt[1]) / 2);
  } else if (meta.align === 'right') {
    drawing = drawing.translate(-maxPt[0], -(minPt[1] + maxPt[1]) / 2);
  } else /* center */ {
    drawing = drawing.translate(-(minPt[0] + maxPt[0]) / 2, -(minPt[1] + maxPt[1]) / 2);
  }

  // 4b. Rotation around origin (now == chosen anchor).
  if (meta.rotation.evaluated !== 0) {
    drawing = drawing.rotate(meta.rotation.evaluated, [0, 0]);
  }

  // 5. UV anchor translate. Read UV bounds off the resolved face and offset
  //    the drawing into the face's local (u, v) parameterisation. For
  //    `scaleMode === 'original'` the drawing's mm coordinates land directly
  //    on the face (planar faces only); for the other modes replicad
  //    rescales internally but UV anchors still produce the expected centring
  //    because we compute offsets in the (u, v) domain.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uv = (face as any).UVBounds as { uMin: number; uMax: number; vMin: number; vMax: number };
  if (uv && typeof uv.uMin === 'number') {
    const uExtent = uv.uMax - uv.uMin;
    const vExtent = uv.vMax - uv.vMin;
    const uCenter = (uv.uMin + uv.uMax) / 2;
    const vCenter = (uv.vMin + uv.vMax) / 2;
    const dxU = uCenter + (meta.anchorU.evaluated - 0.5) * uExtent;
    const dxV = vCenter + (meta.anchorV.evaluated - 0.5) * vExtent;
    drawing = drawing.translate(dxU, dxV);
  }

  // 6-7. Wrap onto the face and extrude.
  let solid: replicad.Shape3D;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lifted = (drawing as any).sketchOnFace(face, meta.scaleMode);
    if (typeof (lifted as { extrude?: unknown }).extrude !== 'function') {
      throw new Error('sketchOnFace returned a non-extrudable sketch (multi-face glyph?)');
    }
    const extruded = (lifted as unknown as {
      extrude: (d: number) => replicad.Shape3D;
    }).extrude(Math.abs(meta.depth.evaluated));
    solid = extruded;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Heuristic: a "face too small" condition surfaces as a meshing/projection
    // error in replicad. Use the specific code for that case.
    const isFaceFit = /bounds|too\s*small|fit/i.test(msg);
    diagnostics.push({
      target: 'export-occt',
      code: isFaceFit ? 'feature.emboss-text.face-too-small' : 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `embossText face wrap / extrude failed: ${msg}`,
      hint: isFaceFit
        ? HINT_TEMPLATES['feature.emboss-text.face-too-small'].template
        : 'OCCT could not wrap the glyphs onto the face — verify the face is planar (for scaleMode=original) and the depth is positive.',
    });
    return { ok: false, diagnostics };
  }

  // 8. Boolean against the parent body.
  const toolBackend = new OcctBackend(solid);
  let resultBackend: OcctBackend;
  try {
    resultBackend = meta.depth.evaluated > 0
      ? parent.union(toolBackend)
      : parent.subtract(toolBackend);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `embossText boolean ${meta.depth.evaluated > 0 ? 'fuse' : 'cut'} failed: ${msg}`,
      hint: 'OCCT boolean failed — check the parent body is valid and the glyph block does not exceed the face.',
    });
    return { ok: false, diagnostics };
  }

  return { ok: true, backend: resultBackend };
}
