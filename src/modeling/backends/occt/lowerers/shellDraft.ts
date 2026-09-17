// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import type { ShapeBackend } from '../../../../kernel/backends/backend';
import { OcctBackend } from '../../../../kernel/backends/occt/occtBackend';
import { draftWithHistory } from '../../../../kernel/backends/occt/draftWithHistory';
import { pickFace } from '../../../../kernel/backends/occt/edgeSelection';
import {
  mergeEdgeFeatureHistory,
  shellWithHistory,
} from '../../../../kernel/backends/occt/historyAwareEdgeFeatures';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { FaceRef } from '../../../../shared/intent/types';
import { built, finished, type LowerContext, type LowerOutcome } from './context';
import { drainResolvedWarnings } from './helpers';

/** `shell` — hollows a solid, opening the selected face. */
export function lowerShell(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  let shape: ShapeBackend;
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  if (!base) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: r.id,
      severity: 'error',
      message: `shell requires an input named 'base'.`,
      hint: 'Chain shell onto a solid shape.',
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
      message: `shell requires a 'thickness' parameter.`,
      hint: 'Pass a positive finite number as the first argument, e.g. .shell(1, { face: \'top\' }).',
    });
    throw new Error('shell: no thickness');
  }
  const faceResult = pickFace(r, base, ctx.allRecords);
  if ('error' in faceResult) {
    ctx.diagnostics.push(faceResult.error);
    return finished(base);
  }
  drainResolvedWarnings(r, ctx.diagnostics);
  try {
    // Convert replicad Face → { hash: FaceHash } by hashing the
    // underlying TopoDS_Face handle.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const faceHash = ((faceResult as any).wrapped ?? (faceResult as any)._wrapped ?? faceResult as any).HashCode(2147483647).toString(16);
    const shellResult = shellWithHistory(base, [{ hash: faceHash }], thickness);
    const newMap = mergeEdgeFeatureHistory(base.historyMap, shellResult);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = replicad.cast(shellResult.shape as any) as replicad.Shape3D;
    shape = new OcctBackend(wrapped, undefined, newMap);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: r.id,
      severity: 'error',
      message: `OCCT shell failed: ${msg}`,
      hint: 'OCCT could not shell that solid — try a thinner wall or a different open face. Thickness must be smaller than the shape\'s minimum thickness.',
    });
    return finished(base);
  }
  return built(shape);
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
      message: `draft requires an input named 'base'.`,
      hint: 'Chain draft onto a solid shape.',
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
      message: `draft requires an 'angle' parameter.`,
      hint: "Pass the taper angle in degrees, e.g. .draft(5, { face: 'front' }).",
    });
    throw new Error('draft: no angle');
  }
  const faceResult = pickFace(r, base, ctx.allRecords);
  if ('error' in faceResult) {
    ctx.diagnostics.push(faceResult.error);
    return finished(base);
  }
  drainResolvedWarnings(r, ctx.diagnostics);
  warnOnOverriddenNeutralPlane(ctx, r);
  const shape = applyDraft(ctx, r, base, faceResult, angleDeg);
  if (shape === undefined) return finished(base);
  return built(shape);
}

/**
 * Honesty signal: the capture layer DEFAULTS metadata.neutralPlane to
 * the drafted face's own selector string (canonical/label name), and
 * sets '' when the face is a non-named selector (FaceQuery etc.). The
 * neutral plane is ALWAYS derived from the target face geometry here, so
 * a genuine override — a named neutralPlane pointing at a DIFFERENT face
 * than the drafted one — is silently dropped. Surface a warning in that
 * case rather than pretending the named plane was honored. Full
 * named-neutral-plane resolution is deferred to a later slice.
 */
function warnOnOverriddenNeutralPlane(ctx: LowerContext, r: FeatureRecord): void {
  const neutralPlane = (r.metadata as { neutralPlane?: string } | undefined)?.neutralPlane ?? '';
  const faceRef = (r.inputs.face as { ref?: FaceRef } | undefined)?.ref;
  const targetFaceSelector =
    faceRef?.kind === 'canonical' ? faceRef.face
    : faceRef?.kind === 'label' ? faceRef.name
    : ''; // FaceQuery / tracked / created etc. → capture default was ''
  if (neutralPlane !== '' && neutralPlane !== targetFaceSelector) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.draft.neutral-plane-derived',
      featureId: r.id,
      severity: 'warn',
      message: `Named neutralPlane '${neutralPlane}' differs from the drafted face '${targetFaceSelector || '(query)'}'; the parting plane was derived from the face geometry instead.`,
      hint: 'A named neutralPlane different from the drafted face is not yet honored; the parting plane was derived from the face geometry. Full named-neutral-plane support lands in a later slice.',
    });
  }
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

/** Returns undefined once the kernel failure diagnostic has been pushed. */
function applyDraft(
  ctx: LowerContext,
  r: FeatureRecord,
  base: OcctBackend,
  faceResult: unknown,
  angleDeg: number,
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

    // Neutral plane: derived from the target face geometry. A face tapered
    // about its own plane would be a no-op, so we anchor the parting plane
    // at the base of the shape along the pull axis and orient it by the pull
    // direction. This is the robust default that also satisfies the
    // neutralPlane === '' contract (no resolvable neutral-plane face).
    const bb = base.boundingBox();
    const pLen = Math.hypot(pullDir[0], pullDir[1], pullDir[2]) || 1;
    const pUnit: [number, number, number] = [pullDir[0] / pLen, pullDir[1] / pLen, pullDir[2] / pLen];
    // Anchor at the face centroid projected onto the parting level: place the
    // plane at the shape extent OPPOSITE the pull direction so the whole face
    // tapers (the parting line sits at the base, away from the pull).
    const lows = [bb.min[0], bb.min[1], bb.min[2]];
    const highs = [bb.max[0], bb.max[1], bb.max[2]];
    const anchor: [number, number, number] = [
      pUnit[0] >= 0 ? lows[0] : highs[0],
      pUnit[1] >= 0 ? lows[1] : highs[1],
      pUnit[2] >= 0 ? lows[2] : highs[2],
    ];
    // Keep the in-pull-axis component at the parting level but the in-plane
    // components at the face centroid so the plane passes through the body.
    const planePoint: [number, number, number] = [
      Math.abs(pUnit[0]) > 0.5 ? anchor[0] : center.x,
      Math.abs(pUnit[1]) > 0.5 ? anchor[1] : center.y,
      Math.abs(pUnit[2]) > 0.5 ? anchor[2] : center.z,
    ];

    const angleRad = (angleDeg * Math.PI) / 180;
    const res = draftWithHistory(
      base,
      [{ hash: faceHash }],
      angleRad,
      pullDir,
      { point: planePoint, normal: pUnit },
    );
    const newMap = mergeEdgeFeatureHistory(base.historyMap, res);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = replicad.cast(res.shape as any) as replicad.Shape3D;
    return new OcctBackend(wrapped, undefined, newMap);
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
