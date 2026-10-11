// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { KernelError } from '../../../shared/intent/kernelError';
import { DRAFTING_PROFILES } from '../../../shared/intent/drafting';
import type { DraftingProfile, DraftingProfileId, DrawingAnnotationOverride, ResolvedDraftingProfile } from '../../../shared/intent/drafting';
import type { AutoAnnotateOptions } from './drawingAuto/options';
import type { DrawingAnnotation } from './drawingAnnotations';

export function invalidReview(message: string): never {
  throw new KernelError('feature.invalid-args', `Drawing review: ${message}.`, undefined,
    'Use a valid drafting profile and annotationOverrides keyed by IDs from the current drawing report.');
}

export interface DraftingOptions {
  draftingProfile?: DraftingProfileId | DraftingProfile;
  annotationOverrides?: Readonly<Record<string, DrawingAnnotationOverride>>;
  sheet?: string;
  projection?: 'first' | 'third';
  autoAnnotate?: boolean | AutoAnnotateOptions;
}

export function resolveDraftingProfile(raw: DraftingOptions['draftingProfile']): ResolvedDraftingProfile | undefined {
  if (raw === undefined) return undefined;
  const p = typeof raw === 'string' ? DRAFTING_PROFILES[raw] : raw;
  if (!p || typeof p !== 'object' || Array.isArray(p)) invalidReview('draftingProfile must be general | machining | sheet-metal or a profile object');
  if (typeof p.id !== 'string' || !p.id.trim() || typeof p.name !== 'string' || !p.name.trim()) invalidReview('draftingProfile requires nonempty id and name');
  const sheet = p.sheet ?? DRAFTING_PROFILES.general.sheet;
  const projection = p.projection ?? DRAFTING_PROFILES.general.projection;
  const dimensioningStyle = p.dimensioningStyle ?? DRAFTING_PROFILES.general.dimensioningStyle;
  if (!['a4', 'a3', 'a2', 'a1', 'a0', 'ansi-a', 'ansi-b', 'ansi-c', 'ansi-d', 'ansi-e', 'auto', 'auto-ansi'].includes(sheet)) invalidReview('draftingProfile.sheet is invalid');
  if (!['first', 'third'].includes(projection)) invalidReview('draftingProfile.projection must be first | third');
  if (!['baseline', 'chain', 'symmetry'].includes(dimensioningStyle)) invalidReview('draftingProfile.dimensioningStyle must be baseline | chain | symmetry');
  if (p.tolerance !== undefined && !['ISO2768-f', 'ISO2768-m', 'ISO2768-c'].includes(p.tolerance)) invalidReview('draftingProfile.tolerance is invalid');
  if (p.notes !== undefined && (!Array.isArray(p.notes) || p.notes.some(n => typeof n !== 'string'))) invalidReview('draftingProfile.notes must be strings');
  return { ...p, sheet, projection, dimensioningStyle };
}

export function validateAnnotationOverrides(raw: DraftingOptions['annotationOverrides']): void {
  if (raw === undefined) return;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) invalidReview('annotationOverrides must be an object keyed by annotation ID');
  for (const [id, o] of Object.entries(raw)) {
    if (!id.trim() || typeof o !== 'object' || o === null || Array.isArray(o)) invalidReview(`annotationOverrides[${id}] must be an object`);
    if (o.suppress !== undefined && typeof o.suppress !== 'boolean') invalidReview(`annotationOverrides[${id}].suppress must be boolean`);
    if (o.text !== undefined && typeof o.text !== 'string') invalidReview(`annotationOverrides[${id}].text must be a string`);
    if (o.view !== undefined && !['front', 'top', 'left', 'iso'].includes(o.view)) invalidReview(`annotationOverrides[${id}].view must be front | top | left | iso`);
    if (o.offset !== undefined && (typeof o.offset !== 'number' || !Number.isFinite(o.offset) || o.offset < 0)) invalidReview(`annotationOverrides[${id}].offset must be finite and nonnegative sheet mm`);
  }
}

/** Resolve profile defaults once; explicit export options take precedence. */
export function applyDraftingProfile<T extends DraftingOptions>(options: T): T {
  validateAnnotationOverrides(options.annotationOverrides);
  const profile = resolveDraftingProfile(options.draftingProfile);
  if (!profile) return options;
  const auto: AutoAnnotateOptions = {
    dimensioningStyle: profile.dimensioningStyle,
    ...(profile.tolerance !== undefined ? { tolerance: profile.tolerance } : {}),
    ...(typeof options.autoAnnotate === 'object' ? options.autoAnnotate : {}),
  };
  return { ...options, sheet: options.sheet ?? profile.sheet, projection: options.projection ?? profile.projection,
    autoAnnotate: options.autoAnnotate === false ? false : auto };
}

/** Canonical JSON signature excludes presentation so label/view edits retain identity. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

export function annotationId(kind: string, key: unknown): string {
  return `auto:${kind}:${encodeURIComponent(typeof key === 'string' ? key : canonical(key))}`;
}

export function authoredAnnotationIds(annotations: readonly DrawingAnnotation[]): string[] {
  const counts = new Map<string, number>();
  return annotations.map(a => {
    if (a.id !== undefined) {
      if (typeof a.id !== 'string' || !a.id.trim()) invalidReview('authored annotation.id must be a nonempty string');
      const id = `authored:${a.id}`;
      if (counts.has(id)) invalidReview(`duplicate authored annotation.id ${a.id}`);
      counts.set(id, 1);
      return id;
    }
    const geometry = Object.fromEntries(Object.entries(a).filter(([key]) => !['view', 'text', 'prefix', 'offset', 'id'].includes(key)));
    const base = `authored:${encodeURIComponent(canonical(geometry))}`;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count ? `${base}:${count}` : base;
  });
}
