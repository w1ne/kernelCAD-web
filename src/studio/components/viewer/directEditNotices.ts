// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/viewer/directEditNotices.ts
//
// User-facing notices and staged-edit ids for the direct-edit gizmo. Kept in
// a leaf module so both the component and its gesture hook can share them
// without an import cycle.
import { makeStudioDiagnostic } from "../../diagnostics";

export const REVIEWING_NOTICE = 'Reviewing candidate…';
export const REVIEW_BUSY_NOTICE = 'A candidate review is already running; wait for it to finish.';
// Route the notice through the catalogued Studio diagnostic so the emitted
// code/hint stay registry-driven rather than duplicating the entry here.
export const SOURCE_CHANGED_NOTICE = makeStudioDiagnostic(
    'studio.direct-edit.source-changed',
    'Source changed during the drag; redo it.',
).message;
export const FALLBACK_PLAN_NOTICE = 'Direct edit could not be planned.';

/** Staged-edit id: monotonic enough for the single-slot store, collision-proof
 *  even for same-millisecond proposals. */
export function nextStagedEditId(): string {
    return `drag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
