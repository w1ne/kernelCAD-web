import { AlertTriangle, CheckCircle2, Loader2, MousePointer2 } from 'lucide-react';
import type { StudioLayoutMode } from '../../types/layout';
import type { ViewMode3D } from '../../types/viewMode';

interface StatusBarProps {
    isComputing: boolean;
    error: string | null;
    geometryCount: number;
    selectedCount: number;
    viewMode3D: ViewMode3D;
    layoutMode: StudioLayoutMode;
    activeCommandLabel: string | null;
}

function formatViewMode(mode: ViewMode3D): string {
    if (mode === 'shadedWithEdges') return 'Shaded + edges';
    if (mode === 'wireframe') return 'Wireframe';
    return 'Shaded';
}

function formatLayoutMode(mode: StudioLayoutMode): string {
    if (mode === 'split') return 'Split';
    if (mode === 'viewport') return 'Viewport';
    return 'Code';
}

function compactError(error: string): string {
    const firstLine = error.split('\n')[0]?.trim() || 'Unknown error';
    return firstLine.length > 96 ? `${firstLine.slice(0, 93)}...` : firstLine;
}

export function StatusBar({
    isComputing,
    error,
    geometryCount,
    selectedCount,
    viewMode3D,
    layoutMode,
    activeCommandLabel,
}: StatusBarProps) {
    const stateLabel = error ? 'Error' : isComputing ? 'Computing...' : 'Ready';
    const bodyLabel = geometryCount === 1 ? '1 body' : `${geometryCount} bodies`;
    const selectionLabel = selectedCount === 1 ? '1 selected' : `${selectedCount} selected`;

    return (
        <footer
            data-testid="status-bar"
            className="h-6 shrink-0 border-t border-[#2b313c] bg-[#101318] text-[11px] text-gray-400 flex items-center justify-between px-3 select-none"
        >
            <div className="flex items-center gap-3 min-w-0">
                <span className={`inline-flex items-center gap-1 font-medium ${error ? 'text-red-300' : isComputing ? 'text-blue-300' : 'text-emerald-300'}`}>
                    {error ? <AlertTriangle size={12} /> : isComputing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    {stateLabel}
                </span>
                {activeCommandLabel && (
                    <span className="text-blue-300">{activeCommandLabel}</span>
                )}
                {error ? (
                    <span className="truncate text-red-200 max-w-[48vw]">{compactError(error)}</span>
                ) : (
                    <span className="truncate">No diagnostics</span>
                )}
            </div>
            <div className="flex items-center gap-3">
                <span>{bodyLabel}</span>
                <span className="inline-flex items-center gap-1">
                    <MousePointer2 size={12} />
                    {selectionLabel}
                </span>
                <span>{formatViewMode(viewMode3D)}</span>
                <span>{formatLayoutMode(layoutMode)}</span>
            </div>
        </footer>
    );
}
