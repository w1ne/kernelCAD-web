// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOptionalSession } from '../../../funnel/hooks/useSession';
import {
    FEEDBACK_CATEGORIES, MESSAGE_MAX, MESSAGE_MIN, appVersion, postFeedback,
    type FeedbackCategory, type FeedbackPayload,
} from './feedbackApi';

/**
 * In-app product feedback form. Posts to the kernelcad.com Pages Function
 * `POST /api/feedback` (site/functions/api/feedback.ts), which stores every
 * submission in D1. The Studio runs on app.kernelcad.com, so the call is
 * cross-origin; the function allows this origin via CORS.
 */

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
    general: 'General',
    bug: 'Bug',
    idea: 'Idea',
    modeling: 'Modeling / CAD result',
};

const CATEGORY_PLACEHOLDER: Record<FeedbackCategory, string> = {
    general: 'Tell us what is on your mind.',
    bug: 'What went wrong, and what did you expect?',
    idea: 'What should kernelCAD do next?',
    modeling: 'Which part or feature came out wrong? Describe the shape you expected.',
};

export interface FeedbackModalProps {
    open: boolean;
    onClose: () => void;
    /** Override the network call (tests). */
    submitFeedback?: (payload: FeedbackPayload) => Promise<void>;
}

/** Renders nothing while closed, so each open starts with a fresh form. */
export function FeedbackModal({ open, ...rest }: FeedbackModalProps) {
    if (!open) return null;
    return <FeedbackDialog {...rest} />;
}

type Phase = 'form' | 'submitting' | 'success' | 'error';

const fieldClass =
    'w-full rounded bg-surface-1 border border-border-strong px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-blue-500';
const labelClass = 'block text-xs font-medium text-fg-2 mb-1';
const secondaryButton =
    'rounded px-3 py-1.5 text-xs text-fg hover:text-white hover:bg-surface-2 border border-border disabled:opacity-40';
const primaryButton =
    'rounded px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50';

function CategoryField({ value, onChange, disabled }: {
    value: FeedbackCategory;
    onChange: (c: FeedbackCategory) => void;
    disabled: boolean;
}) {
    return (
        <div>
            <label htmlFor="kc-feedback-category" className={labelClass}>Category</label>
            <select
                id="kc-feedback-category"
                value={value}
                onChange={(ev) => onChange(ev.target.value as FeedbackCategory)}
                disabled={disabled}
                className={fieldClass}
            >
                {FEEDBACK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                ))}
            </select>
        </div>
    );
}

/** Signed in: shows the account the feedback is sent as. Signed out: optional reply email. */
function ReplyField({ signedInEmail, email, onChange, disabled }: {
    signedInEmail: string | null;
    email: string;
    onChange: (email: string) => void;
    disabled: boolean;
}) {
    if (signedInEmail !== null) {
        return (
            <p className="m-0 text-xs text-fg-3" data-testid="feedback-signed-in-as">
                Sending as <span className="text-fg">{signedInEmail}</span>
            </p>
        );
    }
    return (
        <div>
            <label htmlFor="kc-feedback-email" className={labelClass}>
                Reply email <span className="font-normal text-fg-3">(optional)</span>
            </label>
            <input
                id="kc-feedback-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(ev) => onChange(ev.target.value)}
                disabled={disabled}
                placeholder="you@example.com"
                className={fieldClass}
            />
        </div>
    );
}

/** Hidden from people, filled by bots. The server drops any submission that sets it. */
function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 0, height: 0, overflow: 'hidden' }}>
            <label htmlFor="kc-feedback-website">Website</label>
            <input
                id="kc-feedback-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={value}
                onChange={(ev) => onChange(ev.target.value)}
            />
        </div>
    );
}

/**
 * Overlay + panel + title bar. Portaled to <body>: the header is a
 * `bar-scroll-x` container whose overflow clip would otherwise hide the
 * overlay (same reason as UserMenu).
 */
function DialogFrame({ onDismiss, busy, children }: {
    onDismiss: () => void;
    busy: boolean;
    children: ReactNode;
}) {
    const titleId = useId();
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) onDismiss();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [busy, onDismiss]);

    const frame = (
        <div
            data-theme="dark"
            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
            role="presentation"
            onClick={onDismiss}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                data-testid="feedback-dialog"
                className="w-full sm:w-[min(440px,94vw)] max-h-full overflow-y-auto bg-surface-2 border border-border rounded-t-lg sm:rounded-lg shadow-2xl text-fg"
                onClick={(ev) => ev.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h2 id={titleId} className="m-0 text-sm font-semibold">Send feedback</h2>
                    <button
                        type="button"
                        onClick={onDismiss}
                        disabled={busy}
                        aria-label="Close"
                        className="text-fg-3 hover:text-white text-lg leading-none px-1 disabled:opacity-40"
                    >
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
    return createPortal(frame, document.body);
}

function FeedbackDialog({ onClose, submitFeedback = postFeedback }: Omit<FeedbackModalProps, 'open'>) {
    const { session } = useOptionalSession();
    const signedInEmail = session?.user.email ?? '';

    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [category, setCategory] = useState<FeedbackCategory>('general');
    const [honeypot, setHoneypot] = useState('');
    const [phase, setPhase] = useState<Phase>('form');
    const [error, setError] = useState<string | null>(null);
    const messageRef = useRef<HTMLTextAreaElement>(null);
    const busy = phase === 'submitting';

    useEffect(() => {
        messageRef.current?.focus();
    }, []);

    const close = () => {
        if (!busy) onClose();
    };

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (busy) return;
        setError(null);
        setPhase('submitting');
        const payload: FeedbackPayload = {
            message: message.trim(),
            category,
            email: session ? undefined : email.trim() || undefined,
            userId: session?.user.id,
            userEmail: signedInEmail || undefined,
            path: window.location.pathname,
            appVersion: appVersion(),
            honeypot,
        };
        try {
            await submitFeedback(payload);
            setPhase('success');
        } catch (err) {
            setPhase('error');
            setError(err instanceof Error ? err.message : String(err));
        }
    }

    if (phase === 'success') {
        return (
            <DialogFrame onDismiss={onClose} busy={false}>
                <div className="px-4 py-5 flex flex-col gap-4">
                    <p className="m-0 text-sm" role="status">Thanks. Your feedback was sent to the kernelCAD team.</p>
                    <button type="button" onClick={onClose} className={`self-end ${primaryButton}`}>
                        Close
                    </button>
                </div>
            </DialogFrame>
        );
    }

    return (
        <DialogFrame onDismiss={close} busy={busy}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 py-4">
                <p className="m-0 text-xs text-fg-3">
                    What worked, what broke, what you want next. Anything helps.
                </p>

                <CategoryField value={category} onChange={setCategory} disabled={busy} />

                <div>
                    <label htmlFor="kc-feedback-message" className={labelClass}>Message</label>
                    <textarea
                        id="kc-feedback-message"
                        ref={messageRef}
                        required
                        minLength={MESSAGE_MIN}
                        maxLength={MESSAGE_MAX}
                        rows={5}
                        value={message}
                        onChange={(ev) => setMessage(ev.target.value)}
                        disabled={busy}
                        placeholder={CATEGORY_PLACEHOLDER[category]}
                        className={`${fieldClass} resize-y min-h-[100px]`}
                    />
                </div>

                <ReplyField signedInEmail={session ? signedInEmail || 'your account' : null} email={email} onChange={setEmail} disabled={busy} />
                <Honeypot value={honeypot} onChange={setHoneypot} />

                {error && <p className="m-0 text-xs text-red-400" role="alert">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={close} disabled={busy} className={secondaryButton}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy || message.trim().length < MESSAGE_MIN}
                        className={primaryButton}
                    >
                        {busy ? 'Sending…' : 'Send'}
                    </button>
                </div>
            </form>
        </DialogFrame>
    );
}
