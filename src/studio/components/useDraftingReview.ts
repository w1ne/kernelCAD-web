// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from 'react';
import { DRAFTING_PROFILES, type DraftingProfile, type DrawingAnnotationOverride } from '../../shared/intent/drafting';
import { DraftingSettingsSchema } from '../../authoring/draftingSettings';
import type { DrawingReportAnnotation } from '../../kernel/backends/occt/drawingAuto/contracts';
import { draftingCriteriaFingerprint, effectiveDecisionResolutions, draftingOptionsForSource, loadDraftingProfiles, placedDimensionId, saveDraftingProfile, sourceFingerprint, type DraftingSettings, type StudioDrawingOptions } from '../draftingSettings';
import type { PlacedLinearDimension } from '../../authoring/draftingSettings';
import { svgSheetsToPdf } from '../../kernel/export/pdf/svgSheetToPdf';
import { downloadBlob, exportErrorText, exportViaServer, isExportAbort, previewDrawingViaServer, type DrawingPreviewResult } from '../exportViaServer';
import { injectEdgeDimensions } from './edgeDimensionSheet';
import { useFunctionalDrawingReview } from './useFunctionalDrawingReview';
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
    ...(sameSource && settings.datums ? { datums: settings.datums } : {}),
    ...(sameSource && settings.placedDimensions?.length ? { placedDimensions: settings.placedDimensions } : {}),
    ...(sameSource && effectiveDecisionResolutions(settings) ? { decisionResolutions: effectiveDecisionResolutions(settings), decisionCriteriaFingerprint: settings.decisionCriteriaFingerprint } : {}) };
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
  const settingsKey = JSON.stringify(settings);
  const [observedSettings, setObservedSettings] = useState(settingsKey);
  if (choices.sourceFingerprint !== sourceFingerprint(code)) setChoices(initialSettings(code, choices));
  else if (observedSettings !== settingsKey) { setObservedSettings(settingsKey); setChoices(initialSettings(code, settings)); }
  const [drawingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const options = useMemo(() => ({ ...draftingOptionsForSource(choices, code), date: drawingDate }), [choices, code, drawingDate]);
  const profile = resolvedProfile(choices);
  const update = (next: DraftingSettings) => {
    const changedCriteria = draftingCriteriaFingerprint(next) !== draftingCriteriaFingerprint(choices);
    const value = changedCriteria ? { ...next, decisionResolutions: undefined, decisionCriteriaFingerprint: undefined } : next;
    setChoices(value); onChange(value);
  };
  const editProfile = (patch: Partial<DraftingProfile>) => update({ ...choices, draftingProfile: { ...profile, ...patch } });
  return { choices, options, profile, update, editProfile };
}

function useDrawingPreview(code: string, options: StudioDrawingOptions, setError: (error: string | null) => void, criteria: string) {
  const [preview, setPreview] = useState<DrawingPreviewResult | null>(null);
  const [previewRevision, setPreviewRevision] = useState<number | null>(null);
  const [requestId, setRequestId] = useState(0);
  const [previewRequestId, setPreviewRequestId] = useState<number | null>(null);
  const [jobRevision, setJobRevision] = useState<number | null>(null);
  const [previewScopeRevision, setPreviewScopeRevision] = useState<number | null>(null);
  const scope = JSON.stringify([code, criteria]);
  // Source/criteria edits invalidate decision prompts even when values revert.
  // Decision-only edits leave this epoch intact so records can be batched.
  const [scopeEpoch, setScopeEpoch] = useState({ key: scope, revision: 0 });
  if (scopeEpoch.key !== scope) setScopeEpoch({ key: scope, revision: scopeEpoch.revision + 1 });
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const currentKey = JSON.stringify({ code, options });
  const [epoch, setEpoch] = useState({ key: currentKey, revision: 0 });
  if (epoch.key !== currentKey) setEpoch({ key: currentKey, revision: epoch.revision + 1 });
  const busy = jobRevision === epoch.revision;
  const current = epoch.key === currentKey && previewRevision === epoch.revision && previewRequestId === requestId;
  const previewUrl = useMemo(() => preview ? URL.createObjectURL(new Blob([preview.svg], { type: 'image/svg+xml' })) : null, [preview]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => { generation.current++; controller.current?.abort(); }, [epoch.revision]);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  const generatePreview = async () => {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const id = ++generation.current; setRequestId(id);
    setJobRevision(epoch.revision); setError(null);
    try {
      const result = await previewDrawingViaServer(code, options, { signal: abort.signal });
      if (id !== generation.current || abort.signal.aborted) return;
      setPreview(result); setPreviewRevision(epoch.revision); setPreviewRequestId(id); setPreviewScopeRevision(scopeEpoch.revision);
    } catch (err) { if (id === generation.current && !isExportAbort(err)) setError(exportErrorText(err).message); }
    finally { if (id === generation.current) setJobRevision(null); }
  };
  return { preview, previewUrl, current, busy, generatePreview, revision: `${epoch.revision}:${requestId}`, matchesCriteria: scopeEpoch.key === scope && previewScopeRevision === scopeEpoch.revision };
}

function useProfileEditor(state: ReturnType<typeof useChoices>, setError: (error: string | null) => void) {
  const { choices, profile, update } = state;
  const [profiles, setProfiles] = useState(loadDraftingProfiles);
  const [profileName, setProfileName] = useState('');
  const [datumSource, setDatumSource] = useState(choices.sourceFingerprint);
  const [datumsText, setDatumsText] = useState(() => JSON.stringify(choices.datums ?? [], null, 2));
  if (datumSource !== choices.sourceFingerprint) { setDatumSource(choices.sourceFingerprint); setDatumsText(JSON.stringify(choices.datums ?? [], null, 2)); }
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
  const drawing = useDrawingPreview(code, choiceState.options, setError, draftingCriteriaFingerprint(choiceState.choices));
  const update = choiceState.update;
  const editProfile = (patch: Partial<DraftingProfile>) => update({ ...choiceState.choices, draftingProfile: { ...choiceState.profile, ...patch } });
  const editable = { ...choiceState, update, editProfile };
  const profiles = useProfileEditor(editable, setError);
  const annotations = useAnnotationReview(editable, drawing.preview);
  const task = useExportTask();
  const binding = JSON.stringify([code, settings]);
  const [acceptedBinding, setAcceptedBinding] = useState<string | null>(null);
  const stale = Boolean(settings && settings.sourceFingerprint !== sourceFingerprint(code) && acceptedBinding !== binding);
  const resetSourceChoices = () => {
    update(choiceState.choices); setAcceptedBinding(binding);
  };
  const functional = useFunctionalDrawingReview({ review: drawing.preview?.drawingReport?.review, current: drawing.current, revision: drawing.revision, matchesCriteria: drawing.matchesCriteria,
    blocked: drawing.busy || task.state.running !== null || stale || annotations.missing.length > 0, choices: choiceState.choices, update });
  const exportReviewedPdf = () => {
    if (!functional.reviewed) return;
    return task.start('Reviewed drawing (PDF)', (transport) => exportViaServer('pdf-drawing', code, { ...transport, drawingOptions: { ...choiceState.options, requireCompleteReview: true } }), downloadBlob);
  };
  const exportPdf = () => {
    const placed = choiceState.choices.placedDimensions ?? [];
    const svg = drawing.preview?.svg;
    if (svg && placed.length > 0) {
      const marked = injectEdgeDimensions(svg, placed);
      const bytes = svgSheetsToPdf([marked], { title: 'Drawing', creator: 'kernelCAD' });
      downloadBlob(new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' }), 'drawing.pdf');
      return;
    }
    return task.start('Drawing (PDF)', (transport) => exportViaServer('pdf-drawing', code, { ...transport, drawingOptions: choiceState.options }), downloadBlob);
  };
  const placeEdge = (edge: Omit<PlacedLinearDimension, 'id'>) => {
    const id = placedDimensionId(edge.view, edge.from, edge.to);
    const placedDimensions = [...(choiceState.choices.placedDimensions ?? []).filter((d) => d.id !== id), { ...edge, id }];
    update({ ...choiceState.choices, placedDimensions });
  };
  const removePlaced = (id: string) => {
    update({ ...choiceState.choices, placedDimensions: (choiceState.choices.placedDimensions ?? []).filter((d) => d.id !== id) });
  };
  return { drawing, profiles, annotations, functional, task, stale, resetSourceChoices, error, exportPdf, exportReviewedPdf,
    placed: choiceState.choices.placedDimensions ?? [], placeEdge, removePlaced };
}

export type DraftingReviewState = ReturnType<typeof useDraftingReview>;
