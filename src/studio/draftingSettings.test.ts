// SPDX-License-Identifier: MIT
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { DRAFTING_PROFILES } from '../shared/intent/drafting';
import { draftingOptionsForSource, sourceFingerprint, saveDraftingProfile, loadDraftingProfiles } from './draftingSettings';
import { projectService } from '../authoring/projectService';
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

describe('source-bound decision choices', () => {
  const base = { sourceFingerprint: 'model', draftingProfile: 'general' as const, dimensioningStyle: 'baseline' as const, annotationOverrides: {} };
  const resolutions = { 'mount:fit': { note: 'Clearance fit', provenance: 'Drawing revision A' } };
  it('persists decision records outside reusable profiles and transports only source/criteria matches', async () => {
    const settings = { ...base, decisionResolutions: resolutions, decisionCriteriaFingerprint: JSON.stringify({ draftingProfile: 'general', dimensioningStyle: 'baseline', datums: [] }) };
    expect(DraftingSettingsSchema.parse(settings)).toEqual(settings);
    expect(draftingOptionsForSource(settings, 'model').decisionResolutions).toEqual(resolutions);
    expect(draftingOptionsForSource(settings, 'new')).not.toHaveProperty('decisionResolutions');
    expect(draftingOptionsForSource({ ...settings, dimensioningStyle: 'chain' }, 'model')).not.toHaveProperty('decisionResolutions');
    saveDraftingProfile({ id: 'shop', name: 'Shop', decisionResolutions: resolutions } as any);
    expect(loadDraftingProfiles()[0]).not.toHaveProperty('decisionResolutions');
  });
  it.each([{ note: '', provenance: 'CAD' }, { note: 'Fit', provenance: '  ' }, { note: 'Fit', provenance: 'CAD', tolerance: 0.1 }])('rejects malformed persisted decision %j', async (resolution) => {
    expect(DraftingSettingsSchema.safeParse({ ...base, decisionResolutions: { 'mount:fit': resolution }, decisionCriteriaFingerprint: JSON.stringify({ draftingProfile: 'general', dimensioningStyle: 'baseline', datums: [] }) }).success).toBe(false);
  });
  it.each(['', 'mount:', ':fit', 'mount:fit:other', '%GG:fit'])('rejects invalid persisted decision key %j', async (key) => {
    expect(DraftingSettingsSchema.safeParse({ ...base, decisionResolutions: { [key]: resolutions['mount:fit'] }, decisionCriteriaFingerprint: JSON.stringify({ draftingProfile: 'general', dimensioningStyle: 'baseline', datums: [] }) }).success).toBe(false);
  });
  it('retains exact-source decision records through project local-storage save and reload', () => {
    const drafting = { ...base, decisionResolutions: resolutions, decisionCriteriaFingerprint: JSON.stringify({ draftingProfile: 'general', dimensioningStyle: 'baseline', datums: [] }) };
    const project = projectService.createProject('model', { viewMode: 'code', viewMode3D: 'shadedWithEdges', sidePanelVisible: true, showSketches: true });
    projectService.saveProject('decision-review', { ...project, drafting });
    const restored = projectService.getProject('decision-review')?.drafting;
    expect(restored).toEqual(drafting);
    expect(draftingOptionsForSource(restored, 'model').decisionResolutions).toEqual(resolutions);
  });

});
