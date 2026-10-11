// SPDX-License-Identifier: MIT
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { DRAFTING_PROFILES } from '../shared/intent/drafting';
import { draftingOptionsForSource, sourceFingerprint, saveDraftingProfile, loadDraftingProfiles } from './draftingSettings';
import { DraftingSettingsSchema } from '../authoring/draftingSettings';

beforeEach(() => localStorage.clear());
describe('drafting choices', () => {
  it('rejects persisted negative annotation offsets', () => {
    expect(DraftingSettingsSchema.safeParse({ sourceFingerprint: 'model', draftingProfile: 'general', dimensioningStyle: 'baseline', annotationOverrides: { hole: { offset: -1 } } }).success).toBe(false);
  });
  it('preserves the profile while refusing stale annotation and datum overrides', () => {
    const settings = { sourceFingerprint: sourceFingerprint('old'), draftingProfile: 'machining' as const,
      dimensioningStyle: 'chain' as const, annotationOverrides: { hole: { suppress: true } }, datums: [{ label: 'A', face: { byNormal: '-Z' as const } }] };
    expect(draftingOptionsForSource(settings, 'new')).toEqual({ draftingProfile: 'machining', autoAnnotate: { dimensioningStyle: 'chain' } });
    expect(draftingOptionsForSource(settings, 'old')).toEqual({ draftingProfile: 'machining', autoAnnotate: { dimensioningStyle: 'chain', datums: settings.datums }, annotationOverrides: settings.annotationOverrides });
  });
  it('round trips reusable named profiles and tolerates corrupt storage', () => {
    saveDraftingProfile({ ...DRAFTING_PROFILES.machining, id: 'shop', name: 'Our shop' });
    expect(loadDraftingProfiles()).toEqual([{ ...DRAFTING_PROFILES.machining, id: 'shop', name: 'Our shop' }]);
    localStorage.setItem('kernelcad.drafting.profiles', 'broken');
    expect(loadDraftingProfiles()).toEqual([]);
  });
  it('accepts a minimal custom profile and lets the exporter resolve its defaults', () => {
    saveDraftingProfile({ id: 'minimal', name: 'Minimal shop' });
    expect(loadDraftingProfiles()).toEqual([{ id: 'minimal', name: 'Minimal shop' }]);
  });
});
