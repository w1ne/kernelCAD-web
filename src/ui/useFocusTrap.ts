// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focusable descendants of `root`, in DOM order. */
export function focusableIn(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
    );
}

/**
 * While `active`: move focus into `ref`, keep Tab inside it, and call
 * `onEscape` on Esc. When it ends, return focus to the element that had it.
 */
export function useFocusTrap(
    ref: RefObject<HTMLElement | null>,
    active: boolean,
    onEscape?: () => void,
): void {
    const onEscapeRef = useRef(onEscape);
    useEffect(() => {
        onEscapeRef.current = onEscape;
    });

    useEffect(() => {
        if (!active) return;
        const root = ref.current;
        if (!root) return;
        const previous = document.activeElement as HTMLElement | null;
        const first = focusableIn(root)[0];
        (first ?? root).focus();

        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onEscapeRef.current?.();
                return;
            }
            if (e.key !== 'Tab') return;
            const items = focusableIn(root);
            if (items.length === 0) {
                e.preventDefault();
                return;
            }
            const head = items[0];
            const tail = items[items.length - 1];
            if (e.shiftKey && document.activeElement === head) {
                e.preventDefault();
                tail.focus();
            } else if (!e.shiftKey && document.activeElement === tail) {
                e.preventDefault();
                head.focus();
            }
        };
        root.addEventListener('keydown', onKeyDown);
        return () => {
            root.removeEventListener('keydown', onKeyDown);
            if (previous && previous.isConnected) previous.focus();
        };
    }, [ref, active]);
}
