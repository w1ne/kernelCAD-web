// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Face } from 'replicad';
import type { Assembly } from '../capture/assembly';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { resolveCanonicalByGeometry } from '../../kernel/backends/occt/canonicalFaceGeometry';
import type { Transform } from '../../shared/runtime/se3';
import { parseConnectorRef, type AdhesiveMateMetadata } from './mate';
import type { ValidatorDiagnostic } from './validator';

export async function validateAdhesiveMates(
  arm: Assembly,
  placements: ReadonlyMap<string, Transform>,
): Promise<ValidatorDiagnostic[]> {
  const diagnostics: ValidatorDiagnostic[] = [];
  const parts = new Map(arm.__parts().map((part) => [part.name, part]));
  async function resolve(ref: string, side: AdhesiveMateMetadata['faceA']) {
    const { partName } = parseConnectorRef(ref);
    const placement = placements.get(partName);
    const part = parts.get(partName);
    if (!part || !placement) return undefined;
    const shape = await part.originalShape.lower();
    if (!(shape instanceof OcctBackend)) return undefined;
    const selected = resolveCanonicalByGeometry(shape.getReplicadShape(), side);
    if (selected.kind !== 'resolved') return undefined;
    return new OcctBackend(selected.face as never).located(placement);
  }
  for (const mate of arm.__mates()) {
    if (!mate.adhesive) continue;
    let reason: string;
    try {
      const a = await resolve(mate.a, mate.adhesive.faceA);
      const b = await resolve(mate.b, mate.adhesive.faceB);
      if (!a || !b) {
        reason = 'the declared faces could not be resolved on the solved parts';
      } else {
        const na = (a.getReplicadShape() as unknown as Face).normalAt();
        const nb = (b.getReplicadShape() as unknown as Face).normalAt();
        if (na.x * nb.x + na.y * nb.y + na.z * nb.z > -1 + 1e-8) {
          reason = 'the declared faces do not oppose each other';
        } else if (a.intersectionMetrics(b, true).areaMm2 > 1e-8) {
          continue;
        } else {
          reason = 'the declared faces do not share a positive contact area';
        }
      }
    } catch {
      reason = 'the kernel could not measure the declared faces';
    }
    diagnostics.push({
      code: 'assembly.mate.adhesive-contact',
      severity: 'error',
      mateName: mate.name,
      message: `Adhesive mate '${mate.name}': ${reason}.`,
      hint: 'Choose opposing planar faces that share area in the solved assembly.',
    });
  }
  return diagnostics;
}
