// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/** One next step offered by a page state: a link (`href`) or a button
 *  (`onClick`). The first action with `primary` is the main one. */
export interface PageStateAction {
    label: string;
    href?: string;
    onClick?: () => void;
    primary?: boolean;
}

export interface PageStateProps {
    /** `loading` shows a spinner and is announced politely; `error` is
     *  announced as an alert. */
    tone: 'loading' | 'error';
    title: string;
    /** One or two sentences: what happened and what to do next. */
    message?: ReactNode;
    /** Raw error text for support, shown small under the message. */
    detail?: string | null;
    actions?: readonly PageStateAction[];
    testId?: string;
}

const PRIMARY_ACTION =
    'inline-flex items-center justify-center rounded-lg bg-blueprint hover:bg-blueprint-hover text-white px-4 py-2 text-sm font-medium no-underline transition-colors min-h-[40px]';
const SECONDARY_ACTION =
    'inline-flex items-center justify-center rounded-lg border border-rule bg-white hover:border-ink text-ink px-4 py-2 text-sm font-medium no-underline transition-colors min-h-[40px]';

function PageStateActionControl({ action }: { action: PageStateAction }) {
    const className = action.primary ? PRIMARY_ACTION : SECONDARY_ACTION;
    if (action.href !== undefined) {
        return <a href={action.href} className={className}>{action.label}</a>;
    }
    return <button type="button" onClick={action.onClick} className={className}>{action.label}</button>;
}

/**
 * Full-page loading / not-found / error state for the public vellum routes
 * (`/p/<slug>`, `/g/<id>`). Every state names what is happening and offers a
 * next step, so a page never sits on a bare "Loading…" line.
 */
export function PageState({ tone, title, message, detail, actions = [], testId = 'page-state' }: PageStateProps) {
    return (
        <main className="min-h-screen bg-vellum font-sans grid place-items-center px-4 py-12">
            <section
                data-testid={testId}
                data-tone={tone}
                role={tone === 'error' ? 'alert' : 'status'}
                aria-live={tone === 'error' ? 'assertive' : 'polite'}
                className="w-full max-w-md rounded-xl border border-rule bg-vellum-soft p-6"
            >
                <div className="flex items-start gap-3">
                    {tone === 'loading' && (
                        <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin text-ink-soft" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                        <h1 className="font-serif text-xl font-medium text-ink break-words">{title}</h1>
                        {message && <p className="mt-2 text-sm text-ink-soft break-words">{message}</p>}
                        {detail && (
                            <p className="mt-3 font-mono text-xs text-ink-soft break-words" data-testid={`${testId}-detail`}>
                                {detail}
                            </p>
                        )}
                    </div>
                </div>
                {actions.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                        {actions.map((action) => (
                            <PageStateActionControl key={action.label} action={action} />
                        ))}
                    </div>
                )}
                <p className="mt-6 font-mono text-xs text-ink-soft">
                    <a href="/" className="underline hover:text-ink">kernelCAD home</a>
                </p>
            </section>
        </main>
    );
}
