// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Client side of the Studio feedback form: payload shape and the POST to the
// kernelcad.com Pages Function (site/functions/api/feedback.ts). Kept out of
// FeedbackModal.tsx so that file exports only components (fast refresh).

export const FEEDBACK_CATEGORIES = ['general', 'bug', 'idea', 'modeling'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_ENDPOINT =
    import.meta.env.VITE_FEEDBACK_URL || 'https://kernelcad.com/api/feedback';

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 4000;

/** Where the feedback was sent from. The server keeps it next to the message. */
export interface FeedbackContext {
    /** `chatgpt` (the widget viewer), `embed` or `project` (the /p/<slug> page). */
    surface: string;
    slug?: string;
    revision?: number | null;
}

export interface FeedbackPayload {
    message: string;
    category: FeedbackCategory;
    email?: string;
    userId?: string;
    userEmail?: string;
    path: string;
    appVersion: string;
    honeypot: string;
    surface?: string;
    slug?: string;
    revision?: number;
    /** The full address of the page, for the surface the user was on. */
    url?: string;
}

/** The context fields of a payload; empty for the Studio's own form. */
export function contextFields(context: FeedbackContext | undefined): Partial<FeedbackPayload> {
    if (!context) return {};
    return {
        surface: context.surface,
        ...(context.slug ? { slug: context.slug } : {}),
        ...(typeof context.revision === 'number' ? { revision: context.revision } : {}),
        url: window.location.href,
    };
}

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
