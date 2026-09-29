// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/backends/occt/featureSanity.ts
//
// Post-feature sanity gate. Runs on EVERY lowered solid feature (from
// `finishLowering`) and fails the feature closed when the kernel handed back
// geometry that cannot be right:
//
//   1. A non-finite or astronomically large bounding box. OCCT reports an
//      "open" `Bnd_Box` as ±1e100 when a result carries unbounded or broken
//      geometry; a volume of 1e102 comes with it. No real part is 10 km wide.
//   2. For operations whose result must stay near their inputs (booleans,
//      fillet, chamfer, shell, draft, hole, cutout): a result box that pokes far
//      outside the union of the input boxes. A shell of a 130 mm vase whose box
//      spans 770 mm is a broken offset surface, not a thin wall.
//   3. For the offset/sweep kinds that are known to return broken solids
//      without raising (shell, variableSweep): a non-finite or non-positive
//      volume, or a shell whose volume exceeds its input's.
//
// Cost: the bounding box is OCCT's `Bnd_Box` (no meshing). The volume probe
// runs only for the two fragile kinds, which already pay far more for the
// offset / pipe-shell build itself. Every other kind pays one box read.

import type { ShapeBackend } from '../../../kernel/backends/backend';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { Vec3 } from '../../../shared/intent/types';

/** No modelled part is 10 km across; beyond this a coordinate is garbage. */
const ABSOLUTE_LIMIT_MM = 1e7;

/** Kinds whose result must lie inside the union of their inputs' boxes,
 *  grown by `BOUNDED_MARGIN_FACTOR` × that union's diagonal. */
const BOUNDED_KINDS: ReadonlySet<string> = new Set([
  'boolean', 'fillet', 'chamfer', 'shell', 'draft', 'hole', 'holes', 'cutout',
]);
const BOUNDED_MARGIN_FACTOR = 0.5;

/** Kinds that get the volume probe (see header, check 3). */
const VOLUME_PROBED_KINDS: ReadonlySet<string> = new Set(['shell', 'variableSweep']);

interface Box {
  min: Vec3;
  max: Vec3;
}

/**
 * Check one lowered feature result. Returns the error diagnostic when the
 * result is absurd, `null` when it is plausible or not a solid (sketches,
 * scenes, virtual records, empty results — other gates own those).
 */
export function absurdGeometryDiagnostic(
  r: FeatureRecord,
  shape: ShapeBackend | undefined,
  inputs: readonly unknown[],
): CompilerDiagnostic | null {
  if (!(shape instanceof OcctBackend) || shape.kind === 'sketch') return null;
  const box = readBox(shape);
  if (box === undefined) return null;

  const coords = [...box.min, ...box.max];
  if (coords.some((c) => !Number.isFinite(c) || Math.abs(c) > ABSOLUTE_LIMIT_MM)) {
    return diag(r, `its bounding box is ${fmtBox(box)}, which is non-finite or wider than ${ABSOLUTE_LIMIT_MM / 1e6} km`);
  }

  const inputBoxes = inputs
    .filter((i): i is OcctBackend => i instanceof OcctBackend && i.kind !== 'sketch')
    .map(readBox)
    .filter((b): b is Box => b !== undefined && [...b.min, ...b.max].every(Number.isFinite));

  if (BOUNDED_KINDS.has(r.kind) && inputBoxes.length > 0) {
    const union = unionBox(inputBoxes);
    const diagLen = Math.hypot(
      union.max[0] - union.min[0], union.max[1] - union.min[1], union.max[2] - union.min[2],
    );
    const margin = Math.max(1, diagLen * BOUNDED_MARGIN_FACTOR);
    for (let a = 0; a < 3; a++) {
      if (box.min[a] < union.min[a] - margin || box.max[a] > union.max[a] + margin) {
        return diag(
          r,
          `its bounding box ${fmtBox(box)} reaches far outside its inputs' box ${fmtBox(union)} ` +
            `(allowed margin ${margin.toFixed(1)} mm); a ${r.kind} cannot grow the part that much`,
        );
      }
    }
  }

  if (VOLUME_PROBED_KINDS.has(r.kind)) {
    let volume: number;
    try {
      volume = shape.volume();
    } catch {
      volume = Number.NaN;
    }
    if (!Number.isFinite(volume) || volume <= 0) {
      return diag(r, `its volume is ${volume}, so it is not a valid closed solid`);
    }
    if (r.kind === 'shell' && inputs.length > 0) {
      const input = inputs.find((i): i is OcctBackend => i instanceof OcctBackend && i.kind !== 'sketch');
      if (input !== undefined && isInwardShell(r)) {
        const before = safeVolume(input);
        if (before !== undefined && volume > before * (1 + 1e-6) + 1e-6) {
          return diag(
            r,
            `its volume ${volume.toFixed(1)} mm³ exceeds the solid it hollowed (${before.toFixed(1)} mm³); ` +
              'an inward shell can only remove material',
          );
        }
      }
    }
  }
  return null;
}

function readBox(shape: OcctBackend): Box | undefined {
  try {
    if (shape.isEmpty()) return undefined;
    return shape.boundingBox();
  } catch {
    return undefined;
  }
}

function safeVolume(shape: OcctBackend): number | undefined {
  try {
    const v = shape.volume();
    return Number.isFinite(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

/** `shell(t)` with t > 0 hollows inward (the lowerer's convention); a
 *  negative thickness grows the wall outward, which may add volume. */
function isInwardShell(r: FeatureRecord): boolean {
  const t = (r.params as { thickness?: { evaluated?: unknown } } | undefined)?.thickness?.evaluated;
  return typeof t === 'number' && t > 0;
}

function unionBox(boxes: readonly Box[]): Box {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], b.min[a]);
      max[a] = Math.max(max[a], b.max[a]);
    }
  }
  return { min, max };
}

function fmtBox(b: Box): string {
  const f = (v: Vec3) => `[${v.map((c) => (Math.abs(c) >= 1e6 ? c.toExponential(2) : c.toFixed(1))).join(', ')}]`;
  return `${f(b.min)}..${f(b.max)}`;
}

function diag(r: FeatureRecord, why: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'feature.result.absurd-geometry',
    featureId: r.id,
    severity: 'error',
    message: `${r.kind} '${r.id}' returned geometry that cannot be right: ${why}. The kernel did not raise, so the result was rejected here instead of passing on as a valid solid.`,
    hint: HINT_TEMPLATES['feature.result.absurd-geometry'].template,
  };
}
