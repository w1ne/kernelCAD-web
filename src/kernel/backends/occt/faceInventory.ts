// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/faceInventory.ts
//
// One entry per face of a body: its S1 binding fingerprint (surface type,
// area, centroid, plane normal or cylinder/cone axis, radius), the torus
// radii the fingerprint does not carry, and the face's HistoryMap lineage.
// The face-level geometry diff reads bodies through this so the agent layer
// never touches replicad faces directly.

import { getOC, type Face } from 'replicad';
import type { BindingFingerprint } from '../../../shared/intent/selectionRecord';
import type { FaceLineage } from '../../naming/evolutionRecord';
import { faceFingerprint } from './bindingFingerprint';
import { faceHashOf } from './createdRefs';
import type { OcctBackend } from './occtBackend';

export interface FaceInventoryEntry {
  fingerprint: BindingFingerprint;
  /** Torus minor / major radius (the fingerprint carries none for tori). */
  torus?: { minorRadius: number; majorRadius: number };
  lineage?: FaceLineage;
}

function torusRadii(face: Face): FaceInventoryEntry['torus'] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- installed OCCT API
  const oc = getOC() as any;
  const adaptor = new oc.BRepAdaptor_Surface_2(face.wrapped, true);
  try {
    const t = adaptor.Torus();
    try {
      return { minorRadius: t.MinorRadius() as number, majorRadius: t.MajorRadius() as number };
    } finally { t.delete(); }
  } catch {
    return undefined;
  } finally {
    adaptor.delete();
  }
}

/** Every face of `shape`, in BREP order. Empty if the shape has no faces or
 *  cannot be explored. */
export function faceInventory(shape: OcctBackend): FaceInventoryEntry[] {
  let faces: Face[];
  try {
    faces = (shape.getReplicadShape() as unknown as { faces: Face[] }).faces;
  } catch {
    return [];
  }
  return faces.map((face) => {
    const fingerprint = faceFingerprint(shape, face);
    const lineage = shape.historyMap?.get(faceHashOf(face));
    const torus = fingerprint.geomType === 'TORUS' ? torusRadii(face) : undefined;
    return {
      fingerprint,
      ...(torus !== undefined ? { torus } : {}),
      ...(lineage !== undefined ? { lineage } : {}),
    };
  });
}
