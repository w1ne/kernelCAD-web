// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../ui/useFocusTrap';
import { DRAFTING_PROFILES, type DraftingProfile, type DimensioningStyle, type DraftingView, type DrawingAnnotationOverride } from '../../shared/intent/drafting';
import { DraftingSettingsSchema } from '../../authoring/draftingSettings';
import { draftingOptionsForSource, loadDraftingProfiles, saveDraftingProfile, sourceFingerprint, type DraftingSettings } from '../draftingSettings';
import { downloadBlob, exportErrorText, exportViaServer, isExportAbort, previewDrawingViaServer, type DrawingPreviewResult } from '../exportViaServer';
import { useExportTask } from '../hooks/useExportTask';
import { ExportStatus } from './Shared/ExportStatus';

const INPUT = 'w-full rounded-control border border-border bg-surface-2 px-2 py-1.5 text-ui text-fg focus-ring';
const BUTTON = 'focus-ring rounded-control border border-border px-3 py-1.5 text-ui text-fg hover:bg-surface-2 disabled:opacity-40';

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

/** Review a server-rendered sheet; overrides always go back through the same
 * exporter as PDF, so this never edits display-only SVG independently. */
export function DraftingReview({ code, settings, onChange, onClose }: DraftingReviewProps) {
  const [choices, setChoices] = useState(() => initialSettings(code, settings));
  const [drawingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [profiles, setProfiles] = useState(loadDraftingProfiles);
  const [profileName, setProfileName] = useState('');
  const [datumsText, setDatumsText] = useState(() => JSON.stringify(choices.datums ?? [], null, 2));
  const [preview, setPreview] = useState<DrawingPreviewResult | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [reviewedKey, setReviewedKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const task = useExportTask();
  useFocusTrap(panel, true, onClose);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);

  const options = useMemo(() => ({ ...draftingOptionsForSource(choices, code), date: drawingDate }), [choices, code, drawingDate]);
  const currentKey = JSON.stringify({ code, options });
  const current = previewKey === currentKey;
  const reviewed = current && reviewedKey === currentKey;
  const selectedProfile = typeof choices.draftingProfile === 'string' ? DRAFTING_PROFILES[choices.draftingProfile] : choices.draftingProfile;
  const profile = { ...DRAFTING_PROFILES.general, ...selectedProfile,
    sheet: selectedProfile.sheet ?? DRAFTING_PROFILES.general.sheet,
    projection: selectedProfile.projection ?? DRAFTING_PROFILES.general.projection,
    dimensioningStyle: selectedProfile.dimensioningStyle ?? DRAFTING_PROFILES.general.dimensioningStyle };
  const annotations = preview?.drawingReport?.annotations ?? [];
  const annotation = annotations.find((a) => a.id === selected);
  const annotationText = annotation ? annotation.primaryText ?? (annotation.source === 'auto' && annotation.kind === 'hole'
    ? (annotation.originalText ?? annotation.text).split(' | ')[0] : annotation.originalText ?? annotation.text) : '';
  const override = selected ? choices.annotationOverrides[selected] ?? {} : {};
  const missing = preview ? Object.keys(choices.annotationOverrides).filter((id) => !annotations.some((a) => a.id === id)) : [];
  const stale = settings && settings.sourceFingerprint !== sourceFingerprint(code);
  const previewUrl = useMemo(() => preview ? URL.createObjectURL(new Blob([preview.svg], { type: 'image/svg+xml' })) : null, [preview]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const update = (next: DraftingSettings) => { setChoices(next); setReviewedKey(null); onChange(next); };
  const editProfile = (patch: Partial<DraftingProfile>) => update({ ...choices, draftingProfile: { ...profile, ...patch } });
  const editAnnotation = (patch: DrawingAnnotationOverride) => {
    if (!selected) return;
    update({ ...choices, annotationOverrides: { ...choices.annotationOverrides, [selected]: { ...override, ...patch } } });
  };
  const generatePreview = async () => {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const id = ++generation.current;
    setBusy(true); setError(null); setReviewedKey(null);
    try {
      const result = await previewDrawingViaServer(code, options, { signal: abort.signal });
      if (id !== generation.current || abort.signal.aborted) return;
      setPreview(result); setPreviewKey(currentKey);
    } catch (err) { if (id === generation.current && !isExportAbort(err)) setError(exportErrorText(err).message); }
    finally { if (id === generation.current) setBusy(false); }
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-5" data-theme="dark">
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="drafting-review-title" tabIndex={-1}
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-panel border border-border bg-surface-1 text-fg shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div><h2 id="drafting-review-title" className="text-ui font-semibold">Drawing review</h2>
            <p className="text-2xs text-fg-3">{reviewed ? 'Reviewed preview' : current ? 'Preview ready for review' : 'Draft — generate a fresh preview'}</p></div>
          <button type="button" className={BUTTON} onClick={onClose} aria-label="Close drawing review"><X size={16} /></button>
        </header>
        <div className="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[1fr_340px]">
          <div className="flex min-h-[260px] flex-col gap-3 bg-surface-2 p-3">
            {stale && <p role="status" className="text-ui text-warn">Source changed. Saved annotation and datum overrides were withheld; review the new drawing.</p>}
            {missing.length > 0 && <p role="status" className="text-ui text-warn">Overrides no longer match: {missing.join(', ')}. Reset those overrides before release.</p>}
            {previewUrl ? <img src={previewUrl} alt="Engineering drawing preview" className="w-full bg-white" />
              : <p className="my-auto text-center text-ui text-fg-3">Generate the sheet to review dimensions and callouts.</p>}
            {preview?.drawingReport && <p className="text-ui text-fg-2">{preview.drawingReport.placed} placed · {preview.drawingReport.overlapped} crowded · {preview.drawingReport.suppressed ?? 0} hidden</p>}
            {preview && !preview.drawingReport && <p className="text-ui text-warn">No annotation report was returned. Generate another preview to review its callouts.</p>}
            {preview?.diagnostics.map((d, i) => <p key={`${d.code}:${i}`} className="text-2xs text-warn">{d.message}</p>)}
          </div>
          <div className="flex flex-col gap-3 border-l border-border p-4 text-ui">
            <label className="flex flex-col gap-1">Drafting profile<select className={INPUT} value={profile.id}
              onChange={(e) => { const next = [...Object.values(DRAFTING_PROFILES), ...profiles].find((p) => p.id === e.target.value); if (next) update({ ...choices, draftingProfile: next, dimensioningStyle: next.dimensioningStyle ?? 'baseline' }); }}>
              {[...Object.values(DRAFTING_PROFILES), ...profiles, ...(![...Object.values(DRAFTING_PROFILES), ...profiles].some((p) => p.id === profile.id) ? [profile] : [])].map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label>
            <label className="flex flex-col gap-1">Dimension style<select className={INPUT} value={choices.dimensioningStyle}
              onChange={(e) => update({ ...choices, dimensioningStyle: e.target.value as DimensioningStyle })}>
              <option value="baseline">Baseline from datums</option><option value="chain">Chain between features</option><option value="symmetry">Symmetry and pitch</option>
            </select></label>
            <details><summary className="cursor-pointer text-fg-2">Profile settings and datums</summary>
              <div className="mt-2 flex flex-col gap-2">
                <label>Sheet<select className={INPUT} value={profile.sheet} onChange={(e) => editProfile({ sheet: e.target.value as DraftingProfile['sheet'] })}>
                  {['a4', 'a3', 'a2', 'a1', 'a0', 'ansi-a', 'ansi-b', 'ansi-c', 'ansi-d', 'ansi-e', 'auto', 'auto-ansi'].map((s) => <option key={s}>{s}</option>)}
                </select></label>
                <label>Projection<select className={INPUT} value={profile.projection} onChange={(e) => editProfile({ projection: e.target.value as DraftingProfile['projection'] })}>
                  <option value="third">Third angle</option><option value="first">First angle</option>
                </select></label>
                <label>General tolerance<select className={INPUT} value={profile.tolerance ?? ''} onChange={(e) => editProfile({ tolerance: e.target.value ? e.target.value as DraftingProfile['tolerance'] : undefined })}>
                  <option value="">Exporter default</option><option>ISO2768-f</option><option>ISO2768-m</option><option>ISO2768-c</option>
                </select></label>
                <label>Profile notes<textarea className={INPUT} value={(profile.notes ?? []).join('\n')} onChange={(e) => editProfile({ notes: e.target.value.split('\n') })} /></label>
                <label>Datum face queries (JSON)<textarea className={`${INPUT} min-h-24 font-mono`} value={datumsText} onChange={(e) => setDatumsText(e.target.value)} /></label>
                <p className="text-2xs text-fg-3">[] uses automatic datums. Pin a datum with {'{"label":"A","face":{"byNormal":"-Z"}}'}.</p>
                <button type="button" className={BUTTON} onClick={applyDatums}>Apply datums</button>
              </div>
            </details>
            <label className="flex flex-col gap-1">Profile name<input className={INPUT} value={profileName} onChange={(e) => setProfileName(e.target.value)} /></label>
            <button type="button" className={BUTTON} onClick={saveProfile}>Save profile</button>
            {profile.notes?.map((note, i) => <p key={i} className="text-2xs text-fg-3">{note}</p>)}
            <div className="border-t border-border pt-3">
              <h3 className="mb-2 font-medium">Annotations</h3>
              <ul className="flex max-h-48 flex-col gap-1 overflow-auto">{annotations.map((a) => <li key={a.id}>
                <button type="button" className={`${BUTTON} w-full text-left ${a.id === selected ? 'bg-surface-3' : ''}`} onClick={() => setSelected(a.id)}>
                  <span className="block">{a.text || a.originalText || a.kind}{a.suppressed ? ' (hidden)' : ''}</span>
                  <span className="text-2xs text-fg-3">{a.view} · {a.source}{a.overlapped ? ' · crowded' : ''}</span>
                </button></li>)}</ul>
              {annotation && <div className="mt-3 flex flex-col gap-2">
                <label><input type="checkbox" checked={override.suppress ?? annotation.suppressed ?? false} onChange={(e) => editAnnotation({ suppress: e.target.checked })} /> Hide annotation</label>
                <label>Annotation text<input className={INPUT} disabled={['datum', 'flatness', 'tolerance', 'fcf'].includes(annotation.kind)} value={override.text ?? annotationText} onChange={(e) => editAnnotation({ text: e.target.value })} /></label>
                <label>Annotation view<select className={INPUT} value={override.view ?? annotation.view} onChange={(e) => editAnnotation({ view: e.target.value as DraftingView })}>
                  {['front', 'top', 'left', 'iso'].map((v) => <option key={v}>{v}</option>)}
                </select></label>
                <label>Extra offset (sheet mm)<input className={INPUT} type="number" min="0" step="1" value={override.offset ?? 0} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0) editAnnotation({ offset: n }); }} /></label>
                <button type="button" className={BUTTON} onClick={() => { const next = { ...choices.annotationOverrides }; delete next[annotation.id]; update({ ...choices, annotationOverrides: next }); }}>Reset annotation</button>
              </div>}
              {missing.length > 0 && <button type="button" className={`${BUTTON} mt-2`} onClick={() => update({ ...choices, annotationOverrides: Object.fromEntries(Object.entries(choices.annotationOverrides).filter(([id]) => !missing.includes(id))) })}>Clear missing overrides</button>}
            </div>
          </div>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          {error && <p role="alert" className="w-full text-ui text-danger">{error}</p>}
          <button type="button" className={BUTTON} disabled={busy} onClick={() => void generatePreview()}>{busy ? 'Generating preview…' : preview ? 'Refresh preview' : 'Generate preview'}</button>
          <button type="button" className={BUTTON} disabled={!current || busy || !preview?.drawingReport || missing.length > 0} onClick={() => setReviewedKey(currentKey)}>Mark reviewed</button>
          <button type="button" className={`${BUTTON} ml-auto`} disabled={!reviewed || busy || task.state.running !== null} onClick={() => void task.start('Drawing (PDF)', (transport) => exportViaServer('pdf-drawing', code, { ...transport, drawingOptions: options }), downloadBlob)}>Export reviewed PDF</button>
          <ExportStatus task={task} testId="drafting-export-status" />
        </footer>
      </div>
    </div>, document.body,
  );
}
