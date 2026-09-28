// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/directEdit/autoApply.ts
//
// Auto-apply for UI-originated source edits (gizmo drags). When the setting is
// on, a drag whose candidate ran clean applies at once as one undo step; an
// agent proposal always waits in the staged-edit card. The setting is a
// per-user convenience kept in localStorage — read and write never throw, and
// a missing/blocked store falls back to the default (on).

import { useSyncExternalStore } from 'react';
import type { StagedEdit, StagedEditValidityDelta } from '../store/shellStore';

export const AUTO_APPLY_STORAGE_KEY = 'kernelcad.directEdit.autoApply';
const DEFAULT_AUTO_APPLY = true;

const listeners = new Set<() => void>();
let cached: boolean | null = null;

function readStored(): boolean {
    try {
        const raw = globalThis.localStorage?.getItem(AUTO_APPLY_STORAGE_KEY);
        if (raw === 'true') return true;
        if (raw === 'false') return false;
    } catch {
        // Blocked storage (private window, sandboxed iframe): use the default.
    }
    return DEFAULT_AUTO_APPLY;
}

export function isAutoApplyEnabled(): boolean {
    if (cached === null) cached = readStored();
    return cached;
}

export function setAutoApplyEnabled(enabled: boolean): void {
    cached = enabled;
    try {
        globalThis.localStorage?.setItem(AUTO_APPLY_STORAGE_KEY, String(enabled));
    } catch {
        // Keep the in-memory value for this session.
    }
    for (const listener of listeners) listener();
}

/** Test helper: forget the cached value so the next read hits storage. */
export function resetAutoApplySettingCache(): void {
    cached = null;
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useAutoApplySetting(): [boolean, (enabled: boolean) => void] {
    const enabled = useSyncExternalStore(subscribe, isAutoApplyEnabled, isAutoApplyEnabled);
    return [enabled, setAutoApplyEnabled];
}

/** A UI gesture (drag), not an agent or test proposal. */
export function isUiOriginatedEdit(edit: StagedEdit): boolean {
    return edit.source?.kind === 'human';
}

/** True when the candidate is worse than the baseline: more interference
 *  pairs, more interference volume, or a valid model that became invalid. */
export function isValidityDrop(delta: StagedEditValidityDelta): boolean {
    return delta.toInterferences > delta.fromInterferences
        || delta.toVolumeMm3 > delta.fromVolumeMm3 + 1e-6
        || (delta.fromOk && !delta.toOk);
}

/** Why this edit must go to review instead of auto-applying, or null when it
 *  may apply at once. Only the UI-edit gate; the setting is checked apart. */
export function autoApplyBlockReason(edit: StagedEdit): string | null {
    if (!isUiOriginatedEdit(edit)) return 'Agent edits always wait for review.';
    if (edit.evaluation?.ok === false) {
        return `Not auto-applied: the edited script failed to run (${edit.evaluation.error ?? 'unknown error'}).`;
    }
    const delta = edit.validityDelta;
    if (delta && isValidityDrop(delta)) {
        return `Not auto-applied: validity drops (interferences ${delta.fromInterferences} → ${delta.toInterferences}). Review the edit.`;
    }
    return null;
}
