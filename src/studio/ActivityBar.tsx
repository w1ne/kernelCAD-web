// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The Studio's left activity bar (44 px of icons) and the one left pane it
// opens: Agent, Model tree or Projects. The Agent is always on the bar. When
// the agent cannot run for this visitor, its pane says why and what to do
// (sign in, or connect your own agent) instead of hiding the feature.
import { useCallback, useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';
import { FilePlus, FolderOpen, Layers, Plug, Sparkles, X } from 'lucide-react';
import { AgentRail } from './AgentRail';
import { inAppAgentEnabled } from './agentAvailability';
import { SceneTab } from './tabs/SceneTab';
import { useProject } from './context/ProjectContext';
import { useWorkbench } from './context/WorkbenchContext';
import { useShellStore, shellStore } from './store/useShellStore';
import { useIsNarrow } from './hooks/useIsNarrow';
import { useRegisterCommands, type Command } from './hooks/useCommandRegistry';
import { STARTERS, studioStarterCode, type StarterModel } from './start/starterModels';
import { relativeTime } from './components/projectCardModel';
import { buttonClass } from '../ui/buttonStyles';
import { cx } from '../ui/cx';
import { Tooltip } from '../ui/Tooltip';
import { useOptionalSession } from '../funnel/hooks/useSession';
import { isAuthConfigured } from '../funnel/lib/supabaseClient';
import {
    AGENT_STARTER_PROMPTS, agentAccess, savePendingAgentPrompt, takePendingAgentPrompt,
    type AgentAccess, type LeftPaneId,
} from './activityBarModel';

function signInHref(): string {
    return `/signin?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;
}

const ICON = { className: 'size-5', strokeWidth: 1.75 } as const;

interface ActivityItem {
    id: LeftPaneId;
    label: string;
    icon: ReactNode;
    /** The Agent keeps its copper colour: it is the only AI surface. */
    agent?: boolean;
}

function RailButton({ item, active, onToggle }: {
    item: ActivityItem;
    active: boolean;
    onToggle: (id: LeftPaneId) => void;
}): JSX.Element {
    return (
        <Tooltip label={item.label} side="right" describe={false}>
            <button
                type="button"
                aria-label={item.label}
                aria-pressed={active}
                aria-controls={active ? 'studio-left-pane' : undefined}
                onClick={() => onToggle(item.id)}
                data-testid={`activity-${item.id}`}
                className={cx(
                    'focus-ring relative flex size-touch items-center justify-center rounded-control transition-colors duration-80',
                    item.agent ? 'text-agent-fg hover:bg-agent-soft' : 'text-fg-3 hover:bg-surface-2 hover:text-fg',
                    active && (item.agent ? 'bg-agent-soft' : 'bg-surface-3 text-fg'),
                )}
            >
                {active && (
                    <span aria-hidden="true" className={cx('absolute inset-y-2 left-0 w-0.5 rounded-full', item.agent ? 'bg-agent' : 'bg-accent')} />
                )}
                <span aria-hidden="true" className="inline-flex">{item.icon}</span>
            </button>
        </Tooltip>
    );
}

function PaneHeader({ title, onClose }: { title: string; onClose: () => void }): JSX.Element {
    return (
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border pl-3 pr-1">
            <h2 className="text-2xs font-semibold uppercase tracking-wider text-fg-2">{title}</h2>
            <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title.toLowerCase()}`}
                className={cx(buttonClass('ghost', 'sm'), 'size-control-sm px-0 max-md:size-touch')}
            >
                <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
        </div>
    );
}

function ConnectOwnAgent({ enableConnect }: { enableConnect: boolean }): JSX.Element | null {
    if (!enableConnect) return null;
    return (
        <div className="rounded-panel border border-border p-3">
            <p className="text-ui font-medium text-fg">Use your own agent</p>
            <p className="mt-1 text-ui text-fg-2">
                Connect the kernelCAD MCP server to the assistant you already use. It builds and checks models here.
            </p>
            <a href="/connect" className={cx(buttonClass('secondary', 'sm'), 'mt-3 no-underline')}>
                <Plug className="size-4" strokeWidth={1.75} aria-hidden="true" />
                Connect your agent
            </a>
        </div>
    );
}

/** Signed out: what the agent does, three prompts to start from, one sign-in. */
function AgentSignInCard({ enableConnect }: { enableConnect: boolean }): JSX.Element {
    const startWith = (prompt: string) => {
        savePendingAgentPrompt(prompt);
        window.location.assign(signInHref());
    };
    return (
        <div className="flex flex-col gap-4 p-3" data-testid="agent-sign-in-card">
            <div>
                <div className="flex items-center gap-2 text-agent-fg">
                    <Sparkles className="size-4" strokeWidth={1.75} aria-hidden="true" />
                    <p className="text-body font-medium text-fg">Describe a part</p>
                </div>
                <p className="mt-1 text-ui text-fg-2">
                    The agent writes the model code, checks the geometry, and shows you the change before it is applied.
                </p>
            </div>
            <div className="flex flex-col gap-1.5">
                <p className="text-2xs font-medium uppercase tracking-wider text-fg-3">Start from</p>
                {AGENT_STARTER_PROMPTS.map((prompt) => (
                    <button
                        key={prompt}
                        type="button"
                        onClick={() => startWith(prompt)}
                        className="focus-ring rounded-control border border-border bg-surface-2 px-2.5 py-2 text-left text-ui text-fg-2 transition-colors duration-80 hover:border-agent hover:text-fg"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
            <a href={signInHref()} className={cx(buttonClass('agent', 'md'), 'no-underline')} data-testid="agent-sign-in">
                Sign in to use the agent
            </a>
            <p className="-mt-2 text-2xs text-fg-3">Free to start. Your prompt is kept.</p>
            <ConnectOwnAgent enableConnect={enableConnect} />
        </div>
    );
}

function AgentUnavailableCard({ enableConnect }: { enableConnect: boolean }): JSX.Element {
    return (
        <div className="flex flex-col gap-4 p-3" data-testid="agent-unavailable-card">
            <div>
                <p className="text-body font-medium text-fg">The built-in agent is off here</p>
                <p className="mt-1 text-ui text-fg-2">It runs in the hosted Studio at app.kernelcad.com.</p>
            </div>
            <ConnectOwnAgent enableConnect={enableConnect} />
        </div>
    );
}

function AgentPane({ access, enableConnect }: { access: AgentAccess; enableConnect: boolean }): JSX.Element | null {
    if (access === 'ready') {
        // AgentRail sizes itself: 360 px and resizable, full width on a phone.
        return <div className="flex min-h-0 flex-1 flex-col"><AgentRail /></div>;
    }
    if (access === 'loading') {
        return <div role="status" aria-live="polite" className="p-3 text-ui text-fg-3">Checking your session…</div>;
    }
    return (
        <div className="min-h-0 flex-1 overflow-y-auto">
            {access === 'sign-in'
                ? <AgentSignInCard enableConnect={enableConnect} />
                : <AgentUnavailableCard enableConnect={enableConnect} />}
        </div>
    );
}

/** Deep-linked sources (?script, ?gallery, ?headless) keep their model; no starters there. */
function hasSourceLink(): boolean {
    const search = new URLSearchParams(window.location.search);
    return ['script', 'gallery', 'headless'].some((key) => search.has(key));
}

const RECENT_LIMIT = 8;

function ProjectsPane({ signedIn }: { signedIn: boolean }): JSX.Element {
    const { projects, activeProjectId, openProject, createProject, saveActiveProject } = useProject();
    const { code, setActiveDialog } = useWorkbench();
    const [message, setMessage] = useState('');
    const recent = useMemo(
        () => [...projects].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)).slice(0, RECENT_LIMIT),
        [projects],
    );
    const start = (model: StarterModel) => {
        // Keep pending editor edits before switching to the new project.
        saveActiveProject({ code });
        createProject(model.name, studioStarterCode(model));
        shellStore.setInspectorOpen(true);
        setMessage(`${model.name} is open. Change sizes in Params; download with Export.`);
    };
    const itemClass = 'focus-ring flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-ui transition-colors duration-80 hover:bg-surface-2';

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3" data-testid="projects-pane">
            <section aria-labelledby="projects-recent">
                <h3 id="projects-recent" className="mb-1 text-2xs font-medium uppercase tracking-wider text-fg-3">On this device</h3>
                {recent.length === 0 ? (
                    <p className="px-2 py-1.5 text-ui text-fg-3">No saved projects yet.</p>
                ) : (
                    <ul className="flex flex-col">
                        {recent.map((p) => {
                            const current = p.id === activeProjectId;
                            return (
                                <li key={p.id}>
                                    <button
                                        type="button"
                                        onClick={() => { if (!current) openProject(p.id); }}
                                        aria-current={current ? 'true' : undefined}
                                        className={cx(itemClass, current ? 'bg-surface-3 text-fg' : 'text-fg-2')}
                                    >
                                        <FolderOpen className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden="true" />
                                        <span className="min-w-0 flex-1 truncate">{p.name || 'Untitled Project'}</span>
                                        <span className="shrink-0 text-2xs text-fg-3">{relativeTime(p.lastUpdated)}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setActiveDialog('projectManager')} className={buttonClass('secondary', 'sm')}>
                        Manage projects…
                    </button>
                    {signedIn && (
                        <a href="/me" data-testid="toolbar-my-designs" className={cx(buttonClass('ghost', 'sm'), 'no-underline')}>
                            Your saved projects
                        </a>
                    )}
                </div>
            </section>
            {!hasSourceLink() && (
                <section aria-labelledby="projects-starters">
                    <h3 id="projects-starters" className="mb-1 text-2xs font-medium uppercase tracking-wider text-fg-3">New from a starter</h3>
                    <ul className="flex flex-col">
                        {STARTERS.map((model) => (
                            <li key={model.id}>
                                <button type="button" onClick={() => start(model)} className={cx(itemClass, 'text-fg-2')}>
                                    <FilePlus className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden="true" />
                                    {model.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <p role="status" className="mt-1 px-2 text-2xs text-fg-3">{message}</p>
                </section>
            )}
        </div>
    );
}

export interface ActivityBarProps {
    /** The host allows the in-Studio agent (embed hosts pass false). */
    enableAgent: boolean;
    /** The host allows links to /connect (the standalone app only). */
    enableConnect: boolean;
    /** Read-only review page: no agent, no project switching. */
    viewerMode: boolean;
}

const PANE_TITLE: Record<LeftPaneId, string> = { agent: 'Agent', tree: 'Model tree', projects: 'Projects' };

/** The pane state: the Agent pane follows the persisted `agentRailOpen`;
 *  the other panes are per visit. One pane is open at a time. */
function useLeftPane(showAgent: boolean) {
    const { agentRailOpen } = useShellStore();
    const [otherPane, setOtherPane] = useState<Exclude<LeftPaneId, 'agent'> | null>(null);
    const active: LeftPaneId | null = showAgent && agentRailOpen ? 'agent' : otherPane;
    const open = useCallback((id: LeftPaneId) => {
        if (id === 'agent') {
            setOtherPane(null);
            shellStore.setAgentRailOpen(true);
        } else {
            shellStore.setAgentRailOpen(false);
            setOtherPane(id);
        }
    }, []);
    const close = useCallback(() => {
        shellStore.setAgentRailOpen(false);
        setOtherPane(null);
    }, []);
    return { active, open, close };
}

/** Palette entries for the bar, so every pane opens from ⌘K as well. */
function useActivityCommands(items: readonly ActivityItem[], open: (id: LeftPaneId) => void, enableConnect: boolean, signedIn: boolean) {
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

/** After sign-in, put the prompt picked on the sign-in card into the composer. */
function usePendingPrompt(access: AgentAccess): void {
    useEffect(() => {
        if (access !== 'ready') return;
        const prompt = takePendingAgentPrompt();
        if (!prompt) return;
        shellStore.setAgentDraftPrompt(prompt);
        shellStore.setAgentRailOpen(true);
    }, [access]);
}

export function ActivityBar({ enableAgent, enableConnect, viewerMode }: ActivityBarProps): JSX.Element {
    const { session, loading } = useOptionalSession();
    const showAgent = enableAgent && !viewerMode;
    const access = agentAccess({
        inAppAgent: inAppAgentEnabled(),
        authConfigured: isAuthConfigured(),
        sessionLoading: loading,
        signedIn: !!session,
    });
    usePendingPrompt(access);

    const items = useMemo<ActivityItem[]>(() => [
        ...(showAgent ? [{ id: 'agent' as const, label: 'Agent', icon: <Sparkles {...ICON} />, agent: true }] : []),
        { id: 'tree', label: 'Model tree', icon: <Layers {...ICON} /> },
        ...(viewerMode ? [] : [{ id: 'projects' as const, label: 'Projects', icon: <FolderOpen {...ICON} /> }]),
    ], [showAgent, viewerMode]);

    const { active, open, close } = useLeftPane(showAgent);
    useActivityCommands(items, open, enableConnect, !!session);

    // On a phone the pane covers the model, so it opens only on request,
    // never from the saved desktop state.
    const narrow = useIsNarrow();
    const [asked, setAsked] = useState(false);
    const shown = active !== null && (!narrow || asked) ? active : null;
    const toggle = (id: LeftPaneId) => {
        setAsked(true);
        if (shown === id) close();
        else open(id);
    };

    return (
        <>
            <nav
                aria-label="Studio panes"
                data-testid="activity-bar"
                className="flex w-rail shrink-0 flex-col items-center gap-1 border-r border-border bg-surface-1 py-1.5"
            >
                {items.map((item) => (
                    <RailButton key={item.id} item={item} active={shown === item.id} onToggle={toggle} />
                ))}
                {enableConnect && !viewerMode && (
                    <div className="mt-auto">
                        <Tooltip label="Connect your own agent" side="right" describe={false}>
                            <a
                                href="/connect"
                                aria-label="Connect your own agent"
                                data-testid="toolbar-connect-link"
                                className="focus-ring flex size-touch items-center justify-center rounded-control text-fg-3 transition-colors duration-80 hover:bg-surface-2 hover:text-fg"
                            >
                                <Plug {...ICON} aria-hidden="true" />
                            </a>
                        </Tooltip>
                    </div>
                )}
            </nav>
            {shown && (
                <section
                    id="studio-left-pane"
                    aria-label={PANE_TITLE[shown]}
                    data-testid={`left-pane-${shown}`}
                    className={cx(
                        'flex shrink-0 flex-col border-r border-border bg-surface-1 text-fg',
                        !narrow && (shown === 'agent' ? 'w-auto' : 'w-panel'),
                        // Phone: over the model, not beside it.
                        narrow && 'absolute inset-y-0 left-rail z-[1002] w-[min(320px,calc(100vw-44px))] shadow-e3',
                    )}
                >
                    <PaneHeader title={PANE_TITLE[shown]} onClose={close} />
                    {shown === 'agent' && <AgentPane access={access} enableConnect={enableConnect} />}
                    {shown === 'tree' && <div className="min-h-0 flex-1 overflow-y-auto"><SceneTab /></div>}
                    {shown === 'projects' && <ProjectsPane signedIn={!!session} />}
                </section>
            )}
        </>
    );
}
