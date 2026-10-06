// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Geometry identity for assembly instancing.
// Spec: docs/specs/2026-10-06-assembly-instancing-scale-design.md (kernelCAD-private) §1.
//
// geometryKey(record) = digest(structural hash of the record with every input
// id replaced by the input's own geometryKey). Two records with equal keys
// lower to identical local-frame geometry, so the engine may lower one and
// alias the other, and meshing may tessellate once.
//
// Safety bias (same as prefixReuse.ts): a missing key only costs sharing; a
// wrong equal key renders the wrong part. So: allow-list of pure lowerers,
// any suppressed / virtual / surface-ref / unknown input => no key, and the
// hash over-includes every lowering-relevant field. The only fields left out
// are record ids, script locations, derived paramRefs (all excluded by
// structuralHashRecord) and appearance metadata, which no OCCT lowerer reads.

import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId, FeatureKind } from '../../shared/intent/types';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { stableStringify, structuralHashRecord } from './prefixReuse';

/** Kinds whose lowering is a pure function of the record and its inputs. */
export const SHAREABLE_KINDS: ReadonlySet<FeatureKind> = new Set<FeatureKind>([
  'box', 'cylinder', 'sphere', 'torus',
  'sketch', 'extrude', 'revolve', 'sweep', 'loft',
  'boolean', 'fillet', 'chamfer', 'shell', 'draft', 'hole', 'holes', 'cutout',
  'mirror', 'pattern', 'sheetMetal', 'sheetMetalBend',
  'importedStep', 'assemblyPart',
]);

/** Metadata keys that only affect appearance, never the lowered BREP. */
const APPEARANCE_KEYS: readonly string[] = ['color', 'material', 'materialByLabel'];

let sharingEnabled = true;

/** Test hook for the sharing-correctness sweep (build with sharing off/on). */
export function setGeometrySharingForTests(enabled: boolean): void {
  sharingEnabled = enabled;
}

export function isGeometrySharingEnabled(): boolean {
  return sharingEnabled;
}

function cyrb53(str: string, seed: number): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** Deterministic ~106-bit digest (two seeded 53-bit lanes). Not cryptographic. */
export function digest(s: string): string {
  return cyrb53(s, 1) + cyrb53(s, 2);
}

interface KeyCtx {
  readonly byId: ReadonlyMap<FeatureId, FeatureRecord>;
  readonly paramTable: ParamTable | undefined;
  readonly memo: Map<FeatureId, string | null>;
  readonly inProgress: Set<FeatureId>;
}

/** Every record's geometry key; records with no key are absent. */
export function computeGeometryKeys(
  records: readonly FeatureRecord[],
  paramTable: ParamTable | undefined,
): Map<FeatureId, string> {
  const ctx: KeyCtx = {
    byId: new Map(records.map((r) => [r.id, r] as const)),
    paramTable,
    memo: new Map(),
    inProgress: new Set(),
  };
  // Records are captured in dependency order, so iterating in order keeps the
  // recursion one level deep; keyOf still recurses for out-of-order inputs.
  for (const r of records) keyOf(r.id, ctx);
  const out = new Map<FeatureId, string>();
  for (const [id, key] of ctx.memo) if (key !== null) out.set(id, key);
  return out;
}

function keyOf(id: FeatureId, ctx: KeyCtx): string | null {
  const cached = ctx.memo.get(id);
  if (cached !== undefined) return cached;
  const r = ctx.byId.get(id);
  if (r === undefined || ctx.inProgress.has(id)) return null;
  ctx.inProgress.add(id);
  let key: string | null;
  try {
    key = computeKey(r, ctx);
  } catch {
    // stableStringify / resolveParams threw on an unexpected value: no sharing.
    key = null;
  }
  ctx.inProgress.delete(id);
  ctx.memo.set(id, key);
  return key;
}

function computeKey(r: FeatureRecord, ctx: KeyCtx): string | null {
  if (r.suppressed || r.metadata?.virtual === true) return null;
  if (!SHAREABLE_KINDS.has(r.kind)) return null;
  if (r.kind === 'importedStep' && importIdentity(r) === undefined) return null;
  const inputs = keyedInputs(r, ctx);
  if (inputs === null) return null;
  if (r.kind === 'assemblyPart') {
    // The part key covers its source geometry only (`at:` lives in the scene
    // part's worldTransform). Part handles expose no transform API, so record
    // transforms never appear on captured parts; if one does, refuse to share.
    if (r.transforms.length > 0) return null;
    return digest(`assemblyPart|${stableStringify(inputs)}`);
  }
  const canonical: FeatureRecord = {
    ...r,
    id: '',
    inputs: inputs as unknown as FeatureRecord['inputs'],
    metadata: stripAppearance(r.metadata),
  };
  delete (canonical as { scriptLocation?: unknown }).scriptLocation;
  return digest(`${r.kind}|${structuralHashRecord(canonical, ctx.paramTable)}`);
}

/** Inputs with every upstream id replaced by that input's key; null when any
 *  input has no key or is a surface ref (resolved outside the record DAG). */
function keyedInputs(r: FeatureRecord, ctx: KeyCtx): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const [name, ref] of Object.entries(r.inputs)) {
    if (ref.kind === 'surface') return null;
    const upstream = ref.kind === 'feature' ? ref.id : ref.featureId;
    const childKey = keyOf(upstream, ctx);
    if (childKey === null) return null;
    out[name] = ref.kind === 'feature'
      ? { kind: 'feature', key: childKey }
      : { ...ref, featureId: childKey };
  }
  return out;
}

function stripAppearance(metadata: FeatureRecord['metadata']): FeatureRecord['metadata'] {
  if (metadata === undefined) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (!APPEARANCE_KEYS.includes(k)) out[k] = v;
  }
  return out as FeatureRecord['metadata'];
}

/** Content identity of an imported STEP: catalog sha256 or the file hash. */
function importIdentity(r: FeatureRecord): string | undefined {
  const md = r.metadata as { catalogPart?: { sha256?: unknown }; contentSha256?: unknown } | undefined;
  if (typeof md?.catalogPart?.sha256 === 'string') return md.catalogPart.sha256;
  if (typeof md?.contentSha256 === 'string') return md.contentSha256;
  return undefined;
}
