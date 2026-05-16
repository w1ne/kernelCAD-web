import type { ValidatorResult } from '../../modeling/mates/validator';
import type { SelectedFeatureId } from '../types';

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
}

const INITIAL_STATE: ShellState = {
    selectedFeatureId: null,
    agentRailOpen: false,
    previousValidity: null,
    currentValidity: null,
    stagedEdit: null,
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
