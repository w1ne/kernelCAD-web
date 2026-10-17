// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Facts read off an evaluated Roadster assembly. Mass is volume times the
// density declared on each part. The 0.13 OpenCascade build this worktree
// resolves does not export the inertia-matrix helper the 0.17 massProperties
// path calls, so centre of mass is the mass-weighted bbox centre.

import type { BuiltModel } from '../../src/modeling/buildModel';
import type { Vec3 } from '../../src/dynamics/spatial';

export interface PartFact {
  readonly name: string;
  readonly density: number;
  readonly massKg: number;
  readonly min: Vec3;
  readonly max: Vec3;
  readonly center: Vec3;
}

export interface RoadsterFacts {
  readonly parts: readonly PartFact[];
  readonly dryMassKg: number;
  readonly comMm: Vec3;
  readonly body: { min: Vec3; max: Vec3 };
  readonly wheels: ReadonlyArray<{ center: Vec3; radius: number }>;
}

interface StoredPart {
  name: string;
  density?: number;
  originalShape: { id: string };
}

export function readRoadsterFacts(model: BuiltModel): RoadsterFacts {
  const arm = model.session.assemblies.get('roadster') as { __parts(): readonly StoredPart[] } | undefined;
  if (!arm) throw new Error('evaluated script has no roadster assembly');
  const parts: PartFact[] = [];
  for (const part of arm.__parts()) {
    const shape = model.shapes.get(part.originalShape.id);
    if (!shape) throw new Error(`no lowered shape for ${part.name}`);
    const density = part.density ?? 1000;
    const volumeM3 = Math.abs(shape.volume()) * 1e-9;
    const bb = shape.boundingBox();
    const min: Vec3 = [bb.min[0], bb.min[1], bb.min[2]];
    const max: Vec3 = [bb.max[0], bb.max[1], bb.max[2]];
    const center: Vec3 = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];
    parts.push({ name: part.name, density, massKg: volumeM3 * density, min, max, center });
  }
  const dryMassKg = parts.reduce((sum, part) => sum + part.massKg, 0);
  const comMm: Vec3 = [0, 0, 0];
  for (const part of parts) {
    comMm[0] += part.center[0] * part.massKg;
    comMm[1] += part.center[1] * part.massKg;
    comMm[2] += part.center[2] * part.massKg;
  }
  comMm[0] /= dryMassKg;
  comMm[1] /= dryMassKg;
  comMm[2] /= dryMassKg;
  const body = parts.find((part) => part.name === 'chassis');
  if (!body) throw new Error('roadster assembly has no chassis');
  const wheels = ['wheel-fl', 'wheel-fr', 'wheel-rl', 'wheel-rr'].map((name) => {
    const wheel = parts.find((part) => part.name === name);
    if (!wheel) throw new Error(`missing ${name}`);
    return { center: wheel.center, radius: (wheel.max[2] - wheel.min[2]) / 2 };
  });
  return { parts, dryMassKg, comMm, body: { min: body.min, max: body.max }, wheels };
}
