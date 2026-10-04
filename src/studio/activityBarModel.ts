// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The activity bar's logic, kept apart from its components: which Agent
// pane a visitor gets, and the starter prompt kept through sign-in.

export type LeftPaneId = 'agent' | 'tree' | 'projects';

/**
 * What the Agent pane can offer this visitor:
 * - `ready`: signed in to the hosted app; the agent runs here.
 * - `sign-in`: the hosted agent exists, but only for a signed-in user.
 * - `unavailable`: no hosted agent in this deploy (local dev, flag off);
 *   the visitor can still connect their own agent.
 * - `loading`: the session is not known yet.
 */
export type AgentAccess = 'ready' | 'sign-in' | 'unavailable' | 'loading';

export function agentAccess(input: {
    inAppAgent: boolean;
    authConfigured: boolean;
    sessionLoading: boolean;
    signedIn: boolean;
}): AgentAccess {
    if (!input.inAppAgent || !input.authConfigured) return 'unavailable';
    if (input.signedIn) return 'ready';
    if (input.sessionLoading) return 'loading';
    return 'sign-in';
}

/** First prompts for a new visitor. Picking one keeps it through sign-in. */
export const AGENT_STARTER_PROMPTS: readonly string[] = [
    'A 60 × 40 mm wall bracket, 5 mm thick, with four M3 holes',
    'An enclosure for a 50 × 30 mm board with a snap-fit lid',
    'A 20-tooth spur gear, module 1, with a 5 mm bore',
];

const PENDING_PROMPT_KEY = 'kernelcad.agent.pendingPrompt';

/** Keep a prompt through the sign-in round trip. */
export function savePendingAgentPrompt(prompt: string): void {
    try {
        localStorage.setItem(PENDING_PROMPT_KEY, prompt);
    } catch {
        /* storage blocked: the prompt is lost, sign-in still works */
    }
}

/** The kept prompt, removed from storage. */
export function takePendingAgentPrompt(): string | null {
    try {
        const prompt = localStorage.getItem(PENDING_PROMPT_KEY);
        if (prompt !== null) localStorage.removeItem(PENDING_PROMPT_KEY);
        return prompt;
    } catch {
        return null;
    }
}
