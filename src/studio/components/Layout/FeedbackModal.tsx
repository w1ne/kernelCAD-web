// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useOptionalSession } from '../../../funnel/hooks/useSession';

/**
 * In-app product feedback form. Posts to the kernelcad.com Pages Function
 * `POST /api/feedback` (site/functions/api/feedback.ts), which stores every
 * submission in D1. The Studio runs on app.kernelcad.com, so the call is
 * cross-origin; the function allows this origin via CORS.
 */

export const FEEDBACK_CATEGORIES = ['general', 'bug', 'idea', 'modeling'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_ENDPOINT =
    import.meta.env.VITE_FEEDBACK_URL || 'https://kernelcad.com/api/feedback';

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 4000;

export interface FeedbackPayload {
    message: string;
    category: FeedbackCategory;
    email?: string;
    userId?: string;
    userEmail?: string;
    path: string;
    appVersion: string;
    honeypot: string;
}

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

export function appVersion(): string {
    const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
    const commit = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '';
    return commit ? `${version}+${commit}` : version;
}

export async function postFeedback(payload: FeedbackPayload): Promise<void> {
    const res = await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (res.ok) return; // 200, or 204 for the honeypot
    let code = `HTTP ${res.status}`;
    try {
        const body = (await res.json()) as { error?: string };
        if (body.error) code = body.error;
    } catch {
        // non-JSON error body
    }
    if (res.status === 429) throw new Error('Too many submissions. Try again later.');
    if (code === 'message_too_short') throw new Error('Please write a bit more detail.');
    if (code === 'invalid_email') throw new Error('The reply email is not valid.');
    throw new Error(`Could not send feedback (${code}).`);
}

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
    'w-full rounded bg-[#111] border border-[#333] px-2.5 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 outline-none focus:border-blue-500';
const labelClass = 'block text-xs font-medium text-gray-400 mb-1';
const secondaryButton =
    'rounded px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#222] border border-[#333] disabled:opacity-40';
const primaryButton =
    'rounded px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50';

function FeedbackDialog({ onClose, submitFeedback = postFeedback }: Omit<FeedbackModalProps, 'open'>) {
    const titleId = useId();
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

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [busy, onClose]);

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

    const dialog = (
        <div
            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
            role="presentation"
            onClick={close}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                data-testid="feedback-dialog"
                className="w-full sm:w-[min(440px,94vw)] max-h-full overflow-y-auto bg-[#1a1a1a] border border-[#333] rounded-t-lg sm:rounded-lg shadow-2xl text-gray-200"
                onClick={(ev) => ev.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
                    <h2 id={titleId} className="m-0 text-sm font-semibold">Send feedback</h2>
                    <button
                        type="button"
                        onClick={close}
                        disabled={busy}
                        aria-label="Close"
                        className="text-gray-500 hover:text-white text-lg leading-none px-1 disabled:opacity-40"
                    >
                        ×
                    </button>
                </div>

                {phase === 'success' ? (
                    <div className="px-4 py-5 flex flex-col gap-4">
                        <p className="m-0 text-sm" role="status">Thanks. Your feedback was sent to the kernelCAD team.</p>
                        <button type="button" onClick={onClose} className={`self-end ${primaryButton}`}>
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 py-4">
                        <p className="m-0 text-xs text-gray-500">
                            What worked, what broke, what you want next. Anything helps.
                        </p>

                        <div>
                            <label htmlFor="kc-feedback-category" className={labelClass}>Category</label>
                            <select
                                id="kc-feedback-category"
                                value={category}
                                onChange={(ev) => setCategory(ev.target.value as FeedbackCategory)}
                                disabled={busy}
                                className={fieldClass}
                            >
                                {FEEDBACK_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                                ))}
                            </select>
                        </div>

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

                        {session ? (
                            <p className="m-0 text-xs text-gray-500" data-testid="feedback-signed-in-as">
                                Sending as <span className="text-gray-300">{signedInEmail || 'your account'}</span>
                            </p>
                        ) : (
                            <div>
                                <label htmlFor="kc-feedback-email" className={labelClass}>
                                    Reply email <span className="font-normal text-gray-600">(optional)</span>
                                </label>
                                <input
                                    id="kc-feedback-email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(ev) => setEmail(ev.target.value)}
                                    disabled={busy}
                                    placeholder="you@example.com"
                                    className={fieldClass}
                                />
                            </div>
                        )}

                        {/* Honeypot: hidden from people, filled by bots. */}
                        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 0, height: 0, overflow: 'hidden' }}>
                            <label htmlFor="kc-feedback-website">Website</label>
                            <input
                                id="kc-feedback-website"
                                name="website"
                                type="text"
                                tabIndex={-1}
                                autoComplete="off"
                                value={honeypot}
                                onChange={(ev) => setHoneypot(ev.target.value)}
                            />
                        </div>

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
                )}
            </div>
        </div>
    );

    // Portal to <body>: the header is a `bar-scroll-x` container whose overflow
    // clip would otherwise hide the overlay (same reason as UserMenu).
    return createPortal(dialog, document.body);
}
