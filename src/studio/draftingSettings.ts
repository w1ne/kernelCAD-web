// SPDX-License-Identifier: MIT
import { DrawingDecisionResolutionsSchema, DraftingProfileSchema, type DraftingSettings } from '../authoring/draftingSettings';
import type { DraftingProfile, DraftingProfileId, DimensioningStyle, DrawingAnnotationOverride } from '../shared/intent/drafting';
import type { DrawingReviewOptions } from '../shared/intent/drawingReview';
import type { DrawingDatumDecl } from '../shared/intent/drawingGdtRecord';

export type { DraftingSettings };
export interface StudioDrawingOptions extends DrawingReviewOptions {
  date?: string;
  draftingProfile?: DraftingProfileId | DraftingProfile;
  autoAnnotate?: { dimensioningStyle?: DimensioningStyle; datums?: readonly DrawingDatumDecl[] };
  annotationOverrides?: Record<string, DrawingAnnotationOverride>;
}

/** Compare the exact source rather than risking a short hash collision. This
 * is stored once beside code, and also works where Web Crypto is unavailable. */
export function sourceFingerprint(code: string): string { return code; }

/** Decision confirmations belong to this source and these drafting criteria. */
export function draftingCriteriaFingerprint(settings: DraftingSettings): string {
  return JSON.stringify({ draftingProfile: settings.draftingProfile, dimensioningStyle: settings.dimensioningStyle, datums: settings.datums ?? [] });
}

export function effectiveDecisionResolutions(settings: DraftingSettings): DraftingSettings['decisionResolutions'] {
  if (settings.decisionCriteriaFingerprint !== draftingCriteriaFingerprint(settings)) return undefined;
  const parsed = DrawingDecisionResolutionsSchema.safeParse(settings.decisionResolutions);
  return parsed.success ? parsed.data : undefined;
}

export function draftingOptionsForSource(settings: DraftingSettings | undefined, code: string): StudioDrawingOptions {
  if (!settings) return {};
  const matches = settings.sourceFingerprint === sourceFingerprint(code);
  const decisions = matches ? effectiveDecisionResolutions(settings) : undefined;
  return {
    ...(decisions && Object.keys(decisions).length ? { decisionResolutions: decisions } : {}),
    draftingProfile: settings.draftingProfile,
    autoAnnotate: { dimensioningStyle: settings.dimensioningStyle, ...(matches && settings.datums ? { datums: settings.datums } : {}) },
    ...(matches ? { annotationOverrides: settings.annotationOverrides } : {}),
  };
}

const PROFILES_KEY = 'kernelcad.drafting.profiles';
export function loadDraftingProfiles(): DraftingProfile[] {
  try {
    const input: unknown = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '[]');
    if (!Array.isArray(input)) return [];
    return input.flatMap((item) => { const parsed = DraftingProfileSchema.safeParse(item); return parsed.success ? [parsed.data as DraftingProfile] : []; });
  } catch { return []; }
}
export function saveDraftingProfile(profile: DraftingProfile): void {
  const parsed = DraftingProfileSchema.parse(profile) as DraftingProfile;
  localStorage.setItem(PROFILES_KEY, JSON.stringify([...loadDraftingProfiles().filter((p) => p.id !== parsed.id), parsed]));
}
