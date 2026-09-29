// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useMemo, type ReactNode } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useStudioChrome } from '../../context/StudioChromeContext';
import { COMPACT_HEADER_QUERY, useIsNarrow } from '../../hooks/useIsNarrow';
import { useRegisterCommands, type Command } from '../../hooks/useCommandRegistry';
import { downloadBlob, exportViaServer, type StudioExportFormat } from '../../exportViaServer';
import { hasPlanarSource } from '../../exportFormats';
import { useExportTask, type ExportTask } from '../../hooks/useExportTask';
import { useShellStore, shellStore } from '../../store/useShellStore';
import { usePublishAction } from '../../usePublishAction';
import { ExportStatus } from '../Shared/ExportStatus';
import { OverflowMenu } from './OverflowMenu';
import UserMenu from './UserMenu';
import { FeedbackHost } from './FeedbackButton';
import { openFeedback } from './feedbackRequests';
import { useHeaderHistory } from './useHeaderHistory';
import {
    ExportList, ExportSplitButton, HistoryControl, InspectorToggle, SaveState, ShareButton, UndoRedoButtons,
    useLastExportFormat, type ExportHandler,
} from './HeaderClusters';

/** Labelled row inside the narrow-viewport overflow menu. */
function MenuRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5 px-1 py-1.5">
            <span className="text-2xs font-medium uppercase tracking-wider text-fg-3">{label}</span>
            <div className="flex flex-wrap items-center gap-1">{children}</div>
        </div>
    );
}

// Route through the node OCCT export endpoint (same as ExportTab). The
// legacy in-browser worker uses bare `new Function(code)` without an
// async wrapper, so top-level await / lib.fromSTEP fail with
// "await is only valid in async functions". Progress, errors (with the
// server's hint) and warnings show in a floating ExportStatus, not alert().
function exportModelViaServer(
    task: ExportTask,
    format: StudioExportFormat,
    label: string,
    code: string,
    projectName: string | undefined,
): void {
    const fallback = `${(projectName || 'model').replace(/[^a-z0-9]/gi, '_')}.${format}`;
    void task.start(
        label,
        (options) => exportViaServer(format, code, options),
        (blob, downloadName) => downloadBlob(blob, downloadName || fallback),
    );
}

/** The kernelCAD "K", the same mark as the public pages. */
function KernelcadMark() {
    return (
        <svg className="size-4 shrink-0" viewBox="0 0 84 84" fill="none" aria-hidden="true">
            <path
                d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z"
                fill="currentColor"
            />
        </svg>
    );
}

/** Header entries for the palette: Share and Feedback live here. */
function useHeaderCommands(onPublish: () => void): void {
    const commands = useMemo<Command[]>(() => [
        {
            id: 'file.share',
            label: 'Publish and share a link',
            description: 'Copies a public link to this model',
            section: 'File',
            keywords: ['publish', 'link', 'url', 'share'],
            action: onPublish,
        },
        {
            id: 'help.feedback',
            label: 'Send feedback',
            section: 'Help',
            keywords: ['bug', 'idea', 'report', 'contact'],
            action: openFeedback,
        },
    ], [onPublish]);
    useRegisterCommands(commands);
}

/**
 * The Studio's one header row: project, save state, undo/redo and history
 * on the left; the route's chrome (the ⌘K search on Studio routes); Share,
 * Export, the inspector toggle and the account on the right. Feedback lives
 * in the account menu (and the palette). Below `lg` the file controls fold
 * into one overflow menu.
 */
export function Header() {
    const { headerLeft, headerRight, viewerMode } = useStudioChrome();
    const { isComputing, code, commandManager, setActiveDialog, geometries } = useWorkbench();
    const { inspectorOpen } = useShellStore();

    const {
        activeProject, revisions, historyOpen, setHistoryOpen, historyRef,
        historyAvailable, formatRevisionTime, handleRestore,
    } = useHeaderHistory();

    const narrow = useIsNarrow(COMPACT_HEADER_QUERY);
    const publish = usePublishAction(code, activeProject?.name);
    const onPublish = publish.handlePublish;
    const stablePublish = useMemo(() => () => void onPublish(), [onPublish]);
    useHeaderCommands(stablePublish);

    const exportTask = useExportTask();
    const [lastFormat, rememberFormat] = useLastExportFormat();
    const handleExport: ExportHandler = (format, label) => {
        rememberFormat(format);
        exportModelViaServer(exportTask, format, label, code, activeProject?.name);
    };
    const hasPlanarGeometry = hasPlanarSource(geometries ?? []);
    const modified = !viewerMode && activeProject != null && code !== activeProject.code;

    // A route that injects its own header chrome (e.g. /p/:slug shows the
    // project title) already names the document, so on a phone the Studio's
    // own project-name label is dropped rather than fighting for the same row.
    const hideProjectName = narrow && !!headerLeft;

    const undoRedo = <UndoRedoButtons commandManager={commandManager} />;
    const history = (
        <HistoryControl
            historyAvailable={historyAvailable}
            historyRef={historyRef}
            historyOpen={historyOpen}
            setHistoryOpen={setHistoryOpen}
            revisions={revisions}
            formatRevisionTime={formatRevisionTime}
            handleRestore={handleRestore}
        />
    );
    const inspectorToggle = (
        <InspectorToggle inspectorOpen={inspectorOpen} onToggle={() => shellStore.toggleInspectorOpen()} />
    );

    return (
        <header
            data-theme="dark"
            className="relative z-30 flex h-11 shrink-0 select-none items-center gap-1.5 border-b border-border bg-surface-1 px-2 text-fg md:gap-2 md:px-3"
            data-testid="header"
        >
            <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                <button
                    type="button"
                    onClick={() => setActiveDialog('projectManager')}
                    aria-label="Open project manager"
                    title="Switch or manage projects"
                    className="focus-ring flex h-control-sm min-w-0 shrink items-center gap-2 rounded-control px-1.5 text-fg transition-colors duration-80 hover:bg-surface-2"
                >
                    <KernelcadMark />
                    {!hideProjectName && (
                        <span className="max-w-[140px] truncate text-ui font-medium sm:max-w-[220px]">
                            {activeProject?.name || 'Untitled Project'}
                        </span>
                    )}
                    <ChevronDown className="size-3.5 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden="true" />
                </button>
                {activeProject && !viewerMode && !narrow && <SaveState modified={modified} />}
                {headerLeft && (
                    <>
                        <div className="h-5 w-px shrink-0 bg-border" />
                        <div className="flex min-w-0 items-center gap-2 overflow-hidden">{headerLeft}</div>
                    </>
                )}
                {!narrow && (
                    <div className="ml-1 flex shrink-0 items-center gap-0.5">
                        {undoRedo}
                        {history}
                    </div>
                )}
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-1.5 md:gap-2">
                {headerRight && <div className="flex min-w-0 items-center gap-2">{headerRight}</div>}
                {publish.publishedLink && !narrow && (
                    <a
                        href={publish.publishedLink}
                        data-testid="toolbar-publish-link"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-[260px] truncate rounded-control px-2 text-2xs text-ok no-underline hover:underline"
                    >
                        Link copied — {publish.publishedLink}
                    </a>
                )}
                {narrow ? (
                    <OverflowMenu label="File and panel controls" testId="header-overflow">
                        <div data-theme="dark" className="flex w-64 flex-col">
                            <MenuRow label="Edit">
                                {undoRedo}
                                {history}
                            </MenuRow>
                            <MenuRow label="Share">
                                <ShareButton publishState={publish.publishState} onPublish={stablePublish} compact />
                            </MenuRow>
                            <MenuRow label="Export">
                                <ExportList
                                    isComputing={isComputing}
                                    hasPlanarGeometry={hasPlanarGeometry}
                                    onExport={handleExport}
                                />
                            </MenuRow>
                            <MenuRow label="Panels">{inspectorToggle}</MenuRow>
                        </div>
                    </OverflowMenu>
                ) : (
                    <>
                        <ShareButton publishState={publish.publishState} onPublish={stablePublish} />
                        <ExportSplitButton
                            defaultFormat={lastFormat}
                            isComputing={isComputing}
                            hasPlanarGeometry={hasPlanarGeometry}
                            onExport={handleExport}
                        />
                        {inspectorToggle}
                    </>
                )}
                {isComputing && (
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-fg-3" aria-label="Computing" />
                )}
            </div>
            <ExportStatus task={exportTask} floating testId="header-export-status" />
            {/* The account slot never scrolls or folds away: sign-in, sign-out,
                billing and feedback must stay one tap away on every width. */}
            <div className="flex shrink-0 items-center gap-1.5 border-l border-border pl-2" data-testid="account-slot">
                <UserMenu />
            </div>
            <FeedbackHost />
        </header>
    );
}
