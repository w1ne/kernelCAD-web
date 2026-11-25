// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgsText } from '../../../../shared/intent/invalidArgs';
import * as replicad from 'replicad';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { draftWithHistory } from '../../../../kernel/backends/occt/draftWithHistory';
import { countFaces, localOpUnchanged } from '../../../../kernel/backends/occt/edgeFeatureValidity';
import { pickFace, pickFaceFromInput } from '../../../../kernel/backends/occt/edgeSelection';
import {
  mergeEdgeFeatureHistory,
  shellWithHistory,
} from '../../../../kernel/backends/occt/historyAwareEdgeFeatures';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { CanonicalFace, FaceRef } from '../../../../shared/intent/types';
import type { FaceHash } from '../../../../kernel/naming/evolutionRecord';
import { built, finished, type LowerContext, type LowerOutcome } from './context';
import { drainResolvedWarnings } from './helpers';

/** `shell` — hollows a solid, opening the selected faces. A record with no
 *  face input keeps every face and leaves a sealed internal cavity. */
export function lowerShell(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: OcctBackend;
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'shell(thickness, { face } | { closed: true })',
        path: 'inputs.base',
        gotText: 'no base shape',
        requires:
          'a solid Shape to chain onto — .shell() is a method on a solid, not a standalone call',
        example: "box(40, 30, 10).shell(2, { face: 'top' })",
      }),
    });
    throw new Error('shell: no base shape');
  }
  const thickness = r.params.thickness?.evaluated;
  if (thickness === undefined) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'shell(thickness, { face } | { closed: true })',
        path: 'thickness',
        gotText: 'nothing',
        requires:
          'a finite number > 0 as the FIRST argument — the wall left behind; .shell(thickness, opts), never an options object alone',
        unit: 'mm',
        example: "box(40, 30, 10).shell(2, { face: 'top' })",
      }),
    });
    throw new Error('shell: no thickness');
  }
  const faces = shellFaceHashes(ctx, r, base);
  if (faces === undefined) return finished(base);
  drainResolvedWarnings(r, ctx.diagnostics);
  try {
    const shellResult = shellWithHistory(base, faces, thickness);
    const newMap = mergeEdgeFeatureHistory(base.historyMap, shellResult);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = replicad.cast(shellResult.shape as any) as replicad.Shape3D;
    shape = new OcctBackend(wrapped, undefined, newMap);
    if (solidUnchanged(base, shape)) {
      ctx.diagnostics.push(unchangedOpDiagnostic(r.id, 'shell', thickness));
      return finished(base);
    }
    if (shellResult.strategy === 'offset-subtract') {
      ctx.diagnostics.push(shellFallbackDiagnostic(r.id, thickness));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'non-Error C++ exception during Build';
    ctx.diagnostics.push(shellFailureDiagnostic(r.id, msg, thickness));
    return finished(base);
  }
  return built(shape);
}

/**
 * Hashes of the faces shell() opens: `face`, then `face_2`, `face_3`, … Each
 * key resolves to one face, as the single-face form always has.
 */
function shellFaceHashes(ctx: LowerContext, r: FeatureRecord, base: OcctBackend): { hash: FaceHash }[] | undefined {
  const keys = Object.keys(r.inputs)
    .filter((key) => key === 'face' || /^face_\d+$/.test(key))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  // A record with no face input is a closed shell: keep every face.
  if (keys.length === 0) return [];
  const hashes: { hash: FaceHash }[] = [];
  for (const key of keys) {
    const one: FeatureRecord = key === 'face' ? r : { ...r, inputs: { ...r.inputs, face: r.inputs[key] } };
    const faceResult = pickFace(one, base, ctx.allRecords);
    if ('error' in faceResult) {
      ctx.diagnostics.push(faceResult.error);
      return undefined;
    }
    // Hash the underlying TopoDS_Face handle.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = ((faceResult as any).wrapped ?? (faceResult as any)._wrapped ?? faceResult as any).HashCode(2147483647).toString(16);
    if (!hashes.some((h) => h.hash === hash)) hashes.push({ hash });
  }
  return hashes;
}

function topoOf(backend: OcctBackend): unknown {
  return backend.getReplicadShape().wrapped;
}

/** True when the op returned a solid with the same volume and the same faces. */
function solidUnchanged(before: OcctBackend, after: OcctBackend): boolean {
  return localOpUnchanged(before.volume(), after.volume(), countFaces(topoOf(before)), countFaces(topoOf(after)));
}

function unchangedOpDiagnostic(featureId: string, op: 'shell' | 'draft', value: number): CompilerDiagnostic {
  const noun = op === 'shell' ? `shell(${value})` : `draft(${value})`;
  return {
    target: 'export-occt',
    code: op === 'shell' ? 'feature.shell.unchanged' : 'feature.draft.unchanged',
    featureId,
    severity: 'error',
    message: `${noun}: the solid is unchanged, so the operation was dropped.`,
    hint: op === 'shell'
      ? 'A shell that leaves the volume and the face count alone did not hollow the body. The wall is thicker than the body can take, or the open face was not cut. For a closed shell, leave enough room for an internal cavity. The unshellled solid is not a successful shell.'
      : 'A draft that leaves the volume and the face count alone did not taper the face. Pick a side face and a pull direction that is not parallel to that face.',
  };
}

function shellFallbackDiagnostic(featureId: string, thickness: number): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'feature.shell.boolean-fallback',
    featureId,
    severity: 'info',
    message:
      `shell(${thickness}): every BRepOffsetAPI_MakeThickSolid join mode failed, so the ${thickness} mm wall was ` +
      'built by offsetting the closed solid inward and subtracting it, then cutting the selected face open.',
    hint: 'No action needed — the result is a valid hollow with the requested wall; check the rim at the open face reads as intended.',
    details: { strategy: 'offset-subtract', thickness },
  };
}

/**
 * `feature.kernel-failed` for shell(). Once the native joins and offset/subtract
 * fallback fail, do not probe thinner shell() calls on the same body: steer to
 * an explicitly authored hollow instead.
 */
export function shellFailureDiagnostic(
  featureId: string,
  kernelMessage: string,
  thickness: number,
): CompilerDiagnostic {
  const message =
    `OCCT shell failed: ${kernelMessage}. The wall offset could not be closed. Two usual causes: the wall is ` +
    `thicker than the thinnest local feature, or faces meet at edges the offset cannot resolve.`;
  return {
    target: 'export-occt', code: 'feature.kernel-failed', featureId, severity: 'error', message,
    hint:
      `Do not retry .shell() on this body. Compare the requested ${thickness} mm wall with the thinnest local feature ` +
      'while redesigning the cavity; a thinner wall is not an automatic retry. For enclosures with cutouts, author the cavity explicitly: build an ' +
      'inset inner solid, then subtract it from the outer solid. For an origin-based box, use ' +
      '`outer.subtract(inner.translate(wall, wall, wall))` and extend the inner cavity through the intended opening; ' +
      'model cutouts in the cavity or outer body as needed.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'do not retry shell on the same body; author an inset inner cavity and subtract it from the outer solid',
    },
    details: { requestedThickness: thickness },
  };
}

/**
 * `draft` — tapers the selected face about a neutral plane derived from the
 * face geometry. Split into selection + the honesty warning, pull-direction
 * derivation and the kernel call; the bodies are unchanged from the
 * single-arm form.
 */
export function lowerDraft(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'draft(angleDeg, { face })',
        path: 'inputs.base',
        gotText: 'no base shape',
        requires: 'a solid Shape to chain onto — .draft() is a method on a solid',
        example: "box(40, 30, 10).draft(3, { face: 'front' })",
      }),
    });
    throw new Error('draft: no base shape');
  }
  const angleDeg = r.params.angle?.evaluated;
  if (angleDeg === undefined) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'draft(angleDeg, { face })',
        path: 'angleDeg',
        gotText: 'nothing',
        requires:
          'a number in (0, 90) as the FIRST argument — the taper angle away from the pull direction (1–3 is typical for injection moulding)',
        unit: 'deg',
        example: "box(40, 30, 10).draft(3, { face: 'front' })",
      }),
    });
    throw new Error('draft: no angle');
  }
  const faceResult = pickFace(r, base, ctx.allRecords);
  if ('error' in faceResult) {
    ctx.diagnostics.push(faceResult.error);
    return finished(base);
  }
  drainResolvedWarnings(r, ctx.diagnostics);
  const namedPlane = resolveNamedNeutralPlane(ctx, r, base);
  if (namedPlane === null) return finished(base);
  const shape = applyDraft(ctx, r, base, faceResult, angleDeg, namedPlane);
  if (shape === undefined) return finished(base);
  return built(shape);
}

/** A parting plane the caller named by a canonical face name or a face label. */
interface NamedNeutralPlane {
  readonly point: [number, number, number];
  readonly normal: [number, number, number];
}

const CANONICAL_FACE_NAMES = new Set<CanonicalFace>(['top', 'bottom', 'left', 'right', 'front', 'back']);

/** Capture DEFAULTS metadata.neutralPlane to the drafted face's own selector
 *  string, and stores '' when the face is a query. Both mean "derive the
 *  parting plane", not "use this face as the plane". */
function draftedFaceSelector(r: FeatureRecord): string {
  const faceRef = (r.inputs.face as { ref?: FaceRef } | undefined)?.ref;
  return faceRef?.kind === 'canonical' ? faceRef.face
    : faceRef?.kind === 'label' ? faceRef.name
    : '';
}

/**
 * Resolve a DISTINCT named neutralPlane to a planar face on the base solid.
 *
 * Returns undefined when capture kept the default (no override), null after
 * pushing an error, and the plane otherwise. A named plane that cannot be
 * resolved, or is not planar, fails instead of silently falling back to the
 * derived plane: the parting line decides which edge of the drafted face
 * stays fixed, so a guessed plane ships geometry the caller did not ask for.
 */
function resolveNamedNeutralPlane(
  ctx: LowerContext,
  r: FeatureRecord,
  base: OcctBackend,
): NamedNeutralPlane | undefined | null {
  const name = (r.metadata as { neutralPlane?: string } | undefined)?.neutralPlane ?? '';
  if (name === '' || name === draftedFaceSelector(r)) return undefined;

  const baseRef = r.inputs.base;
  const featureId = baseRef?.kind === 'feature' ? baseRef.id : r.id;
  const ref: FaceRef = CANONICAL_FACE_NAMES.has(name as CanonicalFace)
    ? { kind: 'canonical', face: name as CanonicalFace }
    : { kind: 'label', name };
  const probe = {
    ...r,
    inputs: {
      ...r.inputs,
      neutralPlaneFace: { kind: 'face', featureId, ref },
    },
  } as unknown as FeatureRecord;
  const face = pickFaceFromInput(probe, 'neutralPlaneFace', base, ctx.allRecords);
  const badPlane = (requires: string, hint: string): null => {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      ...invalidArgsText({
        api: 'draft(angleDeg, { face, neutralPlane })',
        path: 'opts.neutralPlane',
        got: name,
        requires,
        example: "box(40, 30, 20).draft(10, { face: 'front', neutralPlane: 'top' })",
        hint,
      }),
    });
    return null;
  };
  if ('error' in face) {
    return badPlane(
      'the name of a face on this solid — a canonical name (top, bottom, left, right, front, back) or a face label',
      `${face.error.message} The parting plane is where the drafted face keeps its original position; a guessed plane would move a different edge.`,
    );
  }
  const geomType = (face as unknown as { geomType?: string }).geomType;
  if (geomType !== 'PLANE') {
    return badPlane(
      `a planar face; '${name}' is ${geomType ?? 'not a plane'}`,
      'A curved parting face has no single plane where the drafted face keeps its position. Pick a planar face, or omit neutralPlane to derive the plane from the body extent.',
    );
  }
  const center = (face as unknown as { center: { x: number; y: number; z: number } }).center;
  const raw = (face as unknown as { normalAt: () => { x: number; y: number; z: number } }).normalAt();
  const length = Math.hypot(raw.x, raw.y, raw.z);
  if (!(length > 0)) {
    return badPlane(
      'a planar face with a usable normal',
      `The named neutralPlane '${name}' has a zero-length normal, so its plane is undefined.`,
    );
  }
  return {
    point: [center.x, center.y, center.z],
    normal: [raw.x / length, raw.y / length, raw.z / length],
  };
}

/**
 * Pull direction: explicit metadata.pullDir, else derive a demoulding
 * axis. The pull must NOT be parallel to the drafted face normal (a face
 * tapered about a plane parallel to itself is degenerate), so when no
 * pullDir is given we pick the principal axis (±X/±Y/±Z) most
 * perpendicular to the face normal, breaking ties toward +Z — the
 * conventional mould-opening direction for a top-drafted side wall.
 */
function resolvePullDir(
  r: FeatureRecord,
  faceNormal: [number, number, number],
): [number, number, number] {
  const meta = r.metadata as { pullDir?: [number, number, number] } | undefined;
  if (meta?.pullDir !== undefined) return meta.pullDir;
  // Candidate axes ordered so +Z wins ties (stable, conventional).
  const axes: [number, number, number][] = [
    [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0],
  ];
  let best = axes[0];
  let bestPerp = -1;
  for (const a of axes) {
    const dotAbs = Math.abs(a[0] * faceNormal[0] + a[1] * faceNormal[1] + a[2] * faceNormal[2]);
    const perp = 1 - dotAbs; // larger = more perpendicular to face normal
    if (perp > bestPerp + 1e-9) { bestPerp = perp; best = a; }
  }
  return best;
}

/**
 * The parting plane handed to BRepOffsetAPI_DraftAngle.
 *
 * A named plane is used exactly where the call put it, with its normal
 * oriented along the pull direction so the taper keeps the derived-plane sign
 * convention. Without one, the plane is derived: a face tapered about its own
 * plane would be a no-op, so it is anchored at the body extent OPPOSITE the
 * pull direction (the parting line at the base, away from the pull) and the
 * in-plane components are taken from the face centroid so it passes through
 * the body.
 */
function draftPlaneFor(
  namedPlane: NamedNeutralPlane | undefined,
  pullDir: [number, number, number],
  center: { x: number; y: number; z: number },
  bb: { min: readonly number[]; max: readonly number[] },
): { point: [number, number, number]; normal: [number, number, number] } {
  const pLen = Math.hypot(pullDir[0], pullDir[1], pullDir[2]) || 1;
  const pUnit: [number, number, number] = [pullDir[0] / pLen, pullDir[1] / pLen, pullDir[2] / pLen];
  if (namedPlane !== undefined) {
    const along = namedPlane.normal[0] * pUnit[0] + namedPlane.normal[1] * pUnit[1] + namedPlane.normal[2] * pUnit[2];
    return {
      point: [...namedPlane.point],
      normal: along < 0
        ? [-namedPlane.normal[0], -namedPlane.normal[1], -namedPlane.normal[2]]
        : [...namedPlane.normal],
    };
  }
  const anchor: [number, number, number] = [
    pUnit[0] >= 0 ? bb.min[0]! : bb.max[0]!,
    pUnit[1] >= 0 ? bb.min[1]! : bb.max[1]!,
    pUnit[2] >= 0 ? bb.min[2]! : bb.max[2]!,
  ];
  return {
    point: [
      Math.abs(pUnit[0]) > 0.5 ? anchor[0] : center.x,
      Math.abs(pUnit[1]) > 0.5 ? anchor[1] : center.y,
      Math.abs(pUnit[2]) > 0.5 ? anchor[2] : center.z,
    ],
    normal: pUnit,
  };
}

/** Returns undefined once the kernel failure diagnostic has been pushed. */
function applyDraft(
  ctx: LowerContext,
  r: FeatureRecord,
  base: OcctBackend,
  faceResult: unknown,
  angleDeg: number,
  namedPlane?: NamedNeutralPlane,
): ShapeBackend | undefined {
  try {
    // The resolved replicad Face gives us both the target face hash and the
    // geometry needed to DERIVE the neutral plane + pull direction when the
    // capture metadata left them unspecified (Slice E cross-task contract:
    // metadata.neutralPlane may be the empty string '' for FaceQuery
    // selectors, and metadata.pullDir is absent when not supplied).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const face = faceResult as any;
    const faceHash = (face.wrapped ?? face._wrapped ?? face).HashCode(2147483647).toString(16);
    const center = face.center as { x: number; y: number; z: number };
    const nRaw = typeof face.normalAt === 'function'
      ? (face.normalAt() as { x: number; y: number; z: number })
      : { x: 0, y: 0, z: 1 };
    const nLen = Math.hypot(nRaw.x, nRaw.y, nRaw.z) || 1;
    const faceNormal: [number, number, number] = [nRaw.x / nLen, nRaw.y / nLen, nRaw.z / nLen];

    const pullDir = resolvePullDir(r, faceNormal);
    const plane = draftPlaneFor(namedPlane, pullDir, center, base.boundingBox());

    const angleRad = (angleDeg * Math.PI) / 180;
    const res = draftWithHistory(
      base,
      [{ hash: faceHash }],
      angleRad,
      pullDir,
      plane,
    );
    const newMap = mergeEdgeFeatureHistory(base.historyMap, res);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = replicad.cast(res.shape as any) as replicad.Shape3D;
    const drafted = new OcctBackend(wrapped, undefined, newMap);
    if (solidUnchanged(base, drafted)) {
      ctx.diagnostics.push(unchangedOpDiagnostic(r.id, 'draft', angleDeg));
      return undefined;
    }
    return drafted;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OCCT draft failed';
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.draft.failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT draft failed: ${msg}`,
      hint: 'Drafts need a planar neutral plane and a consistent pull direction; check that the face is planar and the angle is < 90°.',
    });
    return undefined;
  }
}
