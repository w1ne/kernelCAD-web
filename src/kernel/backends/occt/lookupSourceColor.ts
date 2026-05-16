// src/backends/occt/lookupSourceColor.ts
//
// SceneBackend emission helper (used by the solvedAssembly / assemblyModel
// lowerer paths in occtLowerer.ts). Walks an `assemblyPart`'s upstream input
// chain to find the nearest `metadata.color` attribution and returns it as a
// string (a ColorToken like 'plate' or a `#rrggbb` literal).
//
// Why a sibling file: keeps the lowerer module focused on FeatureLowerer
// dispatch, lets the helper be tested directly without re-importing the OCCT
// runtime through occtLowerer, and avoids cluttering occtLowerer's already
// 1.5k-line namespace.
//
// Color attribution rules (cf. proxy.color):
//   - `.color()` mutates the most recent record's metadata in place; it does
//     not allocate a new feature node.
//   - "Color identity dies at boolean operations" — booleans/cutouts don't
//     forward color to the result record. The chain walked here only
//     follows the *primary* upstream pointer (shape/base/target), so a
//     coloured leaf hidden behind a fillet/hole is reachable but a leaf
//     hidden behind a boolean's cutter chain is intentionally NOT reachable
//     unless the user explicitly recolours the boolean result.

import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FeatureId, FeatureRef } from '../../../shared/intent/types';

/**
 * Walk inputs.shape → upstream metadata.color to find the nearest color
 * attribution on or above the source Shape that was passed to
 * `assembly.part(name, sourceShape)`.
 *
 * Returns the first `metadata.color` encountered (a role token like
 * `'plate'` or a `#rrggbb` hex string), or `undefined` if no color is set
 * anywhere on the upstream chain.
 *
 * The walker follows the primary upstream pointer for each shape-producing
 * record kind:
 *   - assemblyPart        -> `inputs.shape`
 *   - boolean / fillet /
 *     chamfer / shell /
 *     mirror / pattern /
 *     draft               -> `inputs.base`
 *   - hole / holes /
 *     cutout              -> `inputs.target`
 *
 * Cycle-safe via a `seen` set (FeatureRecord IDs are append-only by
 * construction, but the helper keeps the guard for robustness against
 * future record-graph rewrites).
 */
export function lookupSourceColor(
  partRecord: FeatureRecord,
  allRecords: readonly FeatureRecord[],
): string | undefined {
  if (partRecord.kind !== 'assemblyPart') return undefined;

  const recordById = new Map<FeatureId, FeatureRecord>(
    allRecords.map((r) => [r.id, r]),
  );

  const shapeInput = partRecord.inputs.shape as FeatureRef | undefined;
  if (!shapeInput || shapeInput.kind !== 'feature') return undefined;

  const seen = new Set<FeatureId>();
  let cursor: FeatureId | undefined = shapeInput.id;

  while (cursor !== undefined && !seen.has(cursor)) {
    seen.add(cursor);
    const record = recordById.get(cursor);
    if (record === undefined) return undefined;

    const color = (record.metadata as { color?: unknown } | undefined)?.color;
    if (typeof color === 'string') return color;

    cursor = nextUpstreamId(record);
  }

  return undefined;
}

/**
 * Pick the primary upstream FeatureId from a record's `inputs` map, in the
 * order shape > base > target. Returns `undefined` for primitives (no
 * upstream shape input) — terminating the walk.
 */
function nextUpstreamId(record: FeatureRecord): FeatureId | undefined {
  const inputs = record.inputs;
  return (
    featureIdOf(inputs.shape) ??
    featureIdOf(inputs.base) ??
    featureIdOf(inputs.target)
  );
}

function featureIdOf(ref: FeatureRef | undefined): FeatureId | undefined {
  if (ref === undefined) return undefined;
  if (ref.kind === 'feature') return ref.id;
  return undefined;
}
