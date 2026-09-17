// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY_SHOW_SKETCHES = 'kernelcad:showSketches';

function readStoredShowSketches(): boolean {
    if (typeof window === 'undefined') return true;
    const raw = window.localStorage.getItem(STORAGE_KEY_SHOW_SKETCHES);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return true;
}

/** Owns the sketch-visibility toggle and its localStorage persistence. */
export function useShowSketches() {
    const [showSketches, setShowSketches] = useState(() => readStoredShowSketches());

    const toggleSketchVisibility = useCallback(() => {
        setShowSketches(prev => !prev);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEY_SHOW_SKETCHES, String(showSketches));
    }, [showSketches]);

    return { showSketches, toggleSketchVisibility };
}
