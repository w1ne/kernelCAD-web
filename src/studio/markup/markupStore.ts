// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import {
  MARKUP_SNAPSHOT_VERSION,
  markupMeasurementSchema,
  markupNoteSchema,
  parseMarkupSnapshot,
  replayMarkupSnapshot,
  topologyRefSchema,
  type MarkupCamera,
  type MarkupMeasurement,
  type MarkupNote,
  type MarkupSnapshot,
  type TopologyRef,
} from './markupSnapshot';

export type MarkupMode = 'off' | 'note';

export interface MarkupState {
  readonly mode: MarkupMode;
  readonly panelOpen: boolean;
  readonly draftText: string;
  readonly notes: readonly MarkupNote[];
  readonly measurements: readonly MarkupMeasurement[];
  readonly topologyRefs: readonly TopologyRef[];
  readonly lastSnapshot: MarkupSnapshot | null;
}

type Listener = () => void;

export const DEFAULT_MARKUP_CAMERA: MarkupCamera = {
  position: [40, 40, 40],
  target: [0, 0, 0],
  up: [0, 0, 1],
  projection: 'perspective',
  fov: 40,
  zoom: 1,
};

function uniqueRefs(refs: readonly TopologyRef[]): TopologyRef[] {
  const seen = new Set<string>();
  return refs.flatMap((ref) => {
    const parsed = topologyRefSchema.parse(ref);
    const key = `${parsed.shapeIndex}:${parsed.kind}:${parsed.id}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [parsed];
  });
}

export class StudioMarkupStore {
  private state: MarkupState = {
    mode: 'off',
    panelOpen: false,
    draftText: '',
    notes: [],
    measurements: [],
    topologyRefs: [],
    lastSnapshot: null,
  };
  private camera = DEFAULT_MARKUP_CAMERA;
  private pendingCameraRestore: MarkupCamera | null = null;
  private readonly listeners = new Set<Listener>();

  getSnapshot = (): MarkupState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  setMode(mode: MarkupMode): void {
    if (this.state.mode === mode) return;
    this.state = { ...this.state, mode };
    this.emit();
  }

  openPanel(): void {
    this.state = { ...this.state, panelOpen: true, mode: 'note' };
    this.emit();
  }

  closePanel(): void {
    this.state = { ...this.state, panelOpen: false, mode: 'off' };
    this.emit();
  }

  togglePanel(): void {
    if (this.state.panelOpen) this.closePanel();
    else this.openPanel();
  }

  setDraftText(draftText: string): void {
    if (this.state.draftText === draftText) return;
    this.state = { ...this.state, draftText };
    this.emit();
  }

  setCamera(camera: MarkupCamera): void {
    // The live camera bridge updates this on animation frames. Full validation
    // happens at snapshot capture/load boundaries, not on every frame.
    this.camera = camera;
  }

  setSelection(topologyRefs: readonly TopologyRef[]): void {
    const refs = uniqueRefs(topologyRefs);
    if (JSON.stringify(refs) === JSON.stringify(this.state.topologyRefs)) return;
    this.state = { ...this.state, topologyRefs: refs };
    this.emit();
  }

  addNote(note: MarkupNote): void {
    const parsed = markupNoteSchema.parse(note);
    this.state = { ...this.state, notes: [...this.state.notes, parsed] };
    this.emit();
  }

  updateNote(id: string, text: string): void {
    const index = this.state.notes.findIndex((note) => note.id === id);
    if (index < 0 || !text.trim()) return;
    const parsed = markupNoteSchema.safeParse({ ...this.state.notes[index], text });
    if (!parsed.success) return;
    const next = parsed.data;
    this.state = { ...this.state, notes: this.state.notes.map((note, i) => i === index ? next : note) };
    this.emit();
  }

  removeNote(id: string): void {
    const notes = this.state.notes.filter((note) => note.id !== id);
    if (notes.length === this.state.notes.length) return;
    this.state = { ...this.state, notes };
    this.emit();
  }

  addMeasurement(measurement: MarkupMeasurement): void {
    const parsed = markupMeasurementSchema.parse(measurement);
    this.state = { ...this.state, measurements: [...this.state.measurements, parsed] };
    this.emit();
  }

  removeMeasurement(id: string): void {
    const measurements = this.state.measurements.filter((measurement) => measurement.id !== id);
    if (measurements.length === this.state.measurements.length) return;
    this.state = { ...this.state, measurements };
    this.emit();
  }

  clear(): void {
    this.pendingCameraRestore = null;
    this.state = { ...this.state, mode: 'off', draftText: '', notes: [], measurements: [], topologyRefs: [], lastSnapshot: null };
    this.emit();
  }

  captureSnapshot(): MarkupSnapshot {
    const snapshot = replayMarkupSnapshot({
      schemaVersion: MARKUP_SNAPSHOT_VERSION,
      camera: this.camera,
      selection: { topologyRefs: [...this.state.topologyRefs] },
      measurements: [...this.state.measurements],
      notes: [...this.state.notes],
    });
    this.state = { ...this.state, lastSnapshot: snapshot };
    this.emit();
    return snapshot;
  }

  loadSnapshot(raw: string | unknown): MarkupSnapshot {
    const snapshot = replayMarkupSnapshot(parseMarkupSnapshot(raw));
    this.camera = snapshot.camera;
    this.pendingCameraRestore = snapshot.camera;
    this.state = {
      ...this.state,
      mode: 'off',
      panelOpen: true,
      draftText: '',
      notes: snapshot.notes,
      measurements: snapshot.measurements,
      topologyRefs: snapshot.selection.topologyRefs,
      lastSnapshot: snapshot,
    };
    this.emit();
    return snapshot;
  }

  consumeCameraRestore(): MarkupCamera | null {
    const camera = this.pendingCameraRestore;
    this.pendingCameraRestore = null;
    return camera;
  }
}

export const markupStore = new StudioMarkupStore();
