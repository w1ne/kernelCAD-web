// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
    /** Agent context captured when the edit was proposed. */
    readonly context?: {
        readonly promptText: string;
        readonly selectedFeatureId: SelectedFeatureId;
        readonly repairWorkflow: AgentRepairWorkflow | null;
        readonly generationId?: string;
    };
    /** Optional snapshot of validateAssembly predicted output post-edit. */
    readonly expectedDiagnostics?: ReadonlyArray<{ code: string; severity: string; message: string }>;
    /** Where the proposal came from. */
    readonly source?: { kind: 'agent' | 'human' | 'test'; label?: string };
}

export type AgentRepairWorkflowState = 'drafted' | 'running';

export interface AgentRepairWorkflow {
    readonly cardId: string;
    readonly code: string;
    readonly promptText: string;
    readonly targetId: SelectedFeatureId;
    readonly promptSource: 'review' | 'fallback';
    readonly validityFingerprint: string;
    readonly state: AgentRepairWorkflowState;
}

export interface ViewportFocusTarget {
    readonly ids: readonly string[];
    readonly source: 'validity-diagnostic' | 'validity-suggestion';
}

export interface ShellState {
    readonly selectedFeatureId: SelectedFeatureId;
    readonly agentRailOpen: boolean;
    readonly agentDraftPrompt: string | null;
    readonly agentDraftPromptVersion: number;
    readonly agentRepairWorkflow: AgentRepairWorkflow | null;
    readonly viewportFocusTarget: ViewportFocusTarget | null;
    readonly viewportFocusTargetVersion: number;
    readonly inspectorOpen: boolean;
    readonly previousValidity: ValidatorResult | null;
    readonly currentValidity: ValidatorResult | null;
    readonly stagedEdit: StagedEdit | null;
    readonly markingMode: boolean;
    readonly sectionMode: boolean;
    /**
     * Per axis: does this axis contribute a cut plane? One enabled axis is
     * a classic section plane, two are a quarter wedge, three an octant
     * corner — one mechanism, no modes.
     */
    readonly sectionAxesEnabled: Readonly<Record<'x' | 'y' | 'z', boolean>>;
    /** Per axis: true ⇒ the POSITIVE side of that axis is removed. */
    readonly sectionSides: Readonly<Record<'x' | 'y' | 'z', boolean>>;
    /** Cut plane positions along each axis, world mm. */
    readonly sectionOffsets: Readonly<Record<'x' | 'y' | 'z', number>>;
    /** Part keys excluded from clipping (rendered complete). */
    readonly sectionKeepWhole: ReadonlySet<string>;
}

const STORAGE_KEY_INSPECTOR_OPEN = 'kernelcad:inspectorOpen';

function readStoredInspectorOpen(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        // Default open: only an explicit stored 'false' collapses the panel.
        return window.localStorage.getItem(STORAGE_KEY_INSPECTOR_OPEN) !== 'false';
    } catch {
        return true;
    }
}

function writeStoredInspectorOpen(open: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY_INSPECTOR_OPEN, String(open));
    } catch {
        // Private-mode / quota failures degrade to session-only state.
    }
}

const INITIAL_STATE: ShellState = {
    selectedFeatureId: null,
    // Open by default ONLY on the hosted web build (where the in-app Generate
    // agent lives), so it's the first thing a visitor sees. Local/MCP Studio
    // keeps it closed — the agent there is the developer's own via MCP.
    agentRailOpen: Boolean(import.meta.env?.VITE_API_BASE_URL),
    agentDraftPrompt: null,
    agentDraftPromptVersion: 0,
    agentRepairWorkflow: null,
    viewportFocusTarget: null,
    viewportFocusTargetVersion: 0,
    inspectorOpen: true,
    previousValidity: null,
    currentValidity: null,
    stagedEdit: null,
    markingMode: false,
    sectionMode: false,
    sectionAxesEnabled: { x: false, y: false, z: true },
    sectionSides: { x: true, y: true, z: true },
    sectionOffsets: { x: 0, y: 0, z: 0 },
    sectionKeepWhole: new Set<string>(),
};

type Listener = () => void;

export class ShellStore {
    // Inspector visibility persists across reloads (mirrors the validity
    // drawer's localStorage pattern); everything else starts from defaults.
    private state: ShellState = { ...INITIAL_STATE, inspectorOpen: readStoredInspectorOpen() };
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

    setAgentDraftPrompt = (prompt: string | null): void => {
        if (this.state.agentDraftPrompt === prompt && prompt === null) return;
        this.state = {
            ...this.state,
            agentDraftPrompt: prompt,
            agentDraftPromptVersion:
                prompt === null
                    ? this.state.agentDraftPromptVersion
                    : this.state.agentDraftPromptVersion + 1,
        };
        this.emit();
    };

    setAgentRepairWorkflow = (workflow: AgentRepairWorkflow | null): void => {
        if (this.state.agentRepairWorkflow === workflow) return;
        this.state = { ...this.state, agentRepairWorkflow: workflow };
        this.emit();
    };

    setViewportFocusTarget = (target: ViewportFocusTarget | null): void => {
        if (target === null && this.state.viewportFocusTarget === null) return;
        this.state = {
            ...this.state,
            viewportFocusTarget: target,
            viewportFocusTargetVersion:
                target === null
                    ? this.state.viewportFocusTargetVersion
                    : this.state.viewportFocusTargetVersion + 1,
        };
        this.emit();
    };

    setInspectorOpen = (open: boolean): void => {
        if (this.state.inspectorOpen === open) return;
        this.state = { ...this.state, inspectorOpen: open };
        writeStoredInspectorOpen(open);
        this.emit();
    };

    toggleInspectorOpen = (): void => {
        this.setInspectorOpen(!this.state.inspectorOpen);
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

    /** Enable/disable one axis's cut plane. */
    setSectionAxisEnabled = (axis: 'x' | 'y' | 'z', on: boolean): void => {
        if (this.state.sectionAxesEnabled[axis] === on) return;
        this.state = {
            ...this.state,
            sectionAxesEnabled: { ...this.state.sectionAxesEnabled, [axis]: on },
        };
        this.emit();
    };

    /** Set all three axis-enable flags at once (preset buttons). */
    setSectionAxesEnabled = (enabled: Readonly<Record<'x' | 'y' | 'z', boolean>>): void => {
        const cur = this.state.sectionAxesEnabled;
        if (cur.x === enabled.x && cur.y === enabled.y && cur.z === enabled.z) return;
        this.state = { ...this.state, sectionAxesEnabled: { ...enabled } };
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
