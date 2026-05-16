// src/modules/sheetMetal.ts
//
// W2.2 sheet-metal slice 1: pure-TS bend-allowance math + capture-time
// validators. Consumed by:
//   - `sheetMetal(profile, opts)` (modules/api.ts)
//   - `Shape.bend(edgeRef, angle, radius)` (capture/proxy.ts)
//   - `lowerSheetMetalBend(...)` (backends/occt/sheetMetalLowerer.ts)
//   - `flattenPattern(...)` (backends/occt/flattenPattern.ts)
//   - `get_bend_table` MCP tool (mcp/tools/getBendTable.ts)

import { KernelError } from '../shared/intent/kernelError';
import type { FeatureRecord } from '../shared/intent/featureRecord';

export interface BendAllowanceInputs {
  /** Bend angle in degrees. Sign-agnostic for BA itself (sign drives fold direction in lowering). */
  angleDeg: number;
  /** Inner bend radius in mm. Must be positive. */
  radius: number;
  /** K-factor (neutral-axis offset ratio). Must be in [0, 1]. */
  kFactor: number;
  /** Sheet thickness in mm. Must be positive. */
  thickness: number;
}

/**
 * Bend allowance via the K-factor approximation:
 *
 *   BA = (π · |angle_deg| / 180) · (kFactor · thickness + radius)
 *
 * `BA` is the developed length of the neutral axis through the bend arc.
 * The K-factor expresses where the neutral axis sits inside the sheet
 * thickness: 0 = inner surface, 0.5 = mid-plane, 1 = outer surface. Typical
 * mild-steel / aluminum K-factors are 0.33–0.45 (agent supplies the value;
 * the kernel does not bake material tables).
 *
 * Sign convention: returns a non-negative number. `flattenPattern()` uses
 * |BA| as the flat-blank replacement length; the bend's sign only matters
 * for the rotation step in lowering.
 */
export function computeBendAllowance(inputs: BendAllowanceInputs): number {
  const { angleDeg, radius, kFactor, thickness } = inputs;
  return (Math.PI * Math.abs(angleDeg) / 180) * (kFactor * thickness + radius);
}

/** Throws KernelError 'feature.sheetMetal.kfactor-invalid' if k is out of
 *  [0, 1] or non-finite. */
export function validateKFactor(k: number, featureId?: string): void {
  if (!Number.isFinite(k) || k < 0 || k > 1) {
    throw new KernelError(
      'feature.sheetMetal.kfactor-invalid',
      `sheetMetal: kFactor must be a finite number in [0, 1]; got ${k}.`,
      featureId,
      `sheetMetal.kfactor-invalid — kFactor=${k} is outside [0, 1]; typical mild-steel/aluminum values are 0.33–0.45.`,
    );
  }
}

/** Throws KernelError 'feature.invalid-args' if angle is non-finite or
 *  radius is <= 0 / non-finite. Used by Shape.bend at capture time. */
export function validateBendArgs(angleDeg: number, radius: number, featureId?: string): void {
  if (!Number.isFinite(angleDeg)) {
    throw new KernelError(
      'feature.invalid-args',
      `.bend(): angle must be a finite number; got ${angleDeg}.`,
      featureId,
      'invalid-args.bend.angle — pass a finite degrees value.',
    );
  }
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new KernelError(
      'feature.invalid-args',
      `.bend(): radius must be a positive finite number; got ${radius}.`,
      featureId,
      'invalid-args.bend.radius — pass a positive finite mm value.',
    );
  }
}

/** Throws KernelError 'feature.invalid-args' if thickness is <= 0 /
 *  non-finite. Used by sheetMetal at capture time. */
export function validateThickness(t: number, featureId?: string): void {
  if (!Number.isFinite(t) || t <= 0) {
    throw new KernelError(
      'feature.invalid-args',
      `sheetMetal: thickness must be a positive finite number; got ${t}.`,
      featureId,
      'invalid-args.sheetMetal.thickness — pass a positive finite mm value.',
    );
  }
}

/**
 * Walk a FeatureRecord chain backward from `bend` to find the root
 * `sheetMetal` record. Returns undefined if the chain does not root at a
 * sheetMetal record (means the agent chained `.bend()` on a non-sheet-metal
 * Shape — surfaces as `feature.invalid-args` at lowering time).
 *
 * Walks via `inputs.base` (the predecessor link used by every Shape-chain
 * feature). Slice-1 sheet-metal records use `inputs.sketch` (root) and
 * `inputs.base` (bends) — see modules/api.ts and capture/proxy.ts.
 */
export function findRootSheetMetalRecord(
  bend: FeatureRecord,
  records: readonly FeatureRecord[],
): FeatureRecord | undefined {
  const byId = new Map(records.map(r => [r.id, r]));
  let cur: FeatureRecord | undefined = bend;
  while (cur) {
    if (cur.kind === 'sheetMetal') return cur;
    const baseRef = cur.inputs.base;
    if (!baseRef || baseRef.kind !== 'feature') return undefined;
    cur = byId.get(baseRef.id);
  }
  return undefined;
}
