// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export interface OverflowMenuProps {
    /** Accessible name for the trigger, e.g. "View and file controls". */
    label: string;
    /** Menu body. Rendered as-is inside the dropdown panel. */
    children: ReactNode;
    /** Which trigger edge the panel lines up with. Default 'right'. */
    align?: 'left' | 'right';
    testId?: string;
}

/**
 * Narrow-viewport overflow menu for the header.
 *
 * The panel is rendered into a portal on <body> with fixed positioning,
 * anchored under the trigger, so no bar's overflow clip or stacking context
 * can hide it — the same escape hatch `UserMenu` uses for the account
 * dropdown.
 *
 * The panel stays open while controls inside it are used (most are toggles
 * whose effect is visible in the viewport behind); it closes on outside click,
 * Escape, or a second press of the trigger.
 */
export function OverflowMenu({ label, children, align = 'right', testId }: OverflowMenuProps) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [anchor, setAnchor] = useState<{ top: number; left?: number; right?: number } | null>(null);

    const positionPanel = useCallback(() => {
        const r = triggerRef.current?.getBoundingClientRect();
        if (!r) return;
        setAnchor(
            align === 'left'
                ? { top: r.bottom + 4, left: Math.max(4, r.left) }
                : { top: r.bottom + 4, right: Math.max(4, window.innerWidth - r.right) },
        );
    }, [align]);

    // Anchor up-front in the click handler (not in an effect) so the panel
    // never paints at a stale position.
    const toggleOpen = () => {
        if (!open) positionPanel();
        setOpen(o => !o);
    };

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        const reposition = () => positionPanel();
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
        };
    }, [open, positionPanel]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={toggleOpen}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                title={label}
                data-testid={testId}
                className={`focus-ring flex size-control-sm shrink-0 items-center justify-center rounded-control transition-colors duration-80 max-md:size-touch ${
                    open ? 'bg-surface-3 text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg'
                }`}
            >
                <MoreHorizontal className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
            {open &&
                anchor &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="menu"
                        aria-label={label}
                        data-testid={testId ? `${testId}-panel` : undefined}
                        style={{ top: anchor.top, left: anchor.left, right: anchor.right }}
                        data-theme="dark"
                        className="fixed z-[60] max-w-[calc(100vw-8px)] max-h-[70vh] overflow-y-auto animate-pop-in rounded-panel border border-border bg-surface-1 p-2 text-fg shadow-e2"
                    >
                        {children}
                    </div>,
                    document.body,
                )}
        </>
    );
}
