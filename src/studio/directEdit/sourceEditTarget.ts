// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/directEdit/sourceEditTarget.ts
//
// Where an approved direct edit is kept. One decision, shared by the Approve
// button, auto-apply and the gizmo's read-only gate:
//
// - `script`   — dev server, `?script=examples/…`: the file endpoint
//                (`PUT /__kernelcad/source`, vite middleware only).
// - `project`  — the Studio's active project: the same `saveActiveProject`
//                flow the code editor autosaves through (project revisions).
// - `memory`   — a source the Studio does not own (`?gallery=`, a hosted
//                `?script=` link, a host-controlled embed): apply to the editor
//                only; the host (embed `onCodeChange`) or the user persists it.
// - `readOnly` — someone else's shared project or an embed viewer: no edits.

export type SourceEditTarget =
    | { readonly kind: 'script'; readonly script: string }
    | { readonly kind: 'project' }
    | { readonly kind: 'memory' }
    | { readonly kind: 'readOnly'; readonly hint: string };

export const READ_ONLY_EDIT_HINT = 'This view is read-only. Direct edits are off.';

export interface SourceEditTargetInput {
    /** Studio mounted as a read-only viewer (`/p/<slug>`, `/embed/<slug>`). */
    readonly viewerMode: boolean;
    /** Host owns the source (embed `code` prop). */
    readonly hasControlledCode: boolean;
    /** `?script=` deep link, or null. */
    readonly script: string | null;
    /** `?gallery=` deep link, or null. */
    readonly gallery: string | null;
    /** The dev file endpoint exists (vite dev server, not the hosted app). */
    readonly devSourceSave: boolean;
    /** A project store is mounted and has an active project. */
    readonly hasActiveProject: boolean;
}

export function resolveSourceEditTarget(input: SourceEditTargetInput): SourceEditTarget {
    if (input.viewerMode) return { kind: 'readOnly', hint: READ_ONLY_EDIT_HINT };
    if (input.hasControlledCode) return { kind: 'memory' };
    if (input.gallery) return { kind: 'memory' };
    if (input.script) {
        return input.devSourceSave ? { kind: 'script', script: input.script } : { kind: 'memory' };
    }
    return input.hasActiveProject ? { kind: 'project' } : { kind: 'memory' };
}

/** The target for one edit. An edit staged on a `?script=` route carries that
 *  script (`StagedEdit.targetScript`); on the dev server it is saved back to
 *  that file even if the route changed since. Read-only always wins. */
export function targetForEdit(
    target: SourceEditTarget,
    editTargetScript: string | undefined,
    devSourceSave: boolean,
): SourceEditTarget {
    if (target.kind === 'readOnly' || !editTargetScript || !devSourceSave) return target;
    return { kind: 'script', script: editTargetScript };
}
