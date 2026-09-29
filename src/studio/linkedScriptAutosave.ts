// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// On a dev `?script=` page the model follows the file on disk. Typing in the
// Code tab used to change neither the file nor the model. This hook writes a
// settled, parsable edit through the same PUT the direct-edit Approve uses.
// The file watcher then rebuilds the model.
//
// The text loaded from disk is the baseline, not an edit. A save of our own
// text becomes the next baseline, so the reload echo does not save again.
// An edit that has not yet been shown the file (the default project script
// racing the load) is never written.

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { parseCode } from '../shared/codeGeneration/ast';
import { devMeshAvailable } from './scriptSource';
import { saveSourceToScript } from './directEdit/saveSource';

const LINKED_SCRIPT_SAVE_MS = 1000;

interface DiskBaseline {
    readonly script: string;
    readonly source: string;
    readonly generation: number;
}

let baseline: DiskBaseline | null = null;
let generation = 0;
const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of listeners) listener();
}

export function diskScriptSource(): DiskBaseline | null {
    return baseline;
}

function subscribeDiskScript(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** The file on disk now holds `source`. Load and live-reload both call this. */
export function noteDiskScriptSource(script: string, source: string): void {
    if (baseline && baseline.script === script && baseline.source === source) return;
    generation += 1;
    baseline = { script, source, generation };
    emit();
}

export function clearDiskScriptSource(): void {
    if (baseline == null) return;
    baseline = null;
    emit();
}

/**
 * Take a disk reload into the editor unless the user has typed something
 * that is neither the previous baseline nor the incoming file.
 */
export function shouldApplyDiskSource(
    editorCode: string | null,
    baselineSource: string | null,
    incoming: string,
): boolean {
    if (editorCode == null || baselineSource == null) return true;
    return editorCode === baselineSource || editorCode === incoming;
}

/** Hosted `?script=` has no file to write. The editor must not pretend it does. */
export function scriptCodeEditorIsReadOnly(script: string | null, devSave: boolean): boolean {
    return Boolean(script) && !devSave;
}

function isLinkedScriptSavable(code: string): boolean {
    if (code.length === 0) return false;
    try {
        parseCode(code);
        return true;
    } catch {
        return false;
    }
}

export function useLinkedScriptAutosave(
    script: string | null,
    code: string,
    devSave: boolean = devMeshAvailable(),
): void {
    const disk = useSyncExternalStore(subscribeDiskScript, diskScriptSource, diskScriptSource);
    const seenCleanRef = useRef(false);

    useEffect(() => {
        seenCleanRef.current = false;
    }, [script]);

    useEffect(() => {
        if (script) return;
        clearDiskScriptSource();
    }, [script]);

    useEffect(() => {
        if (!script || !devSave) return;
        if (!disk || disk.script !== script) return;
        if (code === disk.source) {
            seenCleanRef.current = true;
            return;
        }
        if (!seenCleanRef.current) return;
        if (!isLinkedScriptSavable(code)) return;

        const startedGen = disk.generation;
        const saving = code;
        const handle = window.setTimeout(() => {
            saveSourceToScript(script, saving)
                .then(() => {
                    const current = diskScriptSource();
                    if (!current || current.generation !== startedGen) return;
                    noteDiskScriptSource(script, saving);
                })
                .catch((error: unknown) => {
                    console.error('Script save failed:', error);
                });
        }, LINKED_SCRIPT_SAVE_MS);
        return () => window.clearTimeout(handle);
    }, [script, code, devSave, disk]);
}
