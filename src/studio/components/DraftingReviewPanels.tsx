// SPDX-License-Identifier: MIT
import { useEffect, useState, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import type { DraftingProfile, DimensioningStyle, DraftingView } from '../../shared/intent/drafting';
import type { DraftingReviewState } from './useDraftingReview';
import { DrawingSheetViewport, type DrawingSheetHandle } from './DrawingSheetViewport';
import { BUTTON, INPUT } from './draftingReviewStyles';

/** Ticking seconds since `startedAt`, or null when not running. The clock
 *  only advances from the interval callback, so render stays pure; a fresh
 *  run clamps to 0 until its first tick. */
function useElapsedSeconds(startedAt: number | null | undefined): number | null {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (startedAt == null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return startedAt == null ? null : Math.max(0, Math.round((now - startedAt) / 1000));
}

/** One-line live status for the pane: phase + elapsed. */
function generationStatusText(progress: DraftingReviewState['drawing']['progress'], verb: string): string {
  if (progress?.phase === 'waiting' && progress.retryInSec !== undefined) {
    return `Server is busy — retrying in ${progress.retryInSec} s…`;
  }
  return verb;
}

/** Sheet notices above the viewport: stale source, unmatched overrides,
 *  the placement report, and exporter diagnostics. */
function PreviewNotices({ state }: { state: DraftingReviewState }) {
  const { stale, resetSourceChoices, drawing: { preview }, annotations } = state;
  const { missing } = annotations;
  if (!stale && missing.length === 0 && !preview) return null;
  return <div className="flex shrink-0 flex-col gap-2 bg-surface-2/95 p-3">
    {stale && <div className="flex flex-col gap-2"><p role="status" className="text-ui text-warn">Source changed. Saved annotation, datum and decision overrides were withheld; review the new drawing.</p>
      <button type="button" className={`${BUTTON} self-start`} onClick={resetSourceChoices}>Reset source-bound choices</button></div>}
    {missing.length > 0 && <p role="status" className="text-ui text-warn">Overrides no longer match: {missing.join(', ')}. Reset those overrides before release.</p>}
    {preview?.drawingReport && <p className="text-ui text-fg-2">{preview.drawingReport.placed} placed · {preview.drawingReport.overlapped} crowded · {preview.drawingReport.suppressed ?? 0} hidden</p>}
    {preview && !preview.drawingReport && <p className="text-ui text-warn">No annotation report was returned. Generate another preview to review its callouts.</p>}
    {preview?.diagnostics.map((d, i) => <p key={`${d.code}:${i}`} className="text-2xs text-warn">{d.message}</p>)}
  </div>;
}

/** Floating 'Refreshing…' pill over an existing sheet. */
function PreviewBusyPill({ progress, elapsedSuffix }: { progress: DraftingReviewState['drawing']['progress']; elapsedSuffix: string }) {
  return <div role="status" className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-panel border border-border bg-surface-1/95 px-3 py-1.5 text-2xs text-fg-2 shadow-lg">
    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
    <span>{generationStatusText(progress, 'Refreshing the sheet…')}{elapsedSuffix}</span>
  </div>;
}

/** The empty pane: live generation status while a run is in flight, the
 *  generate hint otherwise. */
function EmptyPreviewState({ busy, progress, elapsedSuffix }: { busy: boolean; progress: DraftingReviewState['drawing']['progress']; elapsedSuffix: string }) {
  if (!busy) return <p className="m-auto text-center text-ui text-fg-3">Generate the sheet to review dimensions and callouts.</p>;
  return <div role="status" className="m-auto flex max-w-sm flex-col items-center gap-3 px-6 text-center">
    <Loader2 className="h-6 w-6 animate-spin text-fg-3" aria-hidden="true" />
    <p className="text-ui text-fg-2">{generationStatusText(progress, 'Generating the sheet…')}{elapsedSuffix}</p>
    <p className="text-2xs text-fg-3">The first render of a large assembly can take a while. The result is cached — later opens and unchanged refreshes come back instantly.</p>
  </div>;
}

export function DrawingPreviewPane({ state, sheetRef }: { state: DraftingReviewState; sheetRef: RefObject<DrawingSheetHandle | null> }) {
  const { drawing: { preview, busy, progress }, annotations } = state;
  const elapsed = useElapsedSeconds(busy ? progress?.startedAt : null);
  const elapsedSuffix = elapsed !== null && elapsed > 2 ? ` · ${elapsed} s` : '';
  return <div className="relative flex h-full min-h-[320px] min-w-0 flex-col bg-guide-grey">
    <PreviewNotices state={state} />
    {preview?.svg
      ? <div className="relative min-h-0 flex-1">
          <DrawingSheetViewport ref={sheetRef} svg={preview.svg} selectedId={annotations.selected} onSelect={annotations.setSelected} onPlaceEdge={state.placeEdge} placed={state.placed} />
          {busy && <PreviewBusyPill progress={progress} elapsedSuffix={elapsedSuffix} />}
          {annotations.annotation && <aside aria-label="Annotation" className="absolute right-3 top-3 z-10 max-h-[calc(100%-4.5rem)] w-72 overflow-auto rounded-panel border border-border bg-surface-1 p-3 text-fg shadow-2xl">
            <h3 className="font-medium">{annotations.annotation.kind} · {annotations.annotation.view}</h3>
            <p className="mb-2 text-2xs text-fg-3">Edits apply to the PDF now. Refresh the sheet to see the new placement.</p>
            <AnnotationEditor state={annotations} />
          </aside>}
        </div>
      : <EmptyPreviewState busy={busy} progress={progress} elapsedSuffix={elapsedSuffix} />}
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

function AnnotationList({ state, onShow }: { state: DraftingReviewState['annotations']; onShow?: (id: string) => void }) {
  const { annotations, selected, setSelected } = state;
  return <ul className="flex max-h-72 flex-col gap-1 overflow-auto">{annotations.map((a) => <li key={a.id}>
    <button type="button" className={`${BUTTON} w-full text-left ${a.id === selected ? 'bg-surface-3' : ''}`} onClick={() => { setSelected(a.id); onShow?.(a.id); }}>
      <span className="block">{a.text || a.originalText || a.kind}{a.suppressed ? ' (hidden)' : ''}</span>
      <span className="text-2xs text-fg-3">{a.view} · {a.source}{a.overlapped ? ' · crowded' : ''}</span>
    </button></li>)}</ul>;
}

function AnnotationEditor({ state }: { state: DraftingReviewState['annotations'] }) {
  const { annotation, override, annotationText, editAnnotation, resetAnnotation } = state;
  if (!annotation) return null;
  return <div className="flex flex-col gap-2">
    <label><input type="checkbox" checked={override.suppress ?? annotation.suppressed ?? false} onChange={(e) => editAnnotation({ suppress: e.target.checked })} /> Hide annotation</label>
    <label>Annotation text<input className={INPUT} disabled={['datum', 'flatness', 'tolerance', 'fcf'].includes(annotation.kind)} value={override.text ?? annotationText} onChange={(e) => editAnnotation({ text: e.target.value })} /></label>
    <label>Annotation view<select className={INPUT} value={override.view ?? annotation.view} onChange={(e) => editAnnotation({ view: e.target.value as DraftingView })}>
      {['front', 'top', 'left', 'iso'].map((v) => <option key={v}>{v}</option>)}
    </select></label>
    <label>Extra offset (sheet mm)<input className={INPUT} type="number" min="0" step="1" value={override.offset ?? 0} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0) editAnnotation({ offset: n }); }} /></label>
    <button type="button" className={BUTTON} onClick={resetAnnotation}>Reset annotation</button>
  </div>;
}

export function AnnotationControls({ state, placed, onRemovePlaced, onShow }: {
  state: DraftingReviewState['annotations'];
  placed: DraftingReviewState['placed'];
  onRemovePlaced: (id: string) => void;
  onShow?: (id: string) => void;
}) {
  return <div className="border-t border-border pt-3">
    <h3 className="mb-2 font-medium">Annotations</h3>
    <p className="mb-2 text-2xs text-fg-3">Dimension, then click a straight edge in the front, top, or left view. The size is drawn on that edge and included in the PDF.</p>
    <AnnotationList state={state} onShow={onShow} />
    {placed.length > 0 && <ul className="mt-2 flex flex-col gap-1">
      {placed.map((dimension) => <li key={dimension.id}>
        <button type="button" className={`${BUTTON} w-full text-left`} onClick={() => onRemovePlaced(dimension.id)}>
          {dimension.view} edge · remove
        </button>
      </li>)}
    </ul>}
    {state.missing.length > 0 && <button type="button" className={`${BUTTON} mt-2`} onClick={state.clearMissing}>Clear missing overrides</button>}
  </div>;
}
