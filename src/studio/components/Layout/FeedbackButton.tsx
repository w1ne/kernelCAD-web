// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { IconButton } from '../../../ui/IconButton';
import { FeedbackModal } from './FeedbackModal';
import { openFeedback, subscribeFeedbackRequests } from './feedbackRequests';

/**
 * Owns the feedback dialog. Mount it once, in the Header; the account menu,
 * the signed-out account slot and the palette open it with `openFeedback()`.
 */
export function FeedbackHost() {
    const [open, setOpen] = useState(false);
    useEffect(() => subscribeFeedbackRequests(() => setOpen(true)), []);
    return <FeedbackModal open={open} onClose={() => setOpen(false)} />;
}

/** Icon control for the account slot when there is no account menu to hold
 *  "Send feedback" (signed out, or auth not configured). */
export function FeedbackButton() {
    return (
        <IconButton
            label="Send feedback"
            icon={<MessageSquare className="size-4" strokeWidth={1.75} />}
            size="sm"
            tooltipSide="bottom"
            onClick={openFeedback}
            className="max-md:size-touch"
            data-testid="feedback-button"
        />
    );
}
