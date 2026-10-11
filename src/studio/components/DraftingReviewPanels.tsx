// SPDX-License-Identifier: MIT
import type { DraftingProfile, DimensioningStyle, DraftingView } from '../../shared/intent/drafting';
import type { DraftingReviewState } from './useDraftingReview';
import { BUTTON, INPUT } from './draftingReviewStyles';

export function DrawingPreviewPane({ state }: { state: DraftingReviewState }) {
  const { stale, drawing: { preview, previewUrl }, annotations: { missing } } = state;
  return <div className="flex min-h-[260px] flex-col gap-3 bg-surface-2 p-3">
    {stale && <p role="status" className="text-ui text-warn">Source changed. Saved annotation and datum overrides were withheld; review the new drawing.</p>}
    {missing.length > 0 && <p role="status" className="text-ui text-warn">Overrides no longer match: {missing.join(', ')}. Reset those overrides before release.</p>}
    {previewUrl ? <img src={previewUrl} alt="Engineering drawing preview" className="w-full bg-white" />
      : <p className="my-auto text-center text-ui text-fg-3">Generate the sheet to review dimensions and callouts.</p>}
    {preview?.drawingReport && <p className="text-ui text-fg-2">{preview.drawingReport.placed} placed · {preview.drawingReport.overlapped} crowded · {preview.drawingReport.suppressed ?? 0} hidden</p>}
    {preview && !preview.drawingReport && <p className="text-ui text-warn">No annotation report was returned. Generate another preview to review its callouts.</p>}
    {preview?.diagnostics.map((d, i) => <p key={`${d.code}:${i}`} className="text-2xs text-warn">{d.message}</p>)}
  </div>;
}

function ProfileDetails({ state }: { state: DraftingReviewState['profiles'] }) {
  const { profile, editProfile, datumsText, setDatumsText, applyDatums } = state;
  return <details><summary className="cursor-pointer text-fg-2">Profile settings and datums</summary>
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
  </details>;
}

export function ProfileControls({ state }: { state: DraftingReviewState['profiles'] }) {
  const { profile, choices, update, profileOptions, selectProfile, profileName, setProfileName, saveProfile } = state;
  return <>
    <label className="flex flex-col gap-1">Drafting profile<select className={INPUT} value={profile.id} onChange={(e) => selectProfile(e.target.value)}>
      {profileOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select></label>
    <label className="flex flex-col gap-1">Dimension style<select className={INPUT} value={choices.dimensioningStyle}
      onChange={(e) => update({ ...choices, dimensioningStyle: e.target.value as DimensioningStyle })}>
      <option value="baseline">Baseline from datums</option><option value="chain">Chain between features</option><option value="symmetry">Symmetry and pitch</option>
    </select></label>
    <ProfileDetails state={state} />
    <label className="flex flex-col gap-1">Profile name<input className={INPUT} value={profileName} onChange={(e) => setProfileName(e.target.value)} /></label>
    <button type="button" className={BUTTON} onClick={saveProfile}>Save profile</button>
    {profile.notes?.map((note, i) => <p key={i} className="text-2xs text-fg-3">{note}</p>)}
  </>;
}

function AnnotationList({ state }: { state: DraftingReviewState['annotations'] }) {
  const { annotations, selected, setSelected } = state;
  return <ul className="flex max-h-48 flex-col gap-1 overflow-auto">{annotations.map((a) => <li key={a.id}>
    <button type="button" className={`${BUTTON} w-full text-left ${a.id === selected ? 'bg-surface-3' : ''}`} onClick={() => setSelected(a.id)}>
      <span className="block">{a.text || a.originalText || a.kind}{a.suppressed ? ' (hidden)' : ''}</span>
      <span className="text-2xs text-fg-3">{a.view} · {a.source}{a.overlapped ? ' · crowded' : ''}</span>
    </button></li>)}</ul>;
}

function AnnotationEditor({ state }: { state: DraftingReviewState['annotations'] }) {
  const { annotation, override, annotationText, editAnnotation, resetAnnotation } = state;
  if (!annotation) return null;
  return <div className="mt-3 flex flex-col gap-2">
    <label><input type="checkbox" checked={override.suppress ?? annotation.suppressed ?? false} onChange={(e) => editAnnotation({ suppress: e.target.checked })} /> Hide annotation</label>
    <label>Annotation text<input className={INPUT} disabled={['datum', 'flatness', 'tolerance', 'fcf'].includes(annotation.kind)} value={override.text ?? annotationText} onChange={(e) => editAnnotation({ text: e.target.value })} /></label>
    <label>Annotation view<select className={INPUT} value={override.view ?? annotation.view} onChange={(e) => editAnnotation({ view: e.target.value as DraftingView })}>
      {['front', 'top', 'left', 'iso'].map((v) => <option key={v}>{v}</option>)}
    </select></label>
    <label>Extra offset (sheet mm)<input className={INPUT} type="number" min="0" step="1" value={override.offset ?? 0} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0) editAnnotation({ offset: n }); }} /></label>
    <button type="button" className={BUTTON} onClick={resetAnnotation}>Reset annotation</button>
  </div>;
}

export function AnnotationControls({ state }: { state: DraftingReviewState['annotations'] }) {
  return <div className="border-t border-border pt-3">
    <h3 className="mb-2 font-medium">Annotations</h3>
    <AnnotationList state={state} />
    <AnnotationEditor state={state} />
    {state.missing.length > 0 && <button type="button" className={`${BUTTON} mt-2`} onClick={state.clearMissing}>Clear missing overrides</button>}
  </div>;
}
