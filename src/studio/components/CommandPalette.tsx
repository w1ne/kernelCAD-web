// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The ⌘K / Ctrl+K command palette. `CommandPaletteDialog` renders whatever is
// in the command registry, plus the user's recent saved projects; the
// `StudioCommandPalette` wiring registers the Studio's commands, binds the
// shortcuts and puts a "Search commands" trigger in the header.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type JSX, type KeyboardEvent } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Command as Cmdk } from 'cmdk';
import { ChevronLeft, History, RotateCw, Search } from 'lucide-react';
import { Kbd } from '../../ui/Kbd';
import { IconButton } from '../../ui/IconButton';
import { cx } from '../../ui/cx';
import { focusableIn, useFocusTrap } from '../../ui/useFocusTrap';
import type { Theme } from '../../ui/theme';
import {
    groupCommands,
    useCommandRegistry,
    useRegisterCommands,
    type Command,
} from '../hooks/useCommandRegistry';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useStudioCommandList, type StudioCommandActions, type StudioCommandState } from '../hooks/useStudioCommands';
import { inspectorTabRequests, viewTargetRequests } from '../hooks/studioNavigation';
import { COMPACT_HEADER_QUERY, useIsNarrow } from '../hooks/useIsNarrow';
import { useExportTask, type ExportTask } from '../hooks/useExportTask';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { KEYMAP, SHORTCUT_HELP, shortcutCombo } from '../../shared/constants/shortcuts';
import { useWorkbench } from '../context/WorkbenchContext';
import { useUI } from '../context/UIContext';
import { useProject } from '../context/ProjectContext';
import { useStudioChrome } from '../context/StudioChromeContext';
import { shellStore } from '../store/shellStore';
import { useShellStore } from '../store/useShellStore';
import { selectionCodeStore, useSelectionCodeState } from '../selectionCode/selectionCodeStore';
import { getVisibleTabs } from '../logic/adaptiveTabs';
import { downloadBlob, exportViaServer } from '../exportViaServer';
import { hasPlanarSource } from '../exportFormats';
import { captureViewerPngBase64 } from './viewer/captureViewerPng';
import { ExportStatus } from './Shared/ExportStatus';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import { listMyProjects } from '../../funnel/lib/apiClient';
import { rankCommands, uniqueValues } from './commandPaletteModel';
import { projectHref, relativeTime } from './projectCardModel';

export type PalettePage = 'commands' | 'shortcuts';

export interface RecentProjectItem {
    readonly id: string;
    readonly title: string;
    /** e.g. "Updated 3 h ago". */
    readonly detail: string;
    readonly onOpen: () => void;
}

/** The recent saved projects, loaded when the palette opens. */
export type RecentProjects =
    | { readonly status: 'hidden' }
    | { readonly status: 'loading' }
    | { readonly status: 'error'; readonly retry: () => void }
    | { readonly status: 'ready'; readonly items: readonly RecentProjectItem[] };

export interface CommandPaletteDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly commands: readonly Command[];
    readonly recent?: RecentProjects;
    readonly page: PalettePage;
    readonly onPageChange: (page: PalettePage) => void;
    /** The Studio workbench is dark; public pages pass 'light'. */
    readonly theme?: Theme;
}

const ITEM_CLASS = cx(
    'group flex min-h-touch cursor-pointer select-none items-center gap-3 rounded-control px-2.5 text-ui text-fg-2 sm:min-h-9',
    'data-[selected=true]:bg-accent-soft data-[selected=true]:text-fg',
    'data-[disabled=true]:cursor-not-allowed data-[disabled=true]:text-fg-3',
);

const GROUP_CLASS = cx(
    '[&:not(:first-child)]:mt-1 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border [&:not(:first-child)]:pt-1',
    '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2',
    '[&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase',
    '[&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-fg-3',
);

function isPaletteCombo(e: KeyboardEvent): boolean {
    return (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k';
}

/**
 * The palette itself: a modal search box over the registered commands.
 * Arrow keys move, Enter runs, Esc closes (or goes back from a sub-page),
 * and focus returns to where it was.
 */
export function CommandPaletteDialog(props: CommandPaletteDialogProps): JSX.Element | null {
    if (!props.open || typeof document === 'undefined') return null;
    return createPortal(<PaletteBody {...props} />, document.body);
}

function PaletteBody({ onClose, commands, recent, page, onPageChange, theme = 'dark' }: CommandPaletteDialogProps): JSX.Element {
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const onEscape = useCallback(() => {
        if (page !== 'commands') onPageChange('commands');
        else onClose();
    }, [page, onPageChange, onClose]);
    useFocusTrap(panelRef, true, onEscape);
    // Switching pages unmounts the focused control; keep focus in the panel
    // (the search box, or the back button) so the keys keep working.
    useEffect(() => {
        const root = panelRef.current;
        if (!root || root.contains(document.activeElement)) return;
        (focusableIn(root)[0] ?? root).focus();
    }, [page]);

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
        if (!isPaletteCombo(e)) return;
        e.preventDefault();
        onClose();
    };

    return (
        <div data-theme={theme} className="fixed inset-0 z-[950]" data-testid="command-palette">
            <div aria-hidden="true" className="absolute inset-0 animate-fade-in bg-scrim" onClick={onClose} />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                onKeyDown={onKeyDown}
                className={cx(
                    'relative mx-4 mt-4 flex max-h-[min(72dvh,540px)] flex-col overflow-hidden rounded-panel border border-border',
                    'bg-surface-1 text-fg shadow-e3 outline-none animate-pop-in',
                    'sm:mx-auto sm:mt-[12vh] sm:w-[min(640px,calc(100vw-32px))]',
                )}
            >
                <h2 id={titleId} className="sr-only">
                    {page === 'shortcuts' ? 'Keyboard shortcuts' : 'Command palette'}
                </h2>
                {page === 'shortcuts' ? (
                    <ShortcutsPage onBack={() => onPageChange('commands')} />
                ) : (
                    <CommandsPage commands={commands} recent={recent} onClose={onClose} />
                )}
            </div>
        </div>
    );
}

function recentAsCommands(recent: RecentProjects | undefined): Command[] {
    if (recent?.status !== 'ready') return [];
    return recent.items.map((p) => ({
        id: `recent.${p.id}`,
        label: p.title,
        description: p.detail,
        keywords: ['recent', 'project', 'open'],
        icon: <History className="size-4" strokeWidth={1.75} />,
        action: p.onOpen,
    }));
}

function CommandsPage({ commands, recent, onClose }: {
    readonly commands: readonly Command[];
    readonly recent?: RecentProjects;
    readonly onClose: () => void;
}): JSX.Element {
    const [search, setSearch] = useState('');
    const query = search.trim();
    const recentCommands = useMemo(() => recentAsCommands(recent), [recent]);
    const groups = useMemo(() => groupCommands(commands), [commands]);
    const values = useMemo(() => uniqueValues([...commands, ...recentCommands]), [commands, recentCommands]);
    const results = useMemo(
        () => (query ? rankCommands([...commands, ...recentCommands], query) : []),
        [commands, recentCommands, query],
    );
    // The Selection group leads; recent projects follow it.
    const selection = groups.filter((g) => g.section === 'Selection');
    const rest = groups.filter((g) => g.section !== 'Selection');

    const run = (command: Command): void => {
        if (command.disabled) return;
        if (command.keepOpen) {
            command.action();
            return;
        }
        // Close first and commit now: the palette hands focus back as it
        // unmounts, so a dialog the command opens must mount after that
        // (cmdk selects from its own event, which React would otherwise
        // commit later than a timer).
        flushSync(onClose);
        command.action();
    };

    return (
        // The palette ranks results itself (best match first, across groups).
        <Cmdk label="Commands" loop shouldFilter={false} className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-3">
                <Search aria-hidden="true" className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} />
                <Cmdk.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search commands and projects…"
                    className="h-12 min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-3"
                />
                <Kbd keys={KEYMAP.close} className="hidden sm:inline-flex" />
            </div>
            <Cmdk.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 scroll-py-1.5">
                <Cmdk.Empty className="px-3 py-8 text-center text-ui text-fg-3">
                    No command matches “{query}”.
                </Cmdk.Empty>
                {query ? (
                    <Cmdk.Group heading="Best matches" className={GROUP_CLASS}>
                        {results.map((c) => (
                            <CommandItem
                                key={c.id}
                                command={c}
                                value={values.get(c.id) ?? c.label}
                                hint={c.id.startsWith('recent.') ? 'Recent project' : c.section ?? 'General'}
                                onRun={run}
                            />
                        ))}
                    </Cmdk.Group>
                ) : (
                    <>
                        {selection.map((g) => (
                            <CommandGroupView key={g.section} heading={g.section} commands={g.commands} values={values} onRun={run} />
                        ))}
                        {recent && recent.status !== 'hidden' && (
                            <RecentGroup recent={recent} commands={recentCommands} values={values} onRun={run} />
                        )}
                        {rest.map((g) => (
                            <CommandGroupView key={g.section} heading={g.section} commands={g.commands} values={values} onRun={run} />
                        ))}
                    </>
                )}
            </Cmdk.List>
            <PaletteFooter />
        </Cmdk>
    );
}

function CommandGroupView({ heading, commands, values, onRun }: {
    readonly heading: string;
    readonly commands: readonly Command[];
    readonly values: Map<string, string>;
    readonly onRun: (command: Command) => void;
}): JSX.Element {
    return (
        <Cmdk.Group heading={heading} className={GROUP_CLASS}>
            {commands.map((c) => (
                <CommandItem key={c.id} command={c} value={values.get(c.id) ?? c.label} onRun={onRun} />
            ))}
        </Cmdk.Group>
    );
}

function CommandItem({ command: c, value, hint, onRun }: {
    readonly command: Command;
    readonly value: string;
    /** Where the command lives, shown next to search results. */
    readonly hint?: string;
    readonly onRun: (command: Command) => void;
}): JSX.Element {
    return (
        <Cmdk.Item
            value={value}
            disabled={c.disabled}
            onSelect={() => onRun(c)}
            className={ITEM_CLASS}
            data-command-id={c.id}
        >
            <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center text-fg-3 group-data-[selected=true]:text-accent">
                {c.icon}
            </span>
            <span className="flex min-w-0 flex-1 flex-col py-1.5 sm:flex-row sm:items-baseline sm:gap-2">
                <span className="truncate">{c.label}</span>
                {c.description && <span className="truncate text-2xs text-fg-3">{c.description}</span>}
            </span>
            {c.shortcut && <Kbd keys={c.shortcut} className="hidden shrink-0 sm:inline-flex" />}
            {hint && <span className="shrink-0 text-2xs text-fg-3">{hint}</span>}
        </Cmdk.Item>
    );
}

function RecentGroup({ recent, commands, values, onRun }: {
    readonly recent: RecentProjects;
    readonly commands: readonly Command[];
    readonly values: Map<string, string>;
    readonly onRun: (command: Command) => void;
}): JSX.Element {
    return (
        <Cmdk.Group heading="Recent projects" className={GROUP_CLASS}>
            {recent.status === 'loading' && (
                <Cmdk.Loading>
                    <div role="status" className="flex min-h-9 items-center gap-3 px-2.5 text-ui text-fg-3">
                        <History aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                        Loading your projects…
                    </div>
                </Cmdk.Loading>
            )}
            {recent.status === 'error' && (
                <Cmdk.Item value="Could not load your projects. Retry" onSelect={recent.retry} className={ITEM_CLASS}>
                    <RotateCw aria-hidden="true" className="size-4 shrink-0 text-danger" strokeWidth={1.75} />
                    <span className="flex-1 truncate py-1.5">Could not load your projects</span>
                    <span className="shrink-0 text-2xs text-fg-3">Retry</span>
                </Cmdk.Item>
            )}
            {recent.status === 'ready' && commands.length === 0 && (
                <Cmdk.Item value="No saved projects yet" disabled className={ITEM_CLASS}>
                    <History aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                    <span className="flex-1 truncate py-1.5">No saved projects yet</span>
                </Cmdk.Item>
            )}
            {commands.map((c) => (
                <CommandItem key={c.id} command={c} value={values.get(c.id) ?? c.label} onRun={onRun} />
            ))}
        </Cmdk.Group>
    );
}

function PaletteFooter(): JSX.Element {
    return (
        <div aria-hidden="true" className="hidden shrink-0 items-center gap-4 border-t border-border px-3 py-2 text-2xs text-fg-3 sm:flex">
            <span className="flex items-center gap-1.5"><Kbd keys={['ArrowUp']} /><Kbd keys={['ArrowDown']} /> move</span>
            <span className="flex items-center gap-1.5"><Kbd keys={['Enter']} /> run</span>
            <span className="flex items-center gap-1.5"><Kbd keys={KEYMAP.close} /> close</span>
            <span className="ml-auto flex items-center gap-1.5">open anywhere <Kbd keys={KEYMAP.commandPalette} /></span>
        </div>
    );
}

function ShortcutsPage({ onBack }: { readonly onBack: () => void }): JSX.Element {
    return (
        <section aria-label="Keyboard shortcuts" className="flex min-h-0 flex-1 flex-col" data-testid="shortcuts-help">
            <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-2">
                <IconButton
                    label="Back to commands"
                    shortcut={KEYMAP.close}
                    icon={<ChevronLeft className="size-4" strokeWidth={1.75} />}
                    onClick={onBack}
                    className="max-sm:size-touch"
                />
                <h3 className="text-title text-fg">Keyboard shortcuts</h3>
            </header>
            <dl className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                {SHORTCUT_HELP.map((row) => (
                    <div key={row.label} className="flex min-h-11 items-center justify-between gap-4 border-b border-border last:border-b-0">
                        <dt className="text-ui text-fg-2">{row.label}</dt>
                        <dd className="flex shrink-0 items-center gap-2 text-2xs text-fg-3">
                            {row.keys.map((keys, i) => (
                                <span key={keys.join('+')} className="flex items-center gap-2">
                                    {i > 0 && <span>or</span>}
                                    <Kbd keys={keys} />
                                </span>
                            ))}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

// ─── Studio wiring ───────────────────────────────────────────────────────

const RECENT_LIMIT = 6;

/** The /p/<slug> page the user is on, if any; it is not a "recent" target. */
function currentProjectSlug(): string | null {
    const m = /^\/p\/([^/]+)/.exec(window.location.pathname);
    return m ? decodeURIComponent(m[1]) : null;
}

/** The signed-in user's saved projects, fetched each time the palette opens. */
function useRecentProjects(open: boolean, signedIn: boolean): RecentProjects {
    const [state, setState] = useState<RecentProjects>({ status: 'hidden' });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!open || !signedIn) return undefined;
        let cancelled = false;
        // Loading state is set from the fetch's own microtask, not the effect body.
        void Promise.resolve()
            .then(() => {
                if (!cancelled) setState({ status: 'loading' });
                // Owner-filtered: only the user's own projects, newest first.
                return listMyProjects({ limit: RECENT_LIMIT });
            })
            .then((rows) => {
                if (cancelled) return;
                const here = currentProjectSlug();
                setState({
                    status: 'ready',
                    items: rows.filter((row) => row.slug !== here).map((row) => ({
                        id: row.slug,
                        title: row.title || 'Untitled project',
                        detail: `Updated ${relativeTime(row.updated_at)}`,
                        onOpen: () => window.location.assign(projectHref(row.slug)),
                    })),
                });
            })
            .catch(() => {
                if (!cancelled) setState({ status: 'error', retry: () => setAttempt((n) => n + 1) });
            });
        return () => {
            cancelled = true;
        };
    }, [open, signedIn, attempt]);

    return signedIn ? state : { status: 'hidden' };
}

function PaletteTrigger({ onOpen, compact }: { readonly onOpen: () => void; readonly compact: boolean }): JSX.Element {
    if (compact) {
        return (
            <IconButton
                label="Search commands"
                shortcut={KEYMAP.commandPalette}
                icon={<Search className="size-4" strokeWidth={1.75} />}
                onClick={onOpen}
                className="size-10"
                data-testid="command-palette-trigger"
            />
        );
    }
    return (
        <button
            type="button"
            onClick={onOpen}
            aria-keyshortcuts="Meta+K Control+K"
            data-testid="command-palette-trigger"
            className={cx(
                'focus-ring inline-flex h-7 w-44 items-center gap-2 rounded-control border border-border bg-surface-2 pl-2 pr-1',
                'text-ui text-fg-3 transition-colors duration-80 hover:border-border-strong hover:text-fg-2 xl:w-56',
            )}
        >
            <Search aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.75} />
            <span className="flex-1 truncate text-left">Search commands…</span>
            <Kbd keys={KEYMAP.commandPalette} />
        </button>
    );
}

function sanitizeName(name: string | undefined): string {
    return (name || 'model').replace(/[^a-z0-9]/gi, '_');
}

function pngBlobFromBase64(base64: string): Blob {
    const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
    return new Blob([bytes], { type: 'image/png' });
}

/**
 * The Studio's command actions. They read the latest Studio values when they
 * run, so the set stays stable and the registry does not churn on every
 * keystroke.
 */
function useStudioCommandActions(exportTask: ExportTask, showShortcuts: () => void): StudioCommandActions {
    const workbench = useWorkbench();
    const ui = useUI();
    const project = useProject();
    const live = useRef({ workbench, ui, project, exportTask, showShortcuts });
    useEffect(() => {
        live.current = { workbench, ui, project, exportTask, showShortcuts };
    });

    return useMemo<StudioCommandActions>(() => ({
        run: () => live.current.workbench.mutateCode?.((current: string) => current, 'studio.palette.run'),
        validate: () => {
            const wb = live.current.workbench;
            wb.executeGeometry?.(wb.code);
        },
        setViewMode3D: (mode) => live.current.workbench.setViewMode3D(mode),
        setViewportBackground: (bg) => live.current.ui.setViewportBackground(bg),
        setGridVisible: (visible) => live.current.ui.setGridVisible(visible),
        toggleMarkingMode: () => shellStore.toggleMarkingMode(),
        // Same rule as the toolbar: section and marking never share the viewport.
        toggleSectionMode: () => {
            if (shellStore.getSnapshot().markingMode) shellStore.setMarkingMode(false);
            shellStore.toggleSectionMode();
        },
        toggleInspector: () => shellStore.toggleInspectorOpen(),
        showTab: (tab) => {
            shellStore.setInspectorOpen(true);
            inspectorTabRequests.request(tab);
        },
        viewTarget: (target) => viewTargetRequests.request(target),
        exportFormat: (format, label) => {
            const { workbench: wb, project: pj, exportTask: task } = live.current;
            const fallback = `${sanitizeName(pj.activeProject?.name)}.${format}`;
            void task.start(
                label,
                (options) => exportViaServer(format, wb.code, options),
                (blob, downloadName) => downloadBlob(blob, downloadName || fallback),
            );
        },
        savePng: () => {
            const { project: pj, exportTask: task } = live.current;
            void task.start(
                'PNG',
                async () => {
                    const base64 = captureViewerPngBase64();
                    if (!base64) throw new Error('The view could not be captured. Wait for the model to render, then try again.');
                    return { blob: pngBlobFromBase64(base64), downloadName: `${sanitizeName(pj.activeProject?.name)}.png` };
                },
                downloadBlob,
            );
        },
        clearSelection: () => {
            live.current.workbench.setSelectedItemId(null);
            shellStore.setSelectedFeatureId(null);
            selectionCodeStore.clearLink();
        },
        openProjectManager: () => live.current.workbench.setActiveDialog('projectManager'),
        openProject: (id) => live.current.project.openProject(id),
        // Same steps as the Quick start row: keep pending edits, then open the starter.
        newFromStarter: (model, code) => {
            const { workbench: wb, project: pj } = live.current;
            pj.saveActiveProject({ code: wb.code });
            pj.createProject(model.name, code);
            shellStore.setInspectorOpen(true);
        },
        showShortcuts: () => live.current.showShortcuts(),
    }), []);
}

/** The Studio values the command set depends on. */
function useStudioCommandState(): StudioCommandState {
    const workbench = useWorkbench();
    const ui = useUI();
    const shell = useShellStore();
    const { link } = useSelectionCodeState();
    const recompute = useRecomputeResult();
    const project = useProject();
    const { viewerMode } = useStudioChrome();
    // getVisibleTabs returns a new array each render; key it so the command
    // list (and the registry) only change when the tabs do.
    const visibleTabsKey = getVisibleTabs(recompute).join(',');
    const visibleTabs = useMemo(
        () => (visibleTabsKey ? visibleTabsKey.split(',') : []) as StudioCommandState['visibleTabs'],
        [visibleTabsKey],
    );
    return {
        viewerMode: !!viewerMode,
        hasGeometry: recompute.geometries.length > 0,
        hasPlanarGeometry: hasPlanarSource(recompute.geometries),
        visibleTabs,
        viewMode3D: workbench.viewMode3D,
        viewportBackground: ui.viewportBackground,
        gridVisible: ui.gridVisible,
        markingMode: shell.markingMode,
        sectionMode: shell.sectionMode,
        inspectorOpen: shell.inspectorOpen,
        codeLinkFeature: link?.featureId ?? null,
        hasSelection: link !== null || shell.selectedFeatureId != null || (workbench.selectedItemIds?.length ?? 0) > 0,
        projects: project.projects,
        activeProjectId: project.activeProjectId,
    };
}

/**
 * The Studio palette: registers the Studio commands, binds ⌘K / Ctrl+K and
 * ⌘\ / Ctrl+\, and renders the header trigger, the palette and the status
 * of exports started from it. Mount it inside the Studio providers — the
 * Studio routes pass it as header chrome.
 */
export function StudioCommandPalette(): JSX.Element {
    const [open, setOpen] = useState(false);
    const [page, setPage] = useState<PalettePage>('commands');
    const compact = useIsNarrow(COMPACT_HEADER_QUERY);
    const exportTask = useExportTask();
    const { session } = useOptionalSession();
    const recent = useRecentProjects(open, !!session);

    const showShortcuts = useCallback(() => setPage('shortcuts'), []);
    const actions = useStudioCommandActions(exportTask, showShortcuts);
    useRegisterCommands(useStudioCommandList(useStudioCommandState(), actions));
    const { commands } = useCommandRegistry();

    const openPalette = useCallback(() => {
        setPage('commands');
        setOpen(true);
    }, []);
    const closePalette = useCallback(() => setOpen(false), []);
    const bindings = useMemo(() => ({
        [shortcutCombo(KEYMAP.commandPalette)]: () => {
            setPage('commands');
            setOpen((wasOpen) => !wasOpen);
        },
        [shortcutCombo(KEYMAP.toggleInspector)]: () => shellStore.toggleInspectorOpen(),
    }), []);
    useKeyboardShortcuts(bindings);

    return (
        <span data-theme="dark" className="contents">
            <PaletteTrigger onOpen={openPalette} compact={compact} />
            <CommandPaletteDialog
                open={open}
                onClose={closePalette}
                commands={commands}
                recent={recent}
                page={page}
                onPageChange={setPage}
            />
            <ExportStatus task={exportTask} floating testId="palette-export-status" />
        </span>
    );
}
