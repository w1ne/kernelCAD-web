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
//   8. History-aware boolean against the parent body. `fuseWithHistory`
//      (depth > 0) raises the glyphs out of the face; `cutWithHistory`
//      (depth < 0) recesses them into the body. The result HistoryMap is
//      merged via `mergeBooleanHistory` and the newly-created tool-side
//      faces are stamped with created-ref labels (`embossed-text` /
//      `embossed-text-wall` for fuse; `engraved-text-floor` /
//      `engraved-text-wall` for cut) so downstream chained features
//      (.fillet/.chamfer/.shell, further embossText) can target them by
//      label.

import * as replicad from 'replicad';
import type { Face } from 'replicad';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { pickFace } from '../../../kernel/backends/occt/edgeSelection';
import { resolveAndLoadFont } from '../../../shared/fonts/index';
import { isEmbossTextMetadata, type EmbossTextMetadata } from '../../../shared/intent/embossTextRecord';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import { cutWithHistory, fuseWithHistory, mergeBooleanHistory } from '../../../kernel/backends/occt/historyAwareBooleans';
import {
  applyCreatedRefs,
  faceHashOf,
  refreshSnapshots,
  surfaceTypeOf,
  type CreatedRefSpec,
  type FaceSnapshot,
} from '../../../kernel/backends/occt/createdRefs';
import type { Vec3 } from '../../../shared/intent/types';

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

  // 8. History-aware boolean against the parent body.
  //
  // We use `fuseWithHistory` / `cutWithHistory` (instead of the plain
  // `parent.union/.subtract`) so the BRepAlgoAPI_* builder's Modified /
  // Generated / IsDeleted callbacks can be read before the builder is
  // destroyed. The merged HistoryMap is then stamped with `labelName`
  // entries for the newly-created glyph faces so downstream chained
  // features (.fillet/.chamfer/.shell, further embossText calls) can
  // target them by label (e.g. `face: 'embossed-text'`).
  const toolBackend = new OcctBackend(solid);
  const fuse = meta.depth.evaluated > 0;

  let boolResult;
  try {
    boolResult = fuse ? fuseWithHistory(parent, toolBackend) : cutWithHistory(parent, toolBackend);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `embossText boolean ${fuse ? 'fuse' : 'cut'} failed: ${msg}`,
      hint: 'OCCT boolean failed — check the parent body is valid and the glyph block does not exceed the face.',
    });
    return { ok: false, diagnostics };
  }

  // Wrap the result TopoDS_Shape into a replicad Shape3D + OcctBackend.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrappedResult = (replicad as any).cast(boolResult.shape) as replicad.Shape3D;
  const resultIntermediate = new OcctBackend(wrappedResult);
  if (resultIntermediate.isEmpty()) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: 'embossText boolean produced an empty result.',
      hint: 'OCCT produced an empty solid; the glyph tool likely missed the parent body. Verify the face fits the requested text size.',
    });
    return { ok: false, diagnostics };
  }

  // Merge parent + tool histories with the boolean's evolution callbacks.
  // The parent's `historyMap` is undefined for primitives constructed via
  // `OcctBackend.box(...)` directly (e.g. in tests). The lowerer pipeline
  // seeds box/cylinder primitives with a canonical-face seed map; we feed
  // either into mergeBooleanHistory which tolerates undefined inputs.
  const merged = mergeBooleanHistory(parent.historyMap, undefined, boolResult);

  // Walk the result's faces; any face whose hash isn't in `merged` (i.e.
  // didn't carry a lineage from the parent / tool input) is a NEW face
  // produced by the boolean. For embossText those are exactly the faces
  // we want to label: the glyph top/walls (fuse) or the cavity floor/walls
  // (cut).
  const newFaceRefs = classifyEmbossFaces(
    resultIntermediate,
    merged,
    faceCentroidOf(face),
    faceNormalOf(face),
    fuse,
  );

  const featureMeta = r.metadata as { name?: string; ordinal?: number } | undefined;
  applyCreatedRefs(
    merged,
    newFaceRefs,
    r.id,
    r.kind,
    featureMeta?.name,
    featureMeta?.ordinal,
  );
  // Populate fresh snapshots for carried-over parent faces too so the
  // geometry-fallback resolver in resolveFaceRef can disambiguate when
  // topology lookup falls through (e.g. after a transform / further
  // boolean).
  refreshSnapshots(merged, resultIntermediate.getReplicadShape().faces);

  return { ok: true, backend: new OcctBackend(wrappedResult, undefined, merged) };
}

// ---------------------------------------------------------------------------
// Created face-ref classification
// ---------------------------------------------------------------------------

/** Read centroid off a replicad Face as a Vec3. */
function faceCentroidOf(face: Face): Vec3 {
  const c = face.center;
  return [c.x, c.y, c.z];
}

/** Read outward normal off a replicad Face. Defaults to [0,0,1] when the
 *  face exposes no `normalAt()` (defensive — planar faces always do). */
function faceNormalOf(face: Face): Vec3 {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (face as any).normalAt;
  if (typeof fn !== 'function') return [0, 0, 1];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n = (face as any).normalAt() as { x?: number; y?: number; z?: number } | undefined;
  if (!n || typeof n.x !== 'number' || typeof n.y !== 'number') return [0, 0, 1];
  const nx = n.x, ny = n.y, nz = typeof n.z === 'number' ? n.z : 0;
  const len = Math.hypot(nx, ny, nz);
  if (len < 1e-9) return [0, 0, 1];
  return [nx / len, ny / len, nz / len];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function snapshotOf(face: Face): FaceSnapshot {
  const c = face.center;
  const centroid: Vec3 = [c.x, c.y, c.z];
  const normal = faceNormalOf(face);
  let area = 0;
  try { area = replicad.measureArea(face); } catch { /* defensive: leave 0 */ }
  return { centroid, normal, area };
}

/** Classify every NEW face on the boolean result (i.e. any face whose hash
 *  did not carry a lineage from the parent's input) and assign it a created
 *  ref name. Planar faces parallel to the entry face become 'embossed-text'
 *  (fuse, the glyph top) or 'engraved-text-floor' (cut, the cavity floor);
 *  all other new faces (typically the glyph side walls — planar but
 *  perpendicular to the entry, plus any rounded glyph tangents) become
 *  '-wall' variants. */
function classifyEmbossFaces(
  result: OcctBackend,
  mergedHistory: ReturnType<typeof mergeBooleanHistory>,
  entryCentroid: Vec3,
  entryNormalOutward: Vec3,
  fuse: boolean,
): CreatedRefSpec[] {
  const PARALLEL_DOT_MIN = 0.999; // ~2.5° tolerance
  const allFaces = result.getReplicadShape().faces;
  const refs: CreatedRefSpec[] = [];
  // Pre-compute the signed-distance reference: positive depth means glyph
  // tops sit OUTSIDE the entry plane (along the outward normal); negative
  // depth means the floor sits INSIDE (against the outward normal).
  const topLabel = fuse ? 'embossed-text' : 'engraved-text-floor';
  const wallLabel = fuse ? 'embossed-text-wall' : 'engraved-text-wall';

  for (const f of allFaces) {
    const h = faceHashOf(f);
    if (mergedHistory.has(h)) continue; // carried-over face, not new
    const fNormal = faceNormalOf(f);
    const parallel = Math.abs(dot(fNormal, entryNormalOutward)) >= PARALLEL_DOT_MIN;

    let refName: string;
    if (parallel) {
      // Distance from the face centroid to the entry plane, signed along
      // entryNormalOutward. For emboss (fuse) the glyph top sits at +depth
      // (outside the body), for engrave (cut) the floor sits at -depth
      // (inside). A new planar face on the SAME side as the original (zero
      // distance) would mean the boolean preserved the entry plane's
      // surface where the glyph didn't carve into it — that face would
      // have inherited the parent's lineage via mergeBooleanHistory, so
      // we wouldn't see it here. Defensive: any new parallel face is
      // treated as the "top" (fuse) / "floor" (cut).
      refName = topLabel;
    } else {
      // Side walls of the extruded glyph block.
      refName = wallLabel;
    }
    void entryCentroid; // currently unused beyond defensive symmetry
    refs.push({
      faceHash: h,
      refName,
      snapshot: snapshotOf(f),
      surfaceType: surfaceTypeOf(f),
    });
  }

  return refs;
}
