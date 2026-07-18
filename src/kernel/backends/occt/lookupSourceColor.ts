// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
//
// The same walk is exported as `lookupColorFromLineage` /
// `lookupMaterialFromLineage` (inclusive of the start record, any record
// kind) for the single-shape GLB export path, whose "part" is the script's
// tail FeatureRecord rather than an `assemblyPart`. Both callers share one
// precedence rule on purpose — see runAndExport's `case 'glb'`.

import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FeatureId, FeatureRef } from '../../../shared/intent/types';
import { isPBRMaterial, type PBRMaterial } from '../../../shared/intent/material';

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
  // Start at the *source shape*, not the assemblyPart node itself — the part
  // node's own metadata is not a colour attribution site.
  const source = sourceShapeRecord(partRecord, allRecords);
  return source && lookupColorFromLineage(source, allRecords);
}

/** Resolve an `assemblyPart`'s `inputs.shape` to its FeatureRecord. */
function sourceShapeRecord(
  partRecord: FeatureRecord,
  allRecords: readonly FeatureRecord[],
): FeatureRecord | undefined {
  const shapeInput = partRecord.inputs.shape as FeatureRef | undefined;
  if (!shapeInput || shapeInput.kind !== 'feature') return undefined;
  return allRecords.find((r) => r.id === shapeInput.id);
}

/**
 * Walk a record's own metadata, then its upstream chain, for the nearest
 * `metadata.color`. Unlike `lookupSourceColor` this starts *at* `record`
 * (inclusive) and accepts any record kind, so a returned Shape's own colour
 * always wins over anything inherited from its ancestors.
 *
 * Used by the single-shape GLB export path, where the "part" is the tail
 * FeatureRecord of the script rather than an `assemblyPart` node. Sharing the
 * walker keeps ONE colour-precedence convention across assembly fan-out and
 * single-shape export: follow only the primary upstream pointer
 * (shape > base > target), so a colour hidden behind a fillet/hole/transform
 * is reachable but a colour on a boolean's *cutter* is intentionally not.
 */
export function lookupColorFromLineage(
  record: FeatureRecord,
  allRecords: readonly FeatureRecord[],
): string | undefined {
  return walkLineage(record, allRecords, (r) => {
    const color = (r.metadata as { color?: unknown } | undefined)?.color;
    return typeof color === 'string' ? color : undefined;
  });
}

/**
 * `lookupColorFromLineage`'s counterpart for `metadata.material` — same
 * inclusive start, same primary-pointer rule.
 */
export function lookupMaterialFromLineage(
  record: FeatureRecord,
  allRecords: readonly FeatureRecord[],
): PBRMaterial | undefined {
  return walkLineage(record, allRecords, (r) => {
    const material = (r.metadata as { material?: unknown } | undefined)?.material;
    return isPBRMaterial(material) ? material : undefined;
  });
}

/**
 * Shared lineage walker: apply `pick` to `start`, then to each record along
 * the primary upstream pointer, returning the first defined result.
 *
 * Cycle-safe via a `seen` set (records are captured in dependency order by
 * construction, but the guard keeps the walk terminating against future
 * record-graph rewrites).
 */
function walkLineage<T>(
  start: FeatureRecord,
  allRecords: readonly FeatureRecord[],
  pick: (record: FeatureRecord) => T | undefined,
): T | undefined {
  const recordById = new Map<FeatureId, FeatureRecord>(
    allRecords.map((r) => [r.id, r]),
  );

  const seen = new Set<FeatureId>();
  let record: FeatureRecord | undefined = start;

  while (record !== undefined && !seen.has(record.id)) {
    seen.add(record.id);

    const found = pick(record);
    if (found !== undefined) return found;

    const next = nextUpstreamId(record);
    record = next === undefined ? undefined : recordById.get(next);
  }

  return undefined;
}

/**
 * Walk inputs.shape → upstream `metadata.material` to find the nearest PBR
 * material attribution on or above the source Shape passed to
 * `assembly.part(name, sourceShape)`.
 *
 * Mirrors `lookupSourceColor` but reads `metadata.material` (a `PBRMaterial`
 * record set by `Shape.material({...})`). The walker uses the same upstream
 * pointer rule (shape > base > target) and the same boolean-stops-color
 * convention — material identity, like color identity, dies at boolean
 * operations.
 *
 * Returns the first `metadata.material` encountered (a valid PBRMaterial), or
 * `undefined` if no material is set on the upstream chain. Pairs with
 * `lookupSourceColor` — the assembly fan-out should call both; the renderer
 * prefers `material` over `color` when both are present (full PBR > legacy
 * role-token string).
 */
export function lookupSourceMaterial(
  partRecord: FeatureRecord,
  allRecords: readonly FeatureRecord[],
): PBRMaterial | undefined {
  if (partRecord.kind !== 'assemblyPart') return undefined;
  const source = sourceShapeRecord(partRecord, allRecords);
  return source && lookupMaterialFromLineage(source, allRecords);
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
