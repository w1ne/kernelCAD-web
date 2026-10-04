// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// "Send feedback" opens from the account menu, the signed-out account slot and
// the command palette. They all ask the one mounted `FeedbackHost` to open.

type Listener = () => void;

const listeners = new Set<Listener>();

/** Open the feedback dialog. Does nothing when no `FeedbackHost` is mounted. */
export function openFeedback(): void {
    for (const listener of listeners) listener();
}

export function subscribeFeedbackRequests(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
