// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// What an empty viewport offers: open a starter, describe a part to the
// agent, or connect your own agent. Recent projects sit below, so a
// returning user goes back to their work in one click.
import { useMemo, useState, type JSX } from 'react';
import { ArrowRight, Box, FolderOpen, Plug, Sparkles } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useWorkbench } from '../context/WorkbenchContext';
import { shellStore } from '../store/shellStore';
import { globalCommandRegistry } from '../hooks/useCommandRegistry';
import { relativeTime } from '../components/projectCardModel';
import { inAppAgentEnabled } from '../agentAvailability';
import { isAuthConfigured } from '../../funnel/lib/supabaseClient';
import { buttonClass, cx } from '../../ui';
import { STARTERS, starterSizeLabel, studioStarterCode, type StarterModel } from './starterModels';

const RECENT_LIMIT = 3;

/** Open the agent pane through the palette's command, then put the cursor
 *  in it: the composer when signed in, the sign-in action otherwise. */
function openAgent(): void {
    if (!globalCommandRegistry.run('panels.left.agent')) shellStore.setAgentRailOpen(true);
    requestAnimationFrame(() => {
        document
            .querySelector<HTMLElement>([
                // The desktop left pane, or the phone's agent sheet.
                '#studio-left-pane textarea', '#studio-left-pane [data-testid="agent-sign-in"]',
                '[data-testid="mobile-sheet-agent"] textarea', '[data-testid="mobile-sheet-agent"] [data-testid="agent-sign-in"]',
            ].join(', '))
            ?.focus();
    });
}

function SectionLabel({ id, children }: { id: string; children: string }): JSX.Element {
    return <h3 id={id} className="mb-2 text-2xs font-medium uppercase tracking-wider text-fg-3">{children}</h3>;
}

function StarterTile({ model, onPick }: { model: StarterModel; onPick: (model: StarterModel) => void }): JSX.Element {
    return (
        <button
            type="button"
            onClick={() => onPick(model)}
            data-testid={`empty-starter-${model.id}`}
            className={cx(
                'focus-ring group flex h-full w-full flex-col items-start gap-1 rounded-panel border border-border bg-surface-2 p-3 text-left',
                'transition-colors duration-80 hover:border-accent hover:bg-surface-3 max-sm:min-h-touch max-sm:flex-row max-sm:items-center max-sm:gap-3 max-sm:py-2',
            )}
        >
            <Box className="size-5 shrink-0 text-fg-3 group-hover:text-accent" strokeWidth={1.75} aria-hidden="true" />
            <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-ui font-medium text-fg">{model.name}</span>
                <span className="text-2xs text-fg-2 max-sm:hidden">{model.summary}</span>
                <span className="font-mono text-2xs text-fg-3">{starterSizeLabel(model)}</span>
            </span>
        </button>
    );
}

export interface StudioEmptyStateProps {
    /** The host offers the in-Studio agent (embed hosts do not). */
    readonly enableAgent: boolean;
    /** The host may link to /connect (the standalone app only). */
    readonly enableConnect: boolean;
}

export function StudioEmptyState({ enableAgent, enableConnect }: StudioEmptyStateProps): JSX.Element {
    const { projects, activeProjectId, openProject, createProject, saveActiveProject } = useProject();
    const { code } = useWorkbench();
    const [message, setMessage] = useState('');
    const recent = useMemo(
        () => projects
            .filter((p) => p.id !== activeProjectId)
            .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
            .slice(0, RECENT_LIMIT),
        [projects, activeProjectId],
    );
    // The hosted agent runs only where it is deployed; elsewhere the pane can
    // only say it is off, so the empty state points at "connect" instead.
    const agentHere = enableAgent && inAppAgentEnabled() && isAuthConfigured();

    const start = (model: StarterModel) => {
        // Keep pending editor edits before switching to the new project.
        saveActiveProject({ code });
        createProject(model.name, studioStarterCode(model));
        shellStore.setInspectorOpen(true);
        setMessage(`${model.name} is open. Change sizes in Params; download with Export.`);
    };

    return (
        <section
            aria-labelledby="studio-empty-title"
            data-testid="studio-empty-state"
            className={cx(
                'pointer-events-auto flex max-h-full w-[min(480px,100%)] flex-col gap-5 overflow-y-auto rounded-sheet border border-border',
                'bg-surface-1 p-5 text-fg shadow-e2 motion-safe:animate-pop-in max-sm:gap-4 max-sm:p-4',
            )}
        >
            <div>
                <h2 id="studio-empty-title" className="text-title text-fg">Start a model</h2>
                <p className="mt-1 text-ui text-fg-2">
                    This project has no geometry yet. Open a starter to edit, or have an agent write the model for you.
                </p>
            </div>

            {agentHere && (
                <button
                    type="button"
                    onClick={openAgent}
                    data-testid="empty-describe"
                    className={cx(
                        'focus-ring flex w-full items-center gap-3 rounded-panel border border-agent/60 bg-agent-soft px-3 py-2.5 text-left',
                        'transition-colors duration-80 hover:border-agent max-sm:min-h-touch',
                    )}
                >
                    <Sparkles className="size-5 shrink-0 text-agent-fg" strokeWidth={1.75} aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-ui font-medium text-fg">Describe a part to the agent</span>
                        <span className="text-2xs text-fg-2">It writes the code, checks the geometry and shows you the change.</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden="true" />
                </button>
            )}

            <section aria-labelledby="studio-empty-starters">
                <SectionLabel id="studio-empty-starters">Start from a starter</SectionLabel>
                <ul className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
                    {STARTERS.map((model) => (
                        <li key={model.id}><StarterTile model={model} onPick={start} /></li>
                    ))}
                </ul>
                <p role="status" className="mt-2 text-2xs text-fg-3 empty:hidden">{message}</p>
            </section>

            {enableConnect && (
                <div className="flex items-center gap-3 border-t border-border pt-4 max-sm:flex-col max-sm:items-stretch">
                    <p className="min-w-0 flex-1 text-ui text-fg-2">
                        <span className="font-medium text-fg">Or use your own agent.</span>{' '}
                        Connect the kernelCAD MCP server; it builds and checks models here.
                    </p>
                    <a
                        href="/connect"
                        data-testid="empty-connect"
                        className={cx(buttonClass('secondary', 'md'), 'shrink-0 no-underline max-sm:h-touch')}
                    >
                        <Plug className="size-4" strokeWidth={1.75} aria-hidden="true" />
                        Connect your agent
                    </a>
                </div>
            )}

            {recent.length > 0 && (
                <section aria-labelledby="studio-empty-recent" className="border-t border-border pt-4">
                    <SectionLabel id="studio-empty-recent">Your recent projects</SectionLabel>
                    <ul className="-mx-2 flex flex-col">
                        {recent.map((p) => (
                            <li key={p.id}>
                                <button
                                    type="button"
                                    onClick={() => openProject(p.id)}
                                    className="focus-ring flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-ui text-fg-2 transition-colors duration-80 hover:bg-surface-2 hover:text-fg max-sm:min-h-touch"
                                >
                                    <FolderOpen className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">{p.name || 'Untitled Project'}</span>
                                    <span className="shrink-0 text-2xs text-fg-3">{relativeTime(p.lastUpdated)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </section>
    );
}
