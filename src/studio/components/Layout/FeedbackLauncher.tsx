// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { FeedbackModal, type FeedbackModalProps } from './FeedbackModal';
import type { FeedbackContext } from './feedbackApi';

/**
 * A "Feedback" text button that opens the feedback dialog itself, for pages
 * with no Studio header to host it (the ChatGPT viewer, the /p/<slug> page).
 * The dialog is a React portal in this document: no window.open, no alert,
 * so it works inside an iframe.
 */
export function FeedbackLauncher({ context, className, label = 'Feedback', submitFeedback }: {
    context: FeedbackContext;
    className?: string;
    label?: string;
    submitFeedback?: FeedbackModalProps['submitFeedback'];
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={className}
                data-testid="feedback-launcher"
            >
                {label}
            </button>
            <FeedbackModal open={open} onClose={() => setOpen(false)} context={context} submitFeedback={submitFeedback} />
        </>
    );
}
