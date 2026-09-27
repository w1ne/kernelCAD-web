// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

/**
 * Header control that opens the in-app feedback form. Always visible, not
 * buried in the account menu. The label is hidden on narrow viewports.
 */
export function FeedbackButton() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Send feedback"
                title="Send feedback"
                data-testid="feedback-button"
                className="inline-flex items-center gap-1.5 rounded bg-[#222] hover:bg-[#333] text-gray-300 hover:text-white px-2 py-1 text-xs font-medium transition-colors"
            >
                <MessageSquare size={13} aria-hidden />
                <span className="hidden sm:inline">Feedback</span>
            </button>
            <FeedbackModal open={open} onClose={() => setOpen(false)} />
        </>
    );
}
