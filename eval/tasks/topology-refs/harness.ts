// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/topology-refs/harness.ts
//
// F-surface Task F6 — lock the @kc[...] round-trip property:
//
// 1. Happy path. Build a labeled box with a snapshot-stamping op, capture
//    a face's `@kc[...]` ref via `list_faces`, apply a `fillet` on an
//    unrelated edge set (the captured face survives untouched), then
//    resolve the same ref via `resolve_topo_ref` on the post-fillet
//    shape. The resolver must return `ok` with `entity.kind === 'face'`
//    and `entity.path === 'lineage'` — proving the lineage propagated
//    the ref across the upstream op.
//
// 2. Degraded path. Build the same stamped box, then subtract a divider
//    that splits the captured face into two coplanar regions. The
//    surviving descendants share the original face's lineage, so the
//    resolver must return `ambiguous` with the candidates list
//    populated, surfacing `feature.face-ref.ambiguous-after-split`.
//
// The probes call the F-surface MCP tools (`listFacesTool`,
// `resolveTopoRefTool`) directly with inline scripts so the round-trip
// property is exercised independently of the expert solution under test.
// The expert solution itself drives the standard evaluate-clean +
// volume gates.

import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import { listFacesTool } from '../../../src/agent/mcp/tools/listFaces';
import { resolveTopoRefTool } from '../../../src/agent/mcp/tools/resolveTopoRef';
import type { HarnessResult } from '../../types';

/** Stamped box: the bottom-face pilot hole calls `refreshSnapshots` on
 *  every face of the result shape (per holeLowerer's createdRefs
 *  pipeline), so the carried-over top face gets a lineage snapshot. The
 *  resolver's lineage path requires `snapshot !== undefined`, so this
 *  stamp is the precondition for the `@kc[<owner>/face/top]` ref to
 *  resolve at all. */
const STAMPED_BOX = `
  return box(20, 20, 5, false)
    .hole('bottom', { u: 0, v: 0, diameter: 3, depth: 2 });
`;

/** Happy-path script: the stamped box plus a fillet on the bottom
 *  face. The fillet's lowerer routes through `mergeEdgeFeatureHistory`,
 *  which carries lineage entries forward whether or not the op touched
 *  them — so the top face's lineage propagates intact. */
const STAMPED_BOX_THEN_FILLET = `
  return box(20, 20, 5, false)
    .hole('bottom', { u: 0, v: 0, diameter: 3, depth: 2 })
    .fillet(0.4, { face: 'bottom' });
`;

/** Degraded-path script: the stamped box, then a thin divider
 *  subtracted across the top face. Both surviving descendant face
 *  hashes share the original top face's lineage entry via
 *  `mergeBooleanHistory`'s 1-to-many child mapping, so the resolver
 *  sees two collective-form hits and returns `ambiguous-after-split`. */
const STAMPED_BOX_THEN_SPLIT = `
  const body = box(20, 20, 5, false)
    .hole('bottom', { u: 0, v: 0, diameter: 3, depth: 2 });
  const divider = box(30, 2, 6, false).translate(-5, 9, 0);
  return body.subtract(divider);
`;

interface ProbeOutcome {
  /** list_faces returned the top face with a well-formed `@kc[...]` ref. */
  captureOk: boolean;
  /** Captured ref string from list_faces — pasted into the post-op resolve. */
  capturedRef?: string;
  /** Post-fillet resolve returned `ok` via the lineage path on the captured ref. */
  happyPathOk: boolean;
  /** Hash returned on the post-fillet resolve (for the report). */
  happyPathHash?: string;
  /** Post-split resolve returned `ambiguous-after-split`. */
  degradedPathAmbiguous: boolean;
  /** The ambiguous result's candidate list had at least 2 entries. */
  degradedPathCandidatesPopulated: boolean;
}

/** Exercise both probes against the F-surface MCP surface. Returns a
 *  structured outcome that the gate block below turns into named gate
 *  booleans. */
async function runProbes(): Promise<ProbeOutcome> {
  // ── Probe A: happy path ──────────────────────────────────────────────
  // 1. list_faces on the stamped box → find the top face, capture its ref.
  const facesOnBase = await listFacesTool({ code: STAMPED_BOX });
  if (!facesOnBase.ok || !facesOnBase.faces) {
    return {
      captureOk: false,
      happyPathOk: false,
      degradedPathAmbiguous: false,
      degradedPathCandidatesPopulated: false,
    };
  }
  const topFace = facesOnBase.faces.find(
    (f) => f.lineage.canonicalName === 'top',
  );
  if (!topFace) {
    return {
      captureOk: false,
      happyPathOk: false,
      degradedPathAmbiguous: false,
      degradedPathCandidatesPopulated: false,
    };
  }
  const capturedRef = topFace.ref;
  const captureOk = /^@kc\[[^\]]+\/face\/top\]$/.test(capturedRef);

  // 2. Resolve the captured ref on the post-fillet shape. The fillet
  //    preserves the top face, so the lineage path must carry the ref
  //    through and return `ok`.
  const postFilletResolve = await resolveTopoRefTool({
    code: STAMPED_BOX_THEN_FILLET,
    ref: capturedRef,
  });
  const happyPathOk =
    postFilletResolve.ok === true &&
    postFilletResolve.entity?.kind === 'face' &&
    postFilletResolve.entity?.path === 'lineage' &&
    typeof postFilletResolve.entity.hash === 'string' &&
    postFilletResolve.entity.hash.length > 0;

  // ── Probe B: degraded path ───────────────────────────────────────────
  // Subtracting a divider across the top face splits it into two
  // coplanar descendants that share the same FaceLineage entry; the
  // resolver's collective fallback then matches both and returns
  // `ambiguous-after-split` with the candidates list populated.
  const splitResolve = await resolveTopoRefTool({
    code: STAMPED_BOX_THEN_SPLIT,
    ref: capturedRef,
  });
  const degradedPathAmbiguous =
    splitResolve.ok === false &&
    splitResolve.errorCode === 'feature.face-ref.ambiguous-after-split';
  const degradedPathCandidatesPopulated =
    Array.isArray(splitResolve.candidates) && splitResolve.candidates.length >= 2;

  return {
    captureOk,
    capturedRef,
    happyPathOk,
    happyPathHash: postFilletResolve.ok ? postFilletResolve.entity?.hash : undefined,
    degradedPathAmbiguous,
    degradedPathCandidatesPopulated,
  };
}

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return {
      gates: { 'evaluates clean': false },
      scored: {},
    };
  }

  const s = await getShapeInfo(scriptPath);

  // Expert solution: 20×20×5 box (2000 mm³), minus a Ø3 mm × 2 mm
  // pilot hole (≈14.1 mm³), minus a Ø4 mm through hole (≈62.8 mm³),
  // minus a tiny fillet (negligible). Expected ≈ 1923 mm³.
  const expectedMin = 1880;
  const expectedMax = 1975;

  // The expert solution must produce no blocking `feature.face-ref.*`
  // diagnostics. Info-severity `snapshot-fallback-used` is tolerable;
  // `not-resolvable` and `ambiguous-after-split` would fail the build.
  const blockingFaceRefDiagnostics = ev.diagnostics.filter((d) =>
    typeof d.code === 'string' &&
    d.code.startsWith('feature.face-ref.') &&
    d.code !== 'feature.face-ref.snapshot-fallback-used',
  );

  const probes = await runProbes();

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'no blocking face-ref diagnostics': blockingFaceRefDiagnostics.length === 0,
      // Round-trip probes — lock the F-surface contract.
      'capture: list_faces emits a top-face ref': probes.captureOk,
      'happy path: @kc ref resolves ok through fillet': probes.happyPathOk,
      'degraded path: split face yields ambiguous-after-split':
        probes.degradedPathAmbiguous,
      'degraded path: candidate list populated':
        probes.degradedPathCandidatesPopulated,
    },
    scored: {
      'volume preserved through fillet + hole':
        s.volume > expectedMin && s.volume < expectedMax,
    },
  };
}
