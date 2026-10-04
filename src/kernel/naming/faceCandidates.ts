// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/faceCandidates.ts
//
// Concrete candidate list for `feature.face-ref.ambiguous-after-split`. When
// an upstream boolean splits a named face (or a union brings in a second face
// with the same canonical name), the resolver knows the surviving face hashes
// but used to print only a count. This module turns those hashes into
// "centre + normal + the selector that picks this one", so the agent can
// retry once instead of guessing.
//
// It never picks a candidate itself: a canonical name means "that face of the
// originating primitive", not "the most-negative-Y face", so there is no
// documented rule to resolve by. The caller keeps the error.

import type { FaceHash } from './evolutionRecord';
import type { OcctBackend } from '../backends/occt/occtBackend';
import { faceByHash } from '../backends/occt/faceByHash';

export interface FaceCandidate {
  readonly hash: FaceHash;
  /** Face centre (mm), rounded to 0.01. */
  readonly center: readonly [number, number, number];
  /** Unit outward normal at the centre, rounded to 0.001. */
  readonly normal: readonly [number, number, number];
  /** A FaceQuery literal that selects this candidate, e.g. `{ byNormal: 'Z', atX: 7.5, atY: 10, atZ: 10 }`. */
  readonly selector: string;
}

const AXIS_NAMES = ['X', 'Y', 'Z'] as const;
/** Off-axis bound for calling a normal axis-aligned. */
const AXIS_TOL = 1e-3;

function fix(v: number, digits: number): number {
  const r = Number(v.toFixed(digits));
  return r === 0 ? 0 : r; // no "-0" in printed selectors
}

function axisName(n: readonly [number, number, number]): string | undefined {
  for (let i = 0; i < 3; i++) {
    const others = [0, 1, 2].filter((j) => j !== i);
    if (Math.abs(Math.abs(n[i]) - 1) < AXIS_TOL && others.every((j) => Math.abs(n[j]) < AXIS_TOL)) {
      return `${n[i] < 0 ? '-' : ''}${AXIS_NAMES[i]}`;
    }
  }
  return undefined;
}

/**
 * Describe each surviving face. Hashes that no longer resolve on `shape`
 * (stale) are skipped; an OCCT failure on one face never hides the others.
 */
export function describeFaceCandidates(
  shape: OcctBackend,
  hashes: readonly FaceHash[],
): FaceCandidate[] {
  const out: FaceCandidate[] = [];
  for (const hash of hashes) {
    try {
      const face = faceByHash(shape, hash);
      const c = face.center;
      const nv = face.normalAt(c);
      const center = [fix(c.x, 2), fix(c.y, 2), fix(c.z, 2)] as const;
      const normal = [fix(nv.x, 3), fix(nv.y, 3), fix(nv.z, 3)] as const;
      const axis = axisName(normal);
      // atX/atY/atZ FILTER by face centre (1 mm default tolerance), so the
      // selector isolates this face even for consumers that use every match
      // (fillet/chamfer `{ face }`). `near` only sorts, so it is not used.
      const at = `atX: ${center[0]}, atY: ${center[1]}, atZ: ${center[2]}`;
      const selector = axis === undefined ? `{ ${at} }` : `{ byNormal: '${axis}', ${at} }`;
      out.push({ hash, center, normal, selector });
    } catch {
      continue;
    }
  }
  return out;
}

/**
 * One-line-per-candidate text for the diagnostic message, plus the concrete
 * fix. `refText` is how the user wrote the ref (e.g. `'front'`).
 */
export function formatFaceCandidates(refText: string, candidates: readonly FaceCandidate[]): string {
  const lines = candidates.map((c, i) =>
    `  #${i + 1} centre (${c.center.join(', ')}), normal (${c.normal.join(', ')}) → face: ${c.selector}`,
  );
  return (
    `Candidates for ${refText}:\n${lines.join('\n')}\n` +
    `Fix: pass the FaceQuery of the one you mean in place of ${refText} ` +
    `(\`atX/atY/atZ\` match the face centre within 1 mm), or apply this feature to the primitive ` +
    `BEFORE the union/cut that split it.`
  );
}
