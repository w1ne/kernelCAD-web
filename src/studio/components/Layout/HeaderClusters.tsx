// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState, type JSX } from 'react';
import { Check, ChevronDown, Download, History, PanelRight, Redo2, RotateCcw, Share2, Undo2 } from 'lucide-react';
import { KEYMAP } from '../../../shared/constants/shortcuts';
import type { ProjectRevision } from '../../../authoring/projectService';
import { EXPORT_FORMATS, type ExportFormatDescriptor } from '../../exportFormats';
import type { StudioExportFormat } from '../../exportViaServer';
import { Button } from '../../../ui/Button';
import { IconButton } from '../../../ui/IconButton';
import { Menu, type MenuEntry } from '../../../ui/Menu';
import { buttonClass } from '../../../ui/buttonStyles';
import { cx } from '../../../ui/cx';

const ICON = { className: 'size-4', strokeWidth: 1.75 } as const;

export function UndoRedoButtons({ commandManager }: {
    commandManager: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean };
}) {
    return (
        <>
            <IconButton
                label="Undo"
                shortcut={KEYMAP.undo}
                icon={<Undo2 {...ICON} />}
                size="sm"
                tooltipSide="bottom"
                disabled={!commandManager.canUndo}
                onClick={() => commandManager.undo()}
            />
            <IconButton
                label="Redo"
                shortcut={KEYMAP.redo}
                icon={<Redo2 {...ICON} />}
                size="sm"
                tooltipSide="bottom"
                disabled={!commandManager.canRedo}
                onClick={() => commandManager.redo()}
            />
        </>
    );
}

export function HistoryControl({
    historyAvailable, historyRef, historyOpen, setHistoryOpen, revisions, formatRevisionTime, handleRestore,
}: {
    historyAvailable: boolean;
    historyRef: React.RefObject<HTMLDivElement | null>;
    historyOpen: boolean;
    setHistoryOpen: (updater: (open: boolean) => boolean) => void;
    revisions: ProjectRevision[];
    formatRevisionTime: (ts: string) => string;
    handleRestore: (v: number) => void;
}) {
    if (!historyAvailable) return null;
    return (
        <div className="relative" ref={historyRef} data-testid="history-menu">
            <IconButton
                label="Revision history"
                icon={<History {...ICON} />}
                size="sm"
                tooltipSide="bottom"
                pressed={historyOpen}
                aria-haspopup="menu"
                aria-expanded={historyOpen}
                onClick={() => setHistoryOpen(o => !o)}
                data-testid="history-button"
            />
            {historyOpen && (
                <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-1 max-h-80 w-64 overflow-y-auto rounded-panel border border-border bg-surface-1 p-1 shadow-e2"
                    data-testid="history-dropdown"
                >
                    <div className="px-2 py-1.5 text-2xs font-medium uppercase tracking-wider text-fg-3">
                        Revision history
                    </div>
                    {[...revisions].reverse().map((rev) => (
                        <div
                            key={rev.v}
                            className="flex items-center justify-between gap-2 rounded-control px-2 py-1.5 hover:bg-surface-2"
                        >
                            <div className="min-w-0">
                                <div className="text-ui text-fg">v{rev.v}</div>
                                <div className="truncate text-2xs text-fg-3">{formatRevisionTime(rev.ts)}</div>
                            </div>
                            <button
                                onClick={() => handleRestore(rev.v)}
                                className={cx(buttonClass('ghost', 'sm'), 'shrink-0')}
                                aria-label={`Restore revision v${rev.v}`}
                                title={`Restore v${rev.v}`}
                            >
                                <RotateCcw className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                                Restore
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Saved / unsaved state of the local project, next to its name. */
export function SaveState({ modified }: { modified: boolean }): JSX.Element {
    return modified ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-2xs text-fg-2" role="status">
            <span
                data-testid="toolbar-modified-dot"
                aria-label="Unsaved changes"
                className="size-2 rounded-full bg-warn"
            />
            Unsaved
        </span>
    ) : (
        <span className="inline-flex shrink-0 items-center gap-1 text-2xs text-fg-3" role="status">
            <Check className="size-3.5 text-ok" strokeWidth={2} aria-hidden="true" />
            Saved
        </span>
    );
}

export function ShareButton({ publishState, onPublish, compact }: {
    publishState: 'idle' | 'saving' | 'done' | 'error';
    onPublish: () => void;
    compact?: boolean;
}): JSX.Element {
    return (
        <Button
            variant="ghost"
            size="sm"
            data-testid="toolbar-publish"
            aria-label="Publish and share"
            title="Publish a link to this model and copy it"
            loading={publishState === 'saving'}
            onClick={onPublish}
            leadingIcon={<Share2 {...ICON} />}
            className={cx(compact && 'w-full justify-start')}
        >
            {publishState === 'error' ? 'Retry share' : 'Share'}
        </Button>
    );
}

export type ExportHandler = (format: StudioExportFormat, label: string) => void;

function formatBlocked(f: ExportFormatDescriptor, hasPlanarGeometry: boolean): boolean {
    return f.requiresPlanar === true && !hasPlanarGeometry;
}

/** Export split button: the last used format, plus a menu of every format. */
export function ExportSplitButton({ defaultFormat, isComputing, hasPlanarGeometry, onExport }: {
    defaultFormat: StudioExportFormat;
    isComputing: boolean;
    hasPlanarGeometry: boolean;
    onExport: ExportHandler;
}): JSX.Element {
    const primary = EXPORT_FORMATS.find(f => f.id === defaultFormat) ?? EXPORT_FORMATS[0];
    const items: MenuEntry[] = EXPORT_FORMATS.map(f => ({
        id: f.id,
        label: `${f.label} — ${formatBlocked(f, hasPlanarGeometry) ? 'needs a planar face' : f.help}`,
        icon: <Download {...ICON} />,
        disabled: isComputing || formatBlocked(f, hasPlanarGeometry),
        onSelect: () => onExport(f.id, f.label),
    }));
    return (
        <div className="inline-flex shrink-0 items-center" data-testid="header-export">
            <button
                type="button"
                onClick={() => onExport(primary.id, primary.label)}
                disabled={isComputing}
                title={`Export ${primary.label}`}
                aria-label={`Export ${primary.label}`}
                className={cx(buttonClass('primary', 'sm'), 'rounded-r-none')}
            >
                <Download {...ICON} aria-hidden="true" />
                Export {primary.label}
            </button>
            <Menu
                align="end"
                label="Export formats"
                items={items}
                trigger={(triggerProps) => (
                    <button
                        {...triggerProps}
                        type="button"
                        aria-label="More export formats"
                        title="More export formats"
                        className={cx(buttonClass('primary', 'sm'), 'rounded-l-none border-l border-on-accent/25 px-1.5')}
                    >
                        <ChevronDown {...ICON} aria-hidden="true" />
                    </button>
                )}
            />
        </div>
    );
}

/** Every export format as a labelled button, for the narrow overflow menu. */
export function ExportList({ isComputing, hasPlanarGeometry, onExport }: {
    isComputing: boolean;
    hasPlanarGeometry: boolean;
    onExport: ExportHandler;
}): JSX.Element {
    return (
        <div className="flex flex-wrap gap-1">
            {EXPORT_FORMATS.map(f => (
                <button
                    key={f.id}
                    type="button"
                    onClick={() => onExport(f.id, f.label)}
                    disabled={isComputing || formatBlocked(f, hasPlanarGeometry)}
                    title={`Export ${f.label}`}
                    aria-label={`Export ${f.label}`}
                    className={cx(buttonClass('secondary', 'sm'), 'min-h-touch md:min-h-0')}
                >
                    {f.label}
                </button>
            ))}
        </div>
    );
}

export function InspectorToggle({ inspectorOpen, onToggle }: { inspectorOpen: boolean; onToggle: () => void }): JSX.Element {
    return (
        <IconButton
            label={inspectorOpen ? 'Hide inspector panel' : 'Show inspector panel'}
            shortcut={KEYMAP.toggleInspector}
            icon={<PanelRight {...ICON} />}
            size="sm"
            tooltipSide="bottom"
            pressed={inspectorOpen}
            onClick={onToggle}
            data-testid="toolbar-inspector"
        />
    );
}

const LAST_EXPORT_KEY = 'kernelcad.export.lastFormat';

function readLastExport(): StudioExportFormat {
    try {
        const saved = localStorage.getItem(LAST_EXPORT_KEY);
        if (saved && EXPORT_FORMATS.some(f => f.id === saved)) return saved as StudioExportFormat;
    } catch {
        /* storage blocked: fall back to STL */
    }
    return 'stl';
}

/** The format the split button offers first: the last one used, else STL. */
export function useLastExportFormat(): [StudioExportFormat, (format: StudioExportFormat) => void] {
    const [format, setFormat] = useState<StudioExportFormat>(readLastExport);
    const remember = (next: StudioExportFormat) => {
        setFormat(next);
        try {
            localStorage.setItem(LAST_EXPORT_KEY, next);
        } catch {
            /* not remembered; the export still runs */
        }
    };
    return [format, remember];
}
