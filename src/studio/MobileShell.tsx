// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The Studio on a phone (< 768 px): the model fills the screen, a bottom tab
// bar (Model / Agent / Params / Code / More) replaces the left activity bar,
// and each tab opens a sheet docked over the bottom of the model. The sheets
// reuse the desktop panes and inspector tabs. The status bar does not fit a
// phone's width; its facts move into More → Status.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type JSX, type KeyboardEvent, type ReactNode } from 'react';
import {
    Box, ChevronRight, Code2, Download, Film, FolderOpen, Info, Layers, Link2, MoreHorizontal, Plug, ShieldCheck,
    SlidersHorizontal, Sparkles,
} from 'lucide-react';
import { Header } from './components/Layout/Header';
import { MobileDrawer } from './BottomDrawer';
import { AgentPane, ProjectsPane } from './ActivityBar';
import { useActivityCommands, useActivityItems, useAgentAccess, usePendingPrompt } from './hooks/useActivityPanes';
import type { LeftPaneId } from './activityBarModel';
import { useRecomputeResult } from './hooks/useRecomputeResult';
import { useInspectorTabRequests } from './hooks/studioNavigation';
import { getVisibleTabs } from './logic/adaptiveTabs';
import { checksBadgeCount } from './logic/checksModel';
import { shellStore } from './store/useShellStore';
import type { TabId } from './types';
import {
    MOBILE_SHEET_TITLE, MOBILE_TAB_LABEL, isInspectorSheet, mobileStatus, mobileTabs, opensFromMore,
    sheetForInspectorTab, sheetForTab, tabForKey, tabForSheet,
    type MobileSheetId, type MobileStatus, type MobileStatusInput, type MobileTabId,
} from './mobileShellModel';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';

const VERSION_LABEL = typeof __APP_VERSION__ !== 'undefined' ? `v${__APP_VERSION__}` : 'dev';
const ICON = { className: 'size-5', strokeWidth: 1.75, 'aria-hidden': true } as const;
const TAB_ICON: Record<MobileTabId, ReactNode> = {
    model: <Box {...ICON} />,
    agent: <Sparkles {...ICON} />,
    params: <SlidersHorizontal {...ICON} />,
    code: <Code2 {...ICON} />,
    more: <MoreHorizontal {...ICON} />,
};
const SHEET_ID = 'mobile-sheet';
const tabDomId = (tab: MobileTabId) => `mobile-tab-${tab}`;
/** Snap index 1: 55 % of the screen, the spec's default sheet height. */
const DEFAULT_SNAP = 1;

export interface MobileShellProps {
    /** The viewport with its floating toolbar and overlays. */
    readonly stage: ReactNode;
    readonly tabSlots: Partial<Record<TabId, ReactNode>>;
    readonly enableAgent: boolean;
    readonly enableConnect: boolean;
    readonly viewerMode: boolean;
    readonly status: MobileStatusInput;
    /** Dialogs the header opens (project manager). */
    readonly dialogs?: ReactNode;
}

/**
 * The open sheet, kept in step with the shell store: an inspector sheet
 * means `inspectorOpen`, the agent sheet means `agentRailOpen`. So the
 * palette, the header's Panels toggle and "Repair with agent" open the
 * right sheet, and the desktop panes find the state the phone left.
 */
function useMobileSheet(showAgent: boolean) {
    const [sheet, setSheet] = useState<MobileSheetId | null>(null);
    const current = useRef<MobileSheetId | null>(null);
    const syncing = useRef(false);
    // Like the desktop pane on a phone: saved agent state opens nothing
    // until the visitor has used the tab bar.
    const asked = useRef(false);

    const open = useCallback((next: MobileSheetId | null) => {
        current.current = next;
        setSheet(next);
        syncing.current = true;
        shellStore.setInspectorOpen(isInspectorSheet(next));
        if (showAgent) shellStore.setAgentRailOpen(next === 'agent');
        syncing.current = false;
    }, [showAgent]);

    useEffect(() => {
        let prev = shellStore.getSnapshot();
        return shellStore.subscribe(() => {
            const state = shellStore.getSnapshot();
            const was = prev;
            prev = state;
            if (syncing.current) return;
            if (state.inspectorOpen !== was.inspectorOpen) {
                if (state.inspectorOpen && !isInspectorSheet(current.current)) open('code');
                if (!state.inspectorOpen && isInspectorSheet(current.current)) open(null);
            }
            if (showAgent && state.agentRailOpen !== was.agentRailOpen) {
                if (state.agentRailOpen && asked.current) open('agent');
                if (!state.agentRailOpen && current.current === 'agent') open(null);
            }
        });
    }, [open, showAgent]);

    useInspectorTabRequests((tab) => {
        const next = sheetForInspectorTab(tab);
        if (next) open(next);
    });

    const markAsked = useCallback(() => { asked.current = true; }, []);
    return { sheet, open, markAsked };
}

export function MobileShell({
    stage, tabSlots, enableAgent, enableConnect, viewerMode, status, dialogs,
}: MobileShellProps): JSX.Element {
    const showAgent = enableAgent && !viewerMode;
    const { access, signedIn } = useAgentAccess();
    const { sheet, open, markAsked } = useMobileSheet(showAgent);
    const [snap, setSnap] = useState(DEFAULT_SNAP);
    const result = useRecomputeResult();
    const visibleTabs = getVisibleTabs(result);
    const checks = checksBadgeCount(result);
    const summary = mobileStatus(status, VERSION_LABEL);

    usePendingPrompt(access, () => open('agent'));
    const items = useActivityItems(showAgent, viewerMode);
    const openPane = useCallback((id: LeftPaneId) => open(id), [open]);
    useActivityCommands(items, openPane, enableConnect, signedIn);

    const tabs = mobileTabs(showAgent);
    const activeTab = tabForSheet(sheet);
    const selectTab = (tab: MobileTabId) => {
        markAsked();
        if (tab === activeTab && tab !== 'model') {
            // A sheet from More goes back to More; the tab's own sheet closes.
            open(sheet !== null && opensFromMore(sheet) ? 'more' : null);
            return;
        }
        open(sheetForTab(tab));
    };

    const content = sheet && (
        <SheetContent
            sheet={sheet}
            tabSlots={tabSlots}
            visibleTabs={visibleTabs}
            checks={checks}
            summary={summary}
            access={access}
            signedIn={signedIn}
            enableConnect={enableConnect}
            viewerMode={viewerMode}
            onOpen={open}
        />
    );

    return (
        <div
            data-theme="dark"
            data-testid="workbench-ready"
            data-shell="mobile"
            style={{ '--kc-tabbar-h': 'calc(56px + env(safe-area-inset-bottom))' } as CSSProperties}
            className="fixed inset-0 flex flex-col overflow-hidden bg-bg pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] font-sans text-fg"
        >
            <div className="shrink-0 bg-surface-1 pt-[env(safe-area-inset-top)]">
                <Header />
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col">
                <div className="relative min-h-0 flex-1" data-testid="mobile-stage">{stage}</div>
                {sheet && (
                    <MobileDrawer
                        title={MOBILE_SHEET_TITLE[sheet]}
                        onClose={() => open(null)}
                        onBack={opensFromMore(sheet) ? () => open('more') : undefined}
                        backLabel="Back to More"
                        snap={snap}
                        onSnap={setSnap}
                        fill={sheet === 'code'}
                        panelId={SHEET_ID}
                        labelledBy={tabDomId(activeTab)}
                    >
                        {content}
                    </MobileDrawer>
                )}
            </div>
            <MobileTabBar
                tabs={tabs}
                active={activeTab}
                onSelect={selectTab}
                codeError={status.error != null}
                checks={checks}
            />
            <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {summary.state}{summary.detail ? `: ${summary.detail}` : ''}
            </span>
            {dialogs}
        </div>
    );
}

function MobileTabBar({ tabs, active, onSelect, codeError, checks }: {
    tabs: readonly MobileTabId[];
    active: MobileTabId;
    onSelect: (tab: MobileTabId) => void;
    codeError: boolean;
    checks: number | undefined;
}): JSX.Element {
    const refs = useRef<(HTMLButtonElement | null)[]>([]);
    const [focusIndex, setFocusIndex] = useState<number | null>(null);
    const tabStop = focusIndex ?? Math.max(0, tabs.indexOf(active));
    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const next = tabForKey(e.key, index, tabs.length);
        if (next === null) return;
        e.preventDefault();
        setFocusIndex(next);
        refs.current[next]?.focus();
    };
    return (
        <nav aria-label="Studio views" className="shrink-0 border-t border-border bg-surface-1 pb-[env(safe-area-inset-bottom)]">
            <div role="tablist" aria-label="Studio views" data-testid="mobile-tabbar" className="flex h-14">
                {tabs.map((tab, i) => {
                    const selected = tab === active;
                    const agent = tab === 'agent';
                    return (
                        <button
                            key={tab}
                            ref={(el) => { refs.current[i] = el; }}
                            id={tabDomId(tab)}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-controls={selected && tab !== 'model' ? SHEET_ID : undefined}
                            tabIndex={i === tabStop ? 0 : -1}
                            onClick={() => { setFocusIndex(i); onSelect(tab); }}
                            onKeyDown={(e) => onKeyDown(e, i)}
                            data-testid={tabDomId(tab)}
                            className={cx(
                                'focus-ring relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-80',
                                agent ? 'text-agent-fg' : selected ? 'text-fg' : 'text-fg-3',
                                selected && (agent ? 'bg-agent-soft' : 'bg-surface-2'),
                            )}
                        >
                            {selected && (
                                <span aria-hidden="true" className={cx('absolute inset-x-5 top-0 h-0.5 rounded-full', agent ? 'bg-agent' : 'bg-accent')} />
                            )}
                            <span className="relative inline-flex">
                                {TAB_ICON[tab]}
                                <TabBadge tab={tab} codeError={codeError} checks={checks} />
                            </span>
                            <span className="text-2xs font-medium">{MOBILE_TAB_LABEL[tab]}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

/** A red dot on Code for a script error; the checks count on More. */
function TabBadge({ tab, codeError, checks }: { tab: MobileTabId; codeError: boolean; checks: number | undefined }): JSX.Element | null {
    if (tab === 'code' && codeError) {
        return (
            <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-danger" data-testid="mobile-tab-code-error">
                <span className="sr-only">(script error)</span>
            </span>
        );
    }
    if (tab === 'more' && checks) {
        return (
            <span className="absolute -right-2.5 -top-1 min-w-4 rounded-full bg-warn px-1 text-center text-2xs font-semibold leading-4 text-bg">
                {checks}<span className="sr-only"> checks need attention</span>
            </span>
        );
    }
    return null;
}

interface SheetContentProps {
    sheet: MobileSheetId;
    tabSlots: Partial<Record<TabId, ReactNode>>;
    visibleTabs: readonly TabId[];
    checks: number | undefined;
    summary: MobileStatus;
    access: ReturnType<typeof useAgentAccess>['access'];
    signedIn: boolean;
    enableConnect: boolean;
    viewerMode: boolean;
    onOpen: (sheet: MobileSheetId | null) => void;
}

function SheetContent(props: SheetContentProps): JSX.Element | null {
    const { sheet, tabSlots, visibleTabs, access, signedIn, enableConnect, onOpen } = props;
    switch (sheet) {
        case 'agent':
            return (
                <div className="flex h-full min-h-0 flex-col" data-testid="mobile-sheet-agent">
                    <AgentPane access={access} enableConnect={enableConnect} />
                </div>
            );
        case 'params':
            return visibleTabs.includes('params') ? (
                <>{tabSlots.params}</>
            ) : (
                <EmptyState
                    icon={<SlidersHorizontal />}
                    title="No sizes to change yet"
                    description={<>Declare a size in the code, for example <code className="font-mono">param('Width', 60)</code>, and a slider shows here.</>}
                    action={<Button variant="secondary" size="lg" onClick={() => onOpen('code')}>Open the code</Button>}
                />
            );
        case 'more':
            return <MoreList {...props} />;
        case 'tree':
            return <>{tabSlots.scene}</>;
        case 'projects':
            return <ProjectsPane signedIn={signedIn} />;
        case 'status':
            return <StatusList summary={props.summary} />;
        default:
            return <div className="h-full">{tabSlots[sheet]}</div>;
    }
}

function MoreRow({ icon, label, hint, trailing, onClick, href, testId }: {
    icon: ReactNode;
    label: string;
    hint?: string;
    trailing?: ReactNode;
    onClick?: () => void;
    href?: string;
    testId?: string;
}): JSX.Element {
    const className = 'focus-ring flex min-h-touch w-full items-center gap-3 rounded-control px-3 py-2 text-left text-body text-fg no-underline transition-colors duration-80 hover:bg-surface-2 active:bg-surface-3';
    const body = (
        <>
            <span className="inline-flex shrink-0 text-fg-2">{icon}</span>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{label}</span>
                {hint && <span className="truncate text-2xs text-fg-3">{hint}</span>}
            </span>
            {trailing}
            <ChevronRight className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden="true" />
        </>
    );
    if (href) return <li><a href={href} className={className} data-testid={testId}>{body}</a></li>;
    return <li><button type="button" onClick={onClick} className={className} data-testid={testId}>{body}</button></li>;
}

const TONE_DOT: Record<MobileStatus['tone'], string> = { ok: 'bg-ok', busy: 'bg-accent', danger: 'bg-danger' };

function MoreList({ visibleTabs, checks, summary, enableConnect, viewerMode, onOpen }: SheetContentProps): JSX.Element {
    const statusHint = summary.detail ?? summary.rows[0]?.value;
    return (
        <div className="flex flex-col gap-3 p-2" data-testid="mobile-more">
            <ul className="flex flex-col">
                <MoreRow
                    icon={<span aria-hidden="true" className={cx('m-1.5 block size-2 rounded-full', TONE_DOT[summary.tone])} />}
                    label={`Status: ${summary.state}`}
                    hint={statusHint}
                    onClick={() => onOpen('status')}
                    testId="mobile-more-status"
                />
                <MoreRow icon={<Layers {...ICON} />} label="Model tree" onClick={() => onOpen('tree')} testId="mobile-more-tree" />
                <MoreRow
                    icon={<ShieldCheck {...ICON} />}
                    label="Checks"
                    trailing={checks ? <span className="rounded-full bg-warn-soft px-2 text-2xs font-semibold text-warn">{checks}</span> : undefined}
                    onClick={() => onOpen('validity')}
                    testId="mobile-more-validity"
                />
                {visibleTabs.includes('joints') && (
                    <MoreRow icon={<Link2 {...ICON} />} label="Joints" onClick={() => onOpen('joints')} testId="mobile-more-joints" />
                )}
                {visibleTabs.includes('animation') && (
                    <MoreRow icon={<Film {...ICON} />} label="Animation" onClick={() => onOpen('animation')} testId="mobile-more-animation" />
                )}
                {visibleTabs.includes('export') && (
                    <MoreRow icon={<Download {...ICON} />} label="Export" hint="STL, STEP, 3MF and more" onClick={() => onOpen('export')} testId="mobile-more-export" />
                )}
                {!viewerMode && (
                    <MoreRow icon={<FolderOpen {...ICON} />} label="Projects" hint="Open, manage or start from a starter" onClick={() => onOpen('projects')} testId="mobile-more-projects" />
                )}
                {enableConnect && !viewerMode && (
                    <MoreRow icon={<Plug {...ICON} />} label="Connect your own agent" href="/connect" testId="mobile-connect-link" />
                )}
            </ul>
        </div>
    );
}

function StatusList({ summary }: { summary: MobileStatus }): JSX.Element {
    return (
        <div className="flex flex-col gap-3 p-4" data-testid="mobile-status">
            <div className="flex items-center gap-2">
                <span aria-hidden="true" className={cx('size-2.5 rounded-full', TONE_DOT[summary.tone])} />
                <span className="text-body font-medium text-fg">{summary.state}</span>
            </div>
            {summary.detail && (
                <p className="rounded-control border border-danger/40 bg-surface-2 p-3 font-mono text-ui text-fg break-words">{summary.detail}</p>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-ui">
                {summary.rows.map((row) => (
                    <div key={row.label} className="contents">
                        <dt className="text-fg-3">{row.label}</dt>
                        <dd className="text-right text-fg tabular-nums">{row.value}</dd>
                    </div>
                ))}
            </dl>
            <p className="flex items-start gap-2 text-2xs text-fg-3">
                <Info className="mt-px size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                On a wide screen these show in the status bar under the model.
            </p>
        </div>
    );
}
