// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import {
  MARKUP_NOTE_MAX_LENGTH,
  MARKUP_SNAPSHOT_MAX_MEASUREMENTS,
  MARKUP_SNAPSHOT_MAX_NOTES,
  MARKUP_SNAPSHOT_MAX_TOPOLOGY_REFS,
} from './markupLimits';
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
  readonly error: string | null;
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
    error: null,
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

  private showError(error: string): void {
    if (this.state.error === error) return;
    this.state = { ...this.state, error };
    this.emit();
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
    if (refs.length > MARKUP_SNAPSHOT_MAX_TOPOLOGY_REFS) {
      this.showError(`Up to ${MARKUP_SNAPSHOT_MAX_TOPOLOGY_REFS} faces or edges can be picked. Clear some picked topology before adding another.`);
      return;
    }
    if (JSON.stringify(refs) === JSON.stringify(this.state.topologyRefs)) return;
    this.state = { ...this.state, topologyRefs: refs };
    this.emit();
  }

  addNote(note: MarkupNote): boolean {
    const parsed = markupNoteSchema.parse(note);
    if (this.state.notes.some((existing) => existing.id === parsed.id)) {
      this.showError(`A note ID "${parsed.id}" already exists. Remove the existing note before adding another.`);
      return false;
    }
    if (this.state.notes.length >= MARKUP_SNAPSHOT_MAX_NOTES) {
      this.showError(`Up to ${MARKUP_SNAPSHOT_MAX_NOTES} notes are supported. Remove a note before adding another.`);
      return false;
    }
    this.state = { ...this.state, notes: [...this.state.notes, parsed], error: null };
    this.emit();
    return true;
  }

  updateNote(id: string, text: string): void {
    const index = this.state.notes.findIndex((note) => note.id === id);
    if (index < 0 || text.length > MARKUP_NOTE_MAX_LENGTH) return;
    const next = { ...this.state.notes[index]!, text };
    this.state = { ...this.state, notes: this.state.notes.map((note, i) => i === index ? next : note), error: null };
    this.emit();
  }

  commitNote(id: string): void {
    const index = this.state.notes.findIndex((note) => note.id === id);
    if (index < 0) return;
    const note = this.state.notes[index]!;
    const text = note.text.trim();
    if (!text) {
      this.removeNote(id);
      return;
    }
    const parsed = markupNoteSchema.safeParse({ ...note, text });
    if (!parsed.success) return;
    this.state = {
      ...this.state,
      notes: this.state.notes.map((item, i) => i === index ? parsed.data : item),
      error: null,
    };
    this.emit();
  }

  removeNote(id: string): void {
    const notes = this.state.notes.filter((note) => note.id !== id);
    if (notes.length === this.state.notes.length) return;
    this.state = { ...this.state, notes, error: null };
    this.emit();
  }

  addMeasurement(measurement: MarkupMeasurement): boolean {
    const parsed = markupMeasurementSchema.parse(measurement);
    if (this.state.measurements.some((existing) => existing.id === parsed.id)) {
      this.showError(`A measurement ID "${parsed.id}" already exists. Remove the existing measurement before adding another.`);
      return false;
    }
    if (this.state.measurements.length >= MARKUP_SNAPSHOT_MAX_MEASUREMENTS) {
      this.showError(`Up to ${MARKUP_SNAPSHOT_MAX_MEASUREMENTS} measurements are supported. Remove a measurement before adding another.`);
      return false;
    }
    this.state = { ...this.state, measurements: [...this.state.measurements, parsed], error: null };
    this.emit();
    return true;
  }

  removeMeasurement(id: string): void {
    const measurements = this.state.measurements.filter((measurement) => measurement.id !== id);
    if (measurements.length === this.state.measurements.length) return;
    this.state = { ...this.state, measurements, error: null };
    this.emit();
  }

  clear(): void {
    this.pendingCameraRestore = null;
    this.state = { ...this.state, mode: 'off', draftText: '', notes: [], measurements: [], topologyRefs: [], lastSnapshot: null, error: null };
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
      error: null,
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
