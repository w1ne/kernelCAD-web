// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useId, useRef, useState, type JSX, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cx } from './cx';
import { IconButton } from './IconButton';
import { DEFAULT_SNAPS, nearestSnap, snapForKey } from './sheetModel';
import { themeOf, type Theme } from './theme';
import { useFocusTrap } from './useFocusTrap';

export interface SheetProps {
    readonly open: boolean;
    readonly onClose: () => void;
    /** Title; also the dialog's accessible name. */
    readonly title: string;
    /** right: secondary panel on desktop; bottom: phone sheet with snap points. */
    readonly side?: 'right' | 'bottom';
    /** Bottom sheet heights as viewport fractions. Default 25 / 55 / 90 %. */
    readonly snapPoints?: readonly number[];
    /** Index into snapPoints to open at. Default the middle one. */
    readonly initialSnap?: number;
    /** Right sheet width in px. Default 340 (inspector width). */
    readonly width?: number;
    /** Theme of the sheet; default: the theme where focus was when it opened. */
    readonly theme?: Theme;
    readonly footer?: ReactNode;
    readonly children?: ReactNode;
}

const SPRING = { type: 'spring', stiffness: 400, damping: 40 } as const;
const FADE = { duration: 0.12 } as const;

/**
 * A modal sheet: right side on desktop, bottom with snap points on phone.
 * Focus is trapped inside; Esc, the close button or the scrim close it and
 * focus returns to where it was.
 */
export function Sheet(props: SheetProps): JSX.Element | null {
    const { open } = props;
    if (typeof document === 'undefined') return null;
    return createPortal(<AnimatePresence>{open && <SheetBody {...props} />}</AnimatePresence>, document.body);
}

function SheetBody({
    onClose,
    title,
    side = 'right',
    snapPoints = DEFAULT_SNAPS,
    initialSnap,
    width = 340,
    theme: themeProp,
    footer,
    children,
}: SheetProps): JSX.Element {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const reduce = useReducedMotion();
    const [theme] = useState<Theme>(() => themeProp ?? themeOf(document.activeElement));
    const [snap, setSnap] = useState(() => initialSnap ?? Math.floor(snapPoints.length / 2));
    const [dragFraction, setDragFraction] = useState<number | null>(null);
    useFocusTrap(panelRef, true, onClose);

    const bottom = side === 'bottom';
    const fraction = dragFraction ?? snapPoints[snap];

    const onHandleDown = (e: PointerEvent<HTMLDivElement>): void => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragFraction(snapPoints[snap]);
    };
    const onHandleMove = (e: PointerEvent<HTMLDivElement>): void => {
        if (dragFraction === null) return;
        const f = (window.innerHeight - e.clientY) / window.innerHeight;
        setDragFraction(Math.max(0.1, Math.min(0.95, f)));
    };
    const onHandleUp = (): void => {
        if (dragFraction === null) return;
        setSnap(nearestSnap(dragFraction, snapPoints));
        setDragFraction(null);
    };

    const transition = reduce ? FADE : SPRING;
    const offscreen = reduce ? { opacity: 0 } : bottom ? { y: '100%' } : { x: '100%' };
    const onscreen = reduce ? { opacity: 1 } : bottom ? { y: 0 } : { x: 0 };

    return (
        <div data-theme={theme} className="fixed inset-0 z-[900]">
            <motion.div
                className="absolute inset-0 bg-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={FADE}
                onClick={onClose}
                data-testid="sheet-scrim"
            />
            <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                initial={offscreen}
                animate={onscreen}
                exit={offscreen}
                transition={transition}
                style={bottom ? { height: `${fraction * 100}dvh` } : { width: `min(100vw, ${width}px)` }}
                className={cx(
                    'absolute flex flex-col border-border bg-surface-1 text-fg shadow-e3 outline-none',
                    bottom
                        ? 'inset-x-0 bottom-0 rounded-t-sheet border-t pb-[env(safe-area-inset-bottom)]'
                        : 'inset-y-0 right-0 border-l',
                )}
            >
                {bottom && (
                    <div
                        role="slider"
                        tabIndex={0}
                        aria-label="Sheet height"
                        aria-orientation="vertical"
                        aria-valuemin={Math.round(snapPoints[0] * 100)}
                        aria-valuemax={Math.round(snapPoints[snapPoints.length - 1] * 100)}
                        aria-valuenow={Math.round(snapPoints[snap] * 100)}
                        aria-valuetext={`${Math.round(snapPoints[snap] * 100)} % of the screen`}
                        onKeyDown={(e) => {
                            const next = snapForKey(e.key, snap, snapPoints.length);
                            if (next === null) return;
                            e.preventDefault();
                            setSnap(next);
                        }}
                        onPointerDown={onHandleDown}
                        onPointerMove={onHandleMove}
                        onPointerUp={onHandleUp}
                        onPointerCancel={onHandleUp}
                        className="focus-ring mx-auto mt-1.5 flex h-6 w-16 shrink-0 cursor-grab touch-none items-center justify-center rounded-full"
                    >
                        <span aria-hidden="true" className="h-1 w-10 rounded-full bg-border-strong" />
                    </div>
                )}
                <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
                    <h2 id={titleId} className="text-title text-fg">
                        {title}
                    </h2>
                    <IconButton
                        label="Close"
                        shortcut={['Escape']}
                        icon={<X className="size-4" strokeWidth={1.75} />}
                        onClick={onClose}
                        size={bottom ? 'touch' : 'md'}
                    />
                </header>
                <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
                {footer && <footer className="shrink-0 border-t border-border px-4 py-3">{footer}</footer>}
            </motion.div>
        </div>
    );
}
