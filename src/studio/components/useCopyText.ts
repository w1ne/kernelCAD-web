// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState } from 'react';

export type CopyState = 'idle' | 'copied' | 'failed';

/** How long "Copied" stays before the button reads its label again. */
export const COPY_FEEDBACK_MS = 2000;

/**
 * Copy text to the clipboard with transient feedback: `state` is 'copied'
 * (or 'failed' when the clipboard is blocked) for COPY_FEEDBACK_MS, then
 * 'idle' again.
 */
export function useCopyText(): { state: CopyState; copy: (text: string) => Promise<void> } {
    const [state, setState] = useState<CopyState>('idle');
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const copy = useCallback(async (text: string) => {
        let next: CopyState = 'copied';
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            next = 'failed';
        }
        setState(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setState('idle'), COPY_FEEDBACK_MS);
    }, []);

    return { state, copy };
}
