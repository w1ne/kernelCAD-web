// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState } from 'react';
import { useProject } from '../../context/ProjectContext';

/** Owns the Header's revision-history dropdown: open/close state, the
 *  outside-click/Escape close effect, and the restore handler. */
export function useHeaderHistory() {
    const { activeProject, revisions, restoreRevision } = useProject();
    const [historyOpen, setHistoryOpen] = useState(false);
    const historyRef = useRef<HTMLDivElement>(null);

    // Close the history menu on outside click / Escape.
    useEffect(() => {
        if (!historyOpen) return;
        const onPointerDown = (e: MouseEvent) => {
            if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
                setHistoryOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setHistoryOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [historyOpen]);

    // History is only meaningful once there are at least two distinct
    // revisions to move between; ephemeral funnel projects report zero
    // revisions.
    const historyAvailable = revisions.length >= 2;

    const formatRevisionTime = (ts: string) => {
        const date = new Date(ts);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleRestore = (v: number) => {
        restoreRevision(v);
        setHistoryOpen(false);
    };

    return {
        activeProject,
        revisions,
        historyOpen,
        setHistoryOpen,
        historyRef,
        historyAvailable,
        formatRevisionTime,
        handleRestore,
    };
}
