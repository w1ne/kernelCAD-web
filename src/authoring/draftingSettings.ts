// SPDX-License-Identifier: MIT
import { z } from 'zod';
import { drawingDecisionKey, type DrawingDecisionResolution } from '../shared/intent/drawingReview';
import type { DraftingProfile, DraftingProfileId, DimensioningStyle, DrawingAnnotationOverride } from '../shared/intent/drafting';
import type { DrawingDatumDecl } from '../shared/intent/drawingGdtRecord';

export interface DraftingSettings {
  sourceFingerprint: string;
  draftingProfile: DraftingProfileId | DraftingProfile;
  dimensioningStyle: DimensioningStyle;
  annotationOverrides: Record<string, DrawingAnnotationOverride>;
  datums?: DrawingDatumDecl[];
  decisionResolutions?: Record<string, DrawingDecisionResolution>;
  decisionCriteriaFingerprint?: string;
}

export const DraftingProfileSchema = z.object({
  id: z.string().min(1), name: z.string().min(1),
  sheet: z.enum(['a4', 'a3', 'a2', 'a1', 'a0', 'ansi-a', 'ansi-b', 'ansi-c', 'ansi-d', 'ansi-e', 'auto', 'auto-ansi']).optional(),
  projection: z.enum(['first', 'third']).optional(), dimensioningStyle: z.enum(['baseline', 'chain', 'symmetry']).optional(),
  tolerance: z.enum(['ISO2768-f', 'ISO2768-m', 'ISO2768-c']).optional(), notes: z.array(z.string()).optional(),
});
export const DrawingDecisionResolutionsSchema = z.record(z.string().refine((key) => {
  const parts = key.split(':');
  if (parts.length !== 2) return false;
  try {
    const [plan, decision] = parts.map(decodeURIComponent);
    return Boolean(plan.trim() && decision.trim() && drawingDecisionKey(plan, decision) === key);
  } catch { return false; }
}), z.object({ note: z.string().trim().min(1), provenance: z.string().trim().min(1) }).strict());

export const DraftingSettingsSchema = z.object({
  sourceFingerprint: z.string(),
  decisionResolutions: DrawingDecisionResolutionsSchema.optional(),
  decisionCriteriaFingerprint: z.string().min(1).optional(),
  draftingProfile: z.union([z.enum(['general', 'machining', 'sheet-metal']), DraftingProfileSchema]),
  dimensioningStyle: z.enum(['baseline', 'chain', 'symmetry']),
  annotationOverrides: z.record(z.string(), z.object({ suppress: z.boolean().optional(), text: z.string().optional(),
    view: z.enum(['front', 'top', 'left', 'iso']).optional(), offset: z.number().finite().nonnegative().optional() })),
  datums: z.array(z.object({ label: z.string().regex(/^(?![IOQ])[A-Z](?![IOQ])[A-Z]?$/),
    face: z.record(z.string(), z.unknown()) })).optional(),
});
