// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from 'react';
import { DRAFTING_PROFILES, type DraftingProfile, type DrawingAnnotationOverride } from '../../shared/intent/drafting';
import { DraftingSettingsSchema } from '../../authoring/draftingSettings';
import type { DrawingReportAnnotation } from '../../kernel/backends/occt/drawingAuto/contracts';
import { draftingOptionsForSource, loadDraftingProfiles, saveDraftingProfile, sourceFingerprint, type DraftingSettings, type StudioDrawingOptions } from '../draftingSettings';
import { downloadBlob, exportErrorText, exportViaServer, isExportAbort, previewDrawingViaServer, type DrawingPreviewResult } from '../exportViaServer';
import { useExportTask } from '../hooks/useExportTask';

export interface DraftingReviewProps {
  code: string;
  settings?: DraftingSettings;
  onChange: (settings: DraftingSettings) => void;
  onClose: () => void;
}

function initialSettings(code: string, settings?: DraftingSettings): DraftingSettings {
  const sameSource = settings?.sourceFingerprint === sourceFingerprint(code);
  return { sourceFingerprint: sourceFingerprint(code), draftingProfile: settings?.draftingProfile ?? 'general',
    dimensioningStyle: settings?.dimensioningStyle ?? 'baseline', annotationOverrides: sameSource ? settings.annotationOverrides : {},
    ...(sameSource && settings.datums ? { datums: settings.datums } : {}) };
}

function resolvedProfile(settings: DraftingSettings) {
  const selected = typeof settings.draftingProfile === 'string' ? DRAFTING_PROFILES[settings.draftingProfile] : settings.draftingProfile;
  return { ...DRAFTING_PROFILES.general, ...selected, sheet: selected.sheet ?? DRAFTING_PROFILES.general.sheet,
    projection: selected.projection ?? DRAFTING_PROFILES.general.projection,
    dimensioningStyle: selected.dimensioningStyle ?? DRAFTING_PROFILES.general.dimensioningStyle };
}

function primaryAnnotationText(annotation?: DrawingReportAnnotation): string {
  if (!annotation) return '';
  if (annotation.primaryText !== undefined) return annotation.primaryText;
  const text = annotation.originalText ?? annotation.text;
  return annotation.source === 'auto' && annotation.kind === 'hole' ? text.split(' | ')[0] : text;
}

function useChoices(code: string, settings: DraftingSettings | undefined, onChange: DraftingReviewProps['onChange']) {
  const [choices, setChoices] = useState(() => initialSettings(code, settings));
  const [drawingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const options = useMemo(() => ({ ...draftingOptionsForSource(choices, code), date: drawingDate }), [choices, code, drawingDate]);
  const profile = resolvedProfile(choices);
  const update = (next: DraftingSettings) => { setChoices(next); onChange(next); };
  const editProfile = (patch: Partial<DraftingProfile>) => update({ ...choices, draftingProfile: { ...profile, ...patch } });
  return { choices, options, profile, update, editProfile };
}

function useDrawingPreview(code: string, options: StudioDrawingOptions, setError: (error: string | null) => void) {
  const [preview, setPreview] = useState<DrawingPreviewResult | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [reviewedKey, setReviewedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const currentKey = JSON.stringify({ code, options });
  const current = previewKey === currentKey;
  const reviewed = current && reviewedKey === currentKey;
  const previewUrl = useMemo(() => preview ? URL.createObjectURL(new Blob([preview.svg], { type: 'image/svg+xml' })) : null, [preview]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  const clearReview = () => setReviewedKey(null);
  const generatePreview = async () => {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const id = ++generation.current;
    setBusy(true); setError(null); clearReview();
    try {
      const result = await previewDrawingViaServer(code, options, { signal: abort.signal });
      if (id !== generation.current || abort.signal.aborted) return;
      setPreview(result); setPreviewKey(currentKey);
    } catch (err) { if (id === generation.current && !isExportAbort(err)) setError(exportErrorText(err).message); }
    finally { if (id === generation.current) setBusy(false); }
  };
  return { preview, previewUrl, current, reviewed, busy, generatePreview, clearReview, markReviewed: () => setReviewedKey(currentKey) };
}

function useProfileEditor(state: ReturnType<typeof useChoices>, setError: (error: string | null) => void) {
  const { choices, profile, update } = state;
  const [profiles, setProfiles] = useState(loadDraftingProfiles);
  const [profileName, setProfileName] = useState('');
  const [datumsText, setDatumsText] = useState(() => JSON.stringify(choices.datums ?? [], null, 2));
  const available = [...Object.values(DRAFTING_PROFILES), ...profiles];
  const profileOptions = available.some((p) => p.id === profile.id) ? available : [...available, profile];
  const selectProfile = (id: string) => {
    const next = available.find((p) => p.id === id);
    if (next) update({ ...choices, draftingProfile: next, dimensioningStyle: next.dimensioningStyle ?? 'baseline' });
  };
  const saveProfile = () => {
    try {
      const name = profileName.trim();
      if (!name) throw new Error('Enter a profile name.');
      const saved = { ...profile, id: `user:${encodeURIComponent(name.toLowerCase())}`, name, dimensioningStyle: choices.dimensioningStyle };
      saveDraftingProfile(saved); setProfiles(loadDraftingProfiles()); update({ ...choices, draftingProfile: saved }); setError(null);
    } catch (err) { setError(exportErrorText(err).message); }
  };
  const applyDatums = () => {
    try {
      const parsed = DraftingSettingsSchema.parse({ ...choices, datums: JSON.parse(datumsText) });
      update(parsed as DraftingSettings); setError(null);
    } catch { setError('Datums must be an array of { label: "A", face: { byNormal: "-Z" } } entries.'); }
  };
  return { ...state, profileOptions, selectProfile, profileName, setProfileName, datumsText, setDatumsText, saveProfile, applyDatums };
}

function useAnnotationReview(state: ReturnType<typeof useChoices>, preview: DrawingPreviewResult | null) {
  const { choices, update } = state;
  const [selected, setSelected] = useState<string | null>(null);
  const annotations = preview?.drawingReport?.annotations ?? [];
  const annotation = annotations.find((a) => a.id === selected);
  const annotationText = primaryAnnotationText(annotation);
  const override = selected ? choices.annotationOverrides[selected] ?? {} : {};
  const missing = preview ? Object.keys(choices.annotationOverrides).filter((id) => !annotations.some((a) => a.id === id)) : [];
  const editAnnotation = (patch: DrawingAnnotationOverride) => {
    if (!selected) return;
    update({ ...choices, annotationOverrides: { ...choices.annotationOverrides, [selected]: { ...override, ...patch } } });
  };
  const resetAnnotation = () => {
    if (!annotation) return;
    const next = { ...choices.annotationOverrides }; delete next[annotation.id];
    update({ ...choices, annotationOverrides: next });
  };
  const clearMissing = () => update({ ...choices, annotationOverrides: Object.fromEntries(Object.entries(choices.annotationOverrides).filter(([id]) => !missing.includes(id))) });
  return { annotations, annotation, annotationText, selected, setSelected, override, missing, editAnnotation, resetAnnotation, clearMissing };
}

export function useDraftingReview({ code, settings, onChange }: DraftingReviewProps) {
  const [error, setError] = useState<string | null>(null);
  const choiceState = useChoices(code, settings, onChange);
  const drawing = useDrawingPreview(code, choiceState.options, setError);
  const update = (next: DraftingSettings) => { drawing.clearReview(); choiceState.update(next); };
  const editProfile = (patch: Partial<DraftingProfile>) => update({ ...choiceState.choices, draftingProfile: { ...choiceState.profile, ...patch } });
  const editable = { ...choiceState, update, editProfile };
  const profiles = useProfileEditor(editable, setError);
  const annotations = useAnnotationReview(editable, drawing.preview);
  const task = useExportTask();
  const stale = Boolean(settings && settings.sourceFingerprint !== sourceFingerprint(code));
  const exportPdf = () => task.start('Drawing (PDF)', (transport) => exportViaServer('pdf-drawing', code, { ...transport, drawingOptions: choiceState.options }), downloadBlob);
  return { drawing, profiles, annotations, task, stale, error, exportPdf };
}

export type DraftingReviewState = ReturnType<typeof useDraftingReview>;
