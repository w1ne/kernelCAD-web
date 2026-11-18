// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A variant is a named set of parts to leave out of an assembly. Applying it
// parks those parts, and anything connected to them, plus the mates, joints,
// and mate couplings that mention them. The parked records stay on the
// assembly so another variant, or an import of a different variant, can
// put them back. Tendons, loop-mode pins, planning groups, disabled
// collisions, and part lineage are not rewritten.

import { FEATURE_NAME_REGEX } from '../../shared/intent/featureName';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FeatureId } from '../../shared/intent/types';
import type { MateRecord } from '../mates/mate';
import type { ParkedRecord, AssemblyState } from './assemblyState';
import type { AssemblyPartStored, AssemblyVariantOpts } from './assemblyTypes';

const VARIANT_EXAMPLE = "arm.variant('open', { suppress: ['cover'] })";
const USE_EXAMPLE = "arm.useVariant('open')";
const IMPORT_EXAMPLE = "parent.subAssembly('nest', child, { variant: 'open' })";

export interface AssemblyImportPlan {
  readonly parts: readonly AssemblyPartStored[];
  readonly mates: readonly MateRecord[];
}

export function declareAssemblyVariant(
  state: AssemblyState,
  name: string,
  opts?: AssemblyVariantOpts,
): void {
  requireVariantName(name);
  if (state.variants.has(name)) {
    invalidArgs({
      api: 'variant(name, opts)',
      path: 'name',
      got: name,
      requires: 'a variant name that is not already declared on this assembly',
      example: VARIANT_EXAMPLE,
      hintSlug: 'invalid-args.assembly.variant-duplicate',
    });
  }
  const suppress = suppressNames(opts);
  requireKnownParts(suppress, authoredPartNames(state));
  state.variants.set(name, new Set(suppress));
}

export function applyAssemblyVariant(state: AssemblyState, name: string): void {
  const suppress = state.variants.get(name);
  if (suppress === undefined) {
    rejectUnknownVariant('useVariant(name)', USE_EXAMPLE, state, name);
  }
  restoreAssemblyVariant(state);
  parkAssemblyVariant(state, suppressionClosure(state.parts, suppress));
  state.activeVariant = name;
}

/** Parts and mates an import would copy. Does not change this assembly. */
export function importPlanFromState(state: AssemblyState, variant?: string): AssemblyImportPlan {
  if (variant === undefined) {
    return { parts: state.parts.slice(), mates: state.mates.slice() };
  }
  const suppress = state.variants.get(variant);
  if (suppress === undefined) {
    rejectUnknownVariant('subAssembly(name, other, { variant })', IMPORT_EXAMPLE, state, variant);
  }
  const parts = mergeParked(state.parts, state.hiddenParts);
  const dropped = suppressionClosure(parts, suppress);
  const kept = parts.filter((part) => !dropped.has(part.name));
  const names = new Set(kept.map((part) => part.name));
  return { parts: kept, mates: matesAmong(mergeParked(state.mates, state.hiddenMates), names) };
}

function requireVariantName(name: string): void {
  if (typeof name === 'string' && FEATURE_NAME_REGEX.test(name)) return;
  invalidArgs({
    api: 'variant(name, opts)',
    path: 'name',
    got: name,
    showType: typeof name !== 'string',
    requires: `a name matching ${FEATURE_NAME_REGEX.source}`,
    example: VARIANT_EXAMPLE,
    hintSlug: 'invalid-args.assembly.variant-syntax',
  });
}

function rejectUnknownVariant(api: string, example: string, state: AssemblyState, name: string): never {
  const known = [...state.variants.keys()];
  const listed = known.length === 0
    ? 'a name already passed to variant() on this assembly'
    : `a name already passed to variant() on this assembly (${known.join(', ')})`;
  invalidArgs({
    api,
    path: 'name',
    got: name,
    requires: listed,
    example,
    hintSlug: 'invalid-args.assembly.variant-unknown',
  });
}

function requireVariantOpts(opts: AssemblyVariantOpts): void {
  if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: 'variant(name, opts)',
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an object with an optional suppress array',
      example: VARIANT_EXAMPLE,
      hintSlug: 'invalid-args.assembly.variant-suppress',
    });
  }
  for (const key of Object.keys(opts)) {
    if (key === 'suppress') continue;
    invalidArgs({
      api: 'variant(name, opts)',
      path: `opts.${key}`,
      got: key,
      requires: "only 'suppress'",
      example: VARIANT_EXAMPLE,
      hintSlug: 'invalid-args.assembly.variant-suppress',
    });
  }
}

function suppressNames(opts: AssemblyVariantOpts | undefined): string[] {
  if (opts === undefined) return [];
  requireVariantOpts(opts);
  const raw = opts.suppress;
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    invalidArgs({
      api: 'variant(name, opts)',
      path: 'opts.suppress',
      got: raw,
      showType: true,
      requires: 'an array of part names',
      example: VARIANT_EXAMPLE,
      hintSlug: 'invalid-args.assembly.variant-suppress',
    });
  }
  return raw.map((entry) => suppressEntry(entry));
}

function suppressEntry(entry: unknown): string {
  if (typeof entry === 'string') return entry;
  invalidArgs({
    api: 'variant(name, opts)',
    path: 'opts.suppress',
    got: entry,
    showType: true,
    requires: 'a part name string',
    example: VARIANT_EXAMPLE,
    hintSlug: 'invalid-args.assembly.variant-suppress',
  });
}

function requireKnownParts(names: readonly string[], authored: ReadonlySet<string>): void {
  const known = [...authored].join(', ') || '(none)';
  for (const name of names) {
    if (authored.has(name)) continue;
    invalidArgs({
      api: 'variant(name, opts)',
      path: 'opts.suppress',
      got: name,
      requires: `a part name on this assembly (${known})`,
      example: VARIANT_EXAMPLE,
      hintSlug: 'invalid-args.assembly.variant-suppress',
    });
  }
}

function authoredPartNames(state: AssemblyState): Set<string> {
  return new Set(mergeParked(state.parts, state.hiddenParts).map((part) => part.name));
}

function restoreAssemblyVariant(state: AssemblyState): void {
  restoreParked(state.parts, state.hiddenParts);
  restoreParked(state.mates, state.hiddenMates);
  restoreParked(state.joints, state.hiddenJoints);
  restoreParked(state.mateCouplings, state.hiddenCouplings);
  state.activeVariant = undefined;
}

function parkAssemblyVariant(state: AssemblyState, dropped: ReadonlySet<string>): void {
  const droppedIds = new Set(state.parts.filter((part) => dropped.has(part.name)).map((part) => part.id));
  const parkedMates = new Set<string>();
  parkWhere(state.parts, state.hiddenParts, (part) => dropped.has(part.name));
  parkWhere(state.mates, state.hiddenMates, (mate) => hideMate(mate, dropped, parkedMates));
  parkWhere(state.joints, state.hiddenJoints, (joint) => jointTouches(joint, droppedIds));
  parkWhere(state.mateCouplings, state.hiddenCouplings, (coupling) => couplingTouches(coupling, parkedMates));
}

function hideMate(mate: MateRecord, dropped: ReadonlySet<string>, parkedMates: Set<string>): boolean {
  const hide = mateDropped(mate, dropped);
  if (hide) parkedMates.add(mate.name);
  return hide;
}

function jointTouches(joint: { parentPartId: FeatureId; childPartId: FeatureId }, droppedIds: ReadonlySet<FeatureId>): boolean {
  return droppedIds.has(joint.parentPartId) || droppedIds.has(joint.childPartId);
}

function couplingTouches(coupling: { driven: string; source: string }, parkedMates: ReadonlySet<string>): boolean {
  return parkedMates.has(coupling.driven) || parkedMates.has(coupling.source);
}

function restoreParked<T>(live: T[], parked: ParkedRecord<T>[]): void {
  const ordered = [...parked].sort((a, b) => a.index - b.index);
  for (const item of ordered) live.splice(item.index, 0, item.value);
  parked.length = 0;
}

function parkWhere<T>(live: T[], parked: ParkedRecord<T>[], drop: (value: T) => boolean): void {
  for (let index = live.length - 1; index >= 0; index -= 1) {
    const value = live[index];
    if (value === undefined || !drop(value)) continue;
    live.splice(index, 1);
    parked.push({ index, value });
  }
}

function mergeParked<T>(live: readonly T[], parked: readonly ParkedRecord<T>[]): T[] {
  const merged = live.slice();
  const ordered = [...parked].sort((a, b) => a.index - b.index);
  for (const item of ordered) merged.splice(item.index, 0, item.value);
  return merged;
}

function suppressionClosure(parts: readonly AssemblyPartStored[], suppress: ReadonlySet<string>): Set<string> {
  const byId = new Map(parts.map((part) => [part.id, part]));
  const dropped = new Set(suppress);
  for (const part of parts) {
    if (ancestorSuppressed(part, byId, dropped)) dropped.add(part.name);
  }
  return dropped;
}

function ancestorSuppressed(
  part: AssemblyPartStored,
  byId: ReadonlyMap<FeatureId, AssemblyPartStored>,
  dropped: ReadonlySet<string>,
): boolean {
  if (dropped.has(part.name)) return true;
  const seen = new Set<FeatureId>();
  let current = part.connectParentId;
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    const parent = byId.get(current);
    if (parent === undefined) return false;
    if (dropped.has(parent.name)) return true;
    current = parent.connectParentId;
  }
  return false;
}

function matesAmong(mates: readonly MateRecord[], names: ReadonlySet<string>): MateRecord[] {
  return mates.filter((mate) => {
    const a = partNameOf(mate.a);
    const b = partNameOf(mate.b);
    return a !== undefined && b !== undefined && names.has(a) && names.has(b);
  });
}

function mateDropped(mate: MateRecord, dropped: ReadonlySet<string>): boolean {
  const a = partNameOf(mate.a);
  const b = partNameOf(mate.b);
  return (a !== undefined && dropped.has(a)) || (b !== undefined && dropped.has(b));
}

/** Part name from `part.connector` or `@kc[part/connector/name]`. */
function partNameOf(ref: string): string | undefined {
  const kc = /^@kc\[([^/\]]+)/.exec(ref);
  if (kc?.[1] !== undefined) return kc[1];
  const dot = ref.indexOf('.');
  if (dot <= 0) return undefined;
  return ref.slice(0, dot);
}
