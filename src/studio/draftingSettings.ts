// SPDX-License-Identifier: MIT
import { DraftingProfileSchema, type DraftingSettings } from '../authoring/draftingSettings';
import type { DraftingProfile, DraftingProfileId, DimensioningStyle, DrawingAnnotationOverride } from '../shared/intent/drafting';
import type { DrawingDatumDecl } from '../shared/intent/drawingGdtRecord';

export type { DraftingSettings };
export interface StudioDrawingOptions {
  date?: string;
  draftingProfile?: DraftingProfileId | DraftingProfile;
  autoAnnotate?: { dimensioningStyle?: DimensioningStyle; datums?: readonly DrawingDatumDecl[] };
  annotationOverrides?: Record<string, DrawingAnnotationOverride>;
}

/** Compare the exact source rather than risking a short hash collision. This
 * is stored once beside code, and also works where Web Crypto is unavailable. */
export function sourceFingerprint(code: string): string { return code; }

export function draftingOptionsForSource(settings: DraftingSettings | undefined, code: string): StudioDrawingOptions {
  if (!settings) return {};
  const matches = settings.sourceFingerprint === sourceFingerprint(code);
  return {
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
