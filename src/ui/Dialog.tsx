// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useId, useRef, useState, type JSX, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from './cx';
import { IconButton } from './IconButton';
import { themeOf, type Theme } from './theme';
import { useFocusTrap } from './useFocusTrap';

export interface DialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    /** Title; also the dialog's accessible name. */
    readonly title: string;
    /** One sentence under the title; also the accessible description. */
    readonly description?: ReactNode;
    /** Max width in px. Default 440. On a phone the dialog is full width minus 16 px gutters. */
    readonly width?: number;
    /** Theme of the dialog; default: the theme where focus was when it opened. */
    readonly theme?: Theme;
    /** Buttons, right-aligned. Put the primary action last. */
    readonly footer?: ReactNode;
    readonly children?: ReactNode;
    readonly testId?: string;
}

/**
 * A centred modal dialog. Focus moves into it and stays inside; Esc, the
 * close button or the scrim close it, and focus returns to where it was.
 */
export function Dialog(props: DialogProps): JSX.Element | null {
    if (!props.open || typeof document === 'undefined') return null;
    return createPortal(<DialogBody {...props} />, document.body);
}

function DialogBody({
    onClose,
    title,
    description,
    width = 440,
    theme: themeProp,
    footer,
    children,
    testId,
}: DialogProps): JSX.Element {
    const titleId = useId();
    const descId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const [theme] = useState<Theme>(() => themeProp ?? themeOf(document.activeElement));
    useFocusTrap(panelRef, true, onClose);
    // The trap focuses the first control (Close); a field marked
    // data-autofocus (a search box, a name input) takes focus instead.
    useEffect(() => {
        panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }, []);

    return (
        <div data-theme={theme} className="fixed inset-0 z-[900] flex items-start justify-center overflow-y-auto px-4 py-[12vh]">
            <div aria-hidden="true" className="fixed inset-0 animate-fade-in bg-scrim" onClick={onClose} data-testid="dialog-scrim" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                data-testid={testId}
                style={{ maxWidth: width }}
                className={cx(
                    'relative flex w-full animate-pop-in flex-col rounded-sheet border border-border bg-surface-1 text-fg shadow-e3 outline-none',
                )}
            >
                <header className="flex items-start justify-between gap-3 px-5 pt-4">
                    <div className="min-w-0 pt-1">
                        <h2 id={titleId} className="text-title text-fg">
                            {title}
                        </h2>
                        {description && (
                            <p id={descId} className="mt-1 text-ui text-fg-2">
                                {description}
                            </p>
                        )}
                    </div>
                    <IconButton
                        label="Close"
                        shortcut={['Escape']}
                        icon={<X className="size-4" strokeWidth={1.75} />}
                        onClick={onClose}
                        className="-mr-2 shrink-0"
                    />
                </header>
                {children && <div className="px-5 pt-4">{children}</div>}
                <div className="h-4 shrink-0" />
                {footer && (
                    <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
                        {footer}
                    </footer>
                )}
            </div>
        </div>
    );
}
