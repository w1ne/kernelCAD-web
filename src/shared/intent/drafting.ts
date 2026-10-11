// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** JSON-serializable drafting preferences; no kernel or browser dependency. */
export type DraftingProfileId = 'general' | 'machining' | 'sheet-metal';
export type DimensioningStyle = 'baseline' | 'chain' | 'symmetry';
export type DraftingView = 'front' | 'top' | 'left' | 'iso';
export type DraftingSheet = 'a4' | 'a3' | 'a2' | 'a1' | 'a0' | 'ansi-a' | 'ansi-b' | 'ansi-c' | 'ansi-d' | 'ansi-e' | 'auto' | 'auto-ansi';

export interface DraftingProfile {
  id: string;
  name: string;
  sheet?: DraftingSheet;
  projection?: 'first' | 'third';
  dimensioningStyle?: DimensioningStyle;
  tolerance?: 'ISO2768-f' | 'ISO2768-m' | 'ISO2768-c';
  /** Human review guidance, never a manufacturing acceptance certification. */
  notes?: readonly string[];
}

export interface DrawingAnnotationOverride {
  suppress?: boolean;
  /** Primary label only; attached feature-control frames remain unchanged. */
  text?: string;
  view?: DraftingView;
  /** Extra dimension-line distance / leader-stem length, in sheet mm. */
  offset?: number;
}

export type ResolvedDraftingProfile = DraftingProfile & Required<Pick<DraftingProfile, 'sheet' | 'projection' | 'dimensioningStyle'>>;

export const DRAFTING_PROFILES: Readonly<Record<DraftingProfileId, ResolvedDraftingProfile>> = {
  general: { id: 'general', name: 'General review', sheet: 'a4', projection: 'third', dimensioningStyle: 'baseline', notes: ['Review dimensions and datum selection before release.'] },
  machining: { id: 'machining', name: 'Machining', sheet: 'a3', projection: 'third', dimensioningStyle: 'baseline', notes: ['Baseline locations support datum-based setups; verify all fits and tolerances.'] },
  'sheet-metal': { id: 'sheet-metal', name: 'Sheet metal', sheet: 'a3', projection: 'third', dimensioningStyle: 'chain', notes: ['Review bend and flat-pattern requirements separately from this formed-part sheet.'] },
};
