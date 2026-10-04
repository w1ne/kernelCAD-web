// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The Studio panes' shared hooks: which panes a visitor gets, the agent
// access, the palette entries and the prompt kept through sign-in. The
// desktop activity bar and the phone tab bar both use them.
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { FolderOpen, Layers, Sparkles } from 'lucide-react';
import { inAppAgentEnabled } from '../agentAvailability';
import { shellStore } from '../store/useShellStore';
import { useRegisterCommands, type Command } from './useCommandRegistry';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import { isAuthConfigured } from '../../funnel/lib/supabaseClient';
import { agentAccess, takePendingAgentPrompt, type AgentAccess, type LeftPaneId } from '../activityBarModel';

const ICON = { className: 'size-5', strokeWidth: 1.75 } as const;

export interface ActivityItem {
    id: LeftPaneId;
    label: string;
    icon: ReactNode;
    /** The Agent keeps its copper colour: it is the only AI surface. */
    agent?: boolean;
}

export const PANE_TITLE: Record<LeftPaneId, string> = { agent: 'Agent', tree: 'Model tree', projects: 'Projects' };

/** Palette entries for the bar, so every pane opens from ⌘K as well. */
export function useActivityCommands(items: readonly ActivityItem[], open: (id: LeftPaneId) => void, enableConnect: boolean, signedIn: boolean) {
    const commands = useMemo<Command[]>(() => {
        const list: Command[] = items.map((item) => ({
            id: `panels.left.${item.id}`,
            label: item.id === 'agent' ? 'Open the agent' : `Show ${PANE_TITLE[item.id].toLowerCase()} pane`,
            section: 'Panels',
            keywords: item.id === 'agent' ? ['ai', 'generate', 'prompt', 'chat'] : ['left', 'sidebar', 'pane'],
            action: () => open(item.id),
        }));
        if (enableConnect) {
            list.push({
                id: 'nav.connect',
                label: 'Connect your own agent',
                description: 'Use kernelCAD from your assistant over MCP',
                section: 'Navigation',
                keywords: ['mcp', 'claude', 'chatgpt', 'cursor', 'integration'],
                action: () => window.location.assign('/connect'),
            });
        }
        if (signedIn) {
            list.push({
                id: 'nav.my-projects',
                label: 'Your saved projects',
                section: 'Navigation',
                keywords: ['me', 'my designs', 'account'],
                action: () => window.location.assign('/me'),
            });
        }
        return list;
    }, [items, open, enableConnect, signedIn]);
    useRegisterCommands(commands);
}

/** After sign-in, put the prompt picked on the sign-in card into the composer.
 *  `onPrompt` lets a shell show the agent its own way (the phone's sheet). */
export function usePendingPrompt(access: AgentAccess, onPrompt?: () => void): void {
    const onPromptRef = useRef(onPrompt);
    useEffect(() => {
        onPromptRef.current = onPrompt;
    });
    useEffect(() => {
        if (access !== 'ready') return;
        const prompt = takePendingAgentPrompt();
        if (!prompt) return;
        shellStore.setAgentDraftPrompt(prompt);
        shellStore.setAgentRailOpen(true);
        onPromptRef.current?.();
    }, [access]);
}

/** What the Agent pane offers this visitor, and whether they are signed in. */
export function useAgentAccess(): { access: AgentAccess; signedIn: boolean } {
    const { session, loading } = useOptionalSession();
    const access = agentAccess({
        inAppAgent: inAppAgentEnabled(),
        authConfigured: isAuthConfigured(),
        sessionLoading: loading,
        signedIn: !!session,
    });
    return { access, signedIn: !!session };
}

/** The panes this host and route offer, in bar order. */
export function useActivityItems(showAgent: boolean, viewerMode: boolean): ActivityItem[] {
    return useMemo<ActivityItem[]>(() => [
        ...(showAgent ? [{ id: 'agent' as const, label: 'Agent', icon: <Sparkles {...ICON} />, agent: true }] : []),
        { id: 'tree', label: 'Model tree', icon: <Layers {...ICON} /> },
        ...(viewerMode ? [] : [{ id: 'projects' as const, label: 'Projects', icon: <FolderOpen {...ICON} /> }]),
    ], [showAgent, viewerMode]);
}
