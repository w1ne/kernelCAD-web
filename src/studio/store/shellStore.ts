import type { ValidatorResult } from '../../modeling/mates/validator';
import type { SelectedFeatureId } from '../types';

export type SectionShape = 'plane' | 'quarter' | 'octant';

// Studio shell store — UI-only state, no model semantics.
//
// Implemented as a tiny observable rather than via Zustand so the slice
// stays dependency-free; the `useSyncExternalStore` consumer in
// `useShellStore` gets React 18 concurrent-safe reads for free. If a
// future slice needs richer selectors (slice equality, devtools), this
// store can be swapped for Zustand without changing consumers' signatures.

/**
 * One proposed AST edit awaiting human review. Single-slot (no queue) in
 * Slice 1.5; future slices may extend. Population comes from
 * `window.__kernelcad_propose_edit` today (test hook), and from the MCP
 * `propose_edit` tool in Slice 1.5b.
 */
export interface StagedEdit {
    readonly id: string;
    readonly intent: string;
    readonly fromCode: string;
    readonly toCode: string;
    /** Optional snapshot of validateAssembly predicted output post-edit. */
    readonly expectedDiagnostics?: ReadonlyArray<{ code: string; severity: string; message: string }>;
    /** Where the proposal came from. */
    readonly source?: { kind: 'agent' | 'human' | 'test'; label?: string };
}

export interface ShellState {
    readonly selectedFeatureId: SelectedFeatureId;
    readonly agentRailOpen: boolean;
    readonly previousValidity: ValidatorResult | null;
    readonly currentValidity: ValidatorResult | null;
    readonly stagedEdit: StagedEdit | null;
    readonly markingMode: boolean;
    readonly sectionMode: boolean;
    readonly sectionAxis: 'x' | 'y' | 'z';
    readonly sectionFlip: boolean;
    readonly sectionPosition: number;
    readonly sectionShape: SectionShape;
    /** Per axis: true ⇒ the POSITIVE side of that axis is removed. */
    readonly sectionSides: Readonly<Record<'x' | 'y' | 'z', boolean>>;
    /** Cutaway plane positions along each axis, world mm. */
    readonly sectionOffsets: Readonly<Record<'x' | 'y' | 'z', number>>;
    /** Quarter mode: the UNCUT axis (the wedge runs full length along it). */
    readonly sectionQuarterAxis: 'x' | 'y' | 'z';
    /** Part keys excluded from clipping (rendered complete). */
    readonly sectionKeepWhole: ReadonlySet<string>;
}

const INITIAL_STATE: ShellState = {
    selectedFeatureId: null,
    agentRailOpen: false,
    previousValidity: null,
    currentValidity: null,
    stagedEdit: null,
    markingMode: false,
    sectionMode: false,
    sectionAxis: 'z',
    sectionFlip: false,
    sectionPosition: 0,
    sectionShape: 'plane',
    sectionSides: { x: true, y: true, z: true },
    sectionOffsets: { x: 0, y: 0, z: 0 },
    sectionQuarterAxis: 'z',
    sectionKeepWhole: new Set<string>(),
};

type Listener = () => void;

export class ShellStore {
    private state: ShellState = INITIAL_STATE;
    private readonly listeners = new Set<Listener>();

    getSnapshot = (): ShellState => this.state;

    subscribe = (listener: Listener): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    /**
     * Set the selected feature id. Idempotent: same id → no listener fan-out
     * (prevents re-render storms when multiple subscribers race to set).
     */
    setSelectedFeatureId = (id: SelectedFeatureId): void => {
        if (this.state.selectedFeatureId === id) return;
        this.state = { ...this.state, selectedFeatureId: id };
        this.emit();
    };

    setAgentRailOpen = (open: boolean): void => {
        if (this.state.agentRailOpen === open) return;
        this.state = { ...this.state, agentRailOpen: open };
        this.emit();
    };

    setMarkingMode = (on: boolean): void => {
        if (this.state.markingMode === on) return;
        this.state = { ...this.state, markingMode: on };
        this.emit();
    };

    toggleMarkingMode = (): void => {
        this.state = { ...this.state, markingMode: !this.state.markingMode };
        this.emit();
    };

    setSectionMode = (on: boolean): void => {
        if (this.state.sectionMode === on) return;
        this.state = {
            ...this.state,
            sectionMode: on,
            // Keep-whole choices are scoped to one sectioning session.
            sectionKeepWhole: on ? this.state.sectionKeepWhole : new Set<string>(),
        };
        this.emit();
    };

    toggleSectionMode = (): void => {
        const on = !this.state.sectionMode;
        this.state = {
            ...this.state,
            sectionMode: on,
            sectionKeepWhole: on ? this.state.sectionKeepWhole : new Set<string>(),
        };
        this.emit();
    };

    setSectionAxis = (axis: 'x' | 'y' | 'z'): void => {
        if (this.state.sectionAxis === axis) return;
        this.state = { ...this.state, sectionAxis: axis };
        this.emit();
    };

    setSectionFlip = (flip: boolean): void => {
        if (this.state.sectionFlip === flip) return;
        this.state = { ...this.state, sectionFlip: flip };
        this.emit();
    };

    setSectionPosition = (position: number): void => {
        if (this.state.sectionPosition === position) return;
        this.state = { ...this.state, sectionPosition: position };
        this.emit();
    };

    setSectionShape = (shape: SectionShape): void => {
        if (this.state.sectionShape === shape) return;
        this.state = { ...this.state, sectionShape: shape };
        this.emit();
    };

    setSectionSide = (axis: 'x' | 'y' | 'z', removed: boolean): void => {
        if (this.state.sectionSides[axis] === removed) return;
        this.state = {
            ...this.state,
            sectionSides: { ...this.state.sectionSides, [axis]: removed },
        };
        this.emit();
    };

    setSectionOffset = (axis: 'x' | 'y' | 'z', position: number): void => {
        if (this.state.sectionOffsets[axis] === position) return;
        this.state = {
            ...this.state,
            sectionOffsets: { ...this.state.sectionOffsets, [axis]: position },
        };
        this.emit();
    };

    setSectionQuarterAxis = (axis: 'x' | 'y' | 'z'): void => {
        if (this.state.sectionQuarterAxis === axis) return;
        this.state = { ...this.state, sectionQuarterAxis: axis };
        this.emit();
    };

    toggleSectionKeepWhole = (key: string): void => {
        const next = new Set(this.state.sectionKeepWhole);
        if (!next.delete(key)) next.add(key);
        this.state = { ...this.state, sectionKeepWhole: next };
        this.emit();
    };

    /** Drop keep-whole keys no longer present in the scene. No-op if all valid. */
    pruneSectionKeepWhole = (validKeys: ReadonlyArray<string>): void => {
        const valid = new Set(validKeys);
        const kept = [...this.state.sectionKeepWhole].filter((k) => valid.has(k));
        if (kept.length === this.state.sectionKeepWhole.size) return;
        this.state = { ...this.state, sectionKeepWhole: new Set(kept) };
        this.emit();
    };

    /**
     * Publish a new validator result. Rotates current → previous so the
     * `<ValidityDelta>` component can diff the two without storing its own
     * history. Identity check on the validity reference: republishing the
     * same `ValidatorResult` is a no-op.
     */
    publishValidity = (next: ValidatorResult | null): void => {
        if (this.state.currentValidity === next) return;
        this.state = {
            ...this.state,
            previousValidity: this.state.currentValidity,
            currentValidity: next,
        };
        this.emit();
    };

    /**
     * Propose a staged edit. Idempotent on identical reference. Slice 1.5
     * is single-slot — a new proposal replaces any existing one without a
     * queue. Future slices may extend.
     */
    proposeStagedEdit = (edit: StagedEdit | null): void => {
        if (this.state.stagedEdit === edit) return;
        this.state = { ...this.state, stagedEdit: edit };
        this.emit();
    };

    clearStagedEdit = (): void => {
        if (this.state.stagedEdit === null) return;
        this.state = { ...this.state, stagedEdit: null };
        this.emit();
    };

    /** Test helper. Not exposed via React hooks. */
    reset = (): void => {
        this.state = INITIAL_STATE;
        this.emit();
    };

    private emit(): void {
        for (const listener of this.listeners) listener();
    }
}

/** Module-scope singleton consumed by the React hook. */
export const shellStore = new ShellStore();
