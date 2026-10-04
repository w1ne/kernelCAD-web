// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/directEdit/useSourceEditCommit.ts
//
// The one save path for an accepted source edit (Approve or auto-apply):
//
// 1. `script` target: write the file through the dev endpoint first; a failed
//    write leaves the editor untouched.
// 2. Apply the rewrite as ONE `ReplaceSourceCommand` on the workbench command
//    stack, so Undo (header button or Ctrl/Cmd+Z) restores the exact source
//    and the geometry re-runs from it.
// 3. `project` target: persist every applied source (edit, undo, redo)
//    through `saveActiveProject` — the same call the code editor's autosave
//    and the param sliders use. The save is synchronous with the code change
//    (like `usePersistentParams`) so the project→workbench sync never reverts
//    it, and the project store coalesces saves within its revision window, so
//    a burst of drags becomes one revision.

import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useWorkbench } from '../context/WorkbenchContext';
import { ProjectContext } from '../context/ProjectContext';
import { useStudioChrome } from '../context/StudioChromeContext';
import { ReplaceSourceCommand } from '../../authoring/commands/implementations/ReplaceSourceCommand';
import { currentStudioScript, shouldUseHostedMesh } from '../scriptSource';
import { saveSourceToScript } from './saveSource';
import { resolveSourceEditTarget, targetForEdit, type SourceEditTarget } from './sourceEditTarget';
import type { StagedEdit } from '../store/shellStore';

export type SourceEditCommitResult =
    | { readonly ok: true }
    | { readonly ok: false; readonly reason: 'read-only' | 'save-failed' | 'aborted'; readonly message: string };

export interface SourceEditCommitOptions {
    /** Re-checked after the (async) file save and before the apply. Return
     *  false to leave the editor untouched (the edit went stale meanwhile). */
    readonly canApply?: () => boolean;
}

function readGalleryParam(): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('gallery');
}

function isDevLabRoute(): boolean {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/dev-lab');
}

/** The dev file endpoint is served by the vite middleware only. */
function devSourceSaveAvailable(): boolean {
    return Boolean(import.meta.env?.DEV) && !shouldUseHostedMesh();
}

/** What runs after each apply/undo/redo of an edit on this target. */
function persistenceFor(
    target: Exclude<SourceEditTarget, { kind: 'readOnly' }>,
    appliedCode: string,
    saveProject: (code: string) => void,
): ((code: string) => void) | undefined {
    if (target.kind === 'project') return saveProject;
    if (target.kind !== 'script') return undefined;
    // Undo/redo write the file back too, so disk follows the editor. The
    // apply itself was saved before it ran; skip that repeat.
    const script = target.script;
    let lastSaved = appliedCode;
    return (code) => {
        if (code === lastSaved) return;
        lastSaved = code;
        saveSourceToScript(script, code).catch((error: unknown) => {
            console.error('Direct-edit undo save failed:', error);
        });
    };
}

export function useSourceEditTarget(): SourceEditTarget {
    const { viewerMode } = useStudioChrome();
    const { hasControlledCode } = useWorkbench();
    const project = useContext(ProjectContext);
    const hasActiveProject = project?.activeProject != null && !isDevLabRoute();
    const script = hasControlledCode ? null : currentStudioScript();
    const gallery = hasControlledCode ? null : readGalleryParam();
    return useMemo(() => resolveSourceEditTarget({
        viewerMode: Boolean(viewerMode),
        hasControlledCode: Boolean(hasControlledCode),
        script,
        gallery,
        devSourceSave: devSourceSaveAvailable(),
        hasActiveProject,
    }), [viewerMode, hasControlledCode, script, gallery, hasActiveProject]);
}

export function useSourceEditCommit(): {
    target: SourceEditTarget;
    commit: (edit: StagedEdit, options?: SourceEditCommitOptions) => Promise<SourceEditCommitResult>;
} {
    const target = useSourceEditTarget();
    const { commandManager } = useWorkbench();
    const project = useContext(ProjectContext);

    // Undo can run long after this render; persist through the latest save
    // callback, not the one captured when the edit applied.
    const saveRef = useRef(project?.saveActiveProject);
    useEffect(() => {
        saveRef.current = project?.saveActiveProject;
    }, [project?.saveActiveProject]);

    const commit = useCallback(async (
        edit: StagedEdit,
        options?: SourceEditCommitOptions,
    ): Promise<SourceEditCommitResult> => {
        const editTarget = targetForEdit(target, edit.targetScript, devSourceSaveAvailable());
        if (editTarget.kind === 'readOnly') {
            return { ok: false, reason: 'read-only', message: editTarget.hint };
        }
        if (editTarget.kind === 'script') {
            try {
                await saveSourceToScript(editTarget.script, edit.toCode);
            } catch (error) {
                console.error('Direct-edit save failed:', error);
                return {
                    ok: false,
                    reason: 'save-failed',
                    message: error instanceof Error ? error.message : String(error),
                };
            }
        }
        if (options?.canApply && !options.canApply()) {
            return { ok: false, reason: 'aborted', message: 'The edit went stale before it applied.' };
        }
        const persist = persistenceFor(editTarget, edit.toCode, (code) => saveRef.current?.({ code }));
        commandManager.execute(new ReplaceSourceCommand(edit.fromCode, edit.toCode, edit.intent, persist));
        return { ok: true };
    }, [commandManager, target]);

    return { target, commit };
}
