// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useSyncExternalStore } from 'react';

/** Viewport width below which the fixed-height chrome bars (Header, Toolbar)
 *  can no longer show their full control set. Matches Tailwind's `md`
 *  breakpoint so JS-driven and class-driven responsiveness agree. */
export const NARROW_QUERY = '(max-width: 767px)';

/** The Header carries a wider control set than the Toolbar (view mode,
 *  background, grid, undo/redo, history, exports) plus whatever chrome the
 *  route injects, and measurably stops fitting below ~1024px — so it collapses
 *  a breakpoint earlier, at Tailwind's `lg`. */
export const COMPACT_HEADER_QUERY = '(max-width: 1023px)';

function mediaQueryList(query: string): MediaQueryList | null {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
    return window.matchMedia(query);
}

/**
 * True while the viewport is narrow enough that the chrome bars must collapse
 * their secondary controls into an overflow menu.
 *
 * Implemented with `useSyncExternalStore` rather than `useState` + effect so
 * there is no set-state-in-effect on mount and no first-paint flash of the
 * desktop layout. Falls back to `false` (desktop) when `matchMedia` is
 * unavailable — SSR and the happy-dom test environment both take that path.
 */
export function useIsNarrow(query: string = NARROW_QUERY): boolean {
    const subscribe = useCallback((onChange: () => void) => {
        const mql = mediaQueryList(query);
        if (!mql || typeof mql.addEventListener !== 'function') return () => {};
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);

    const getSnapshot = useCallback(() => mediaQueryList(query)?.matches ?? false, [query]);

    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
