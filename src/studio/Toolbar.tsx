import { CheckCircle2, Play, MessageSquare } from 'lucide-react';

interface ToolbarProps {
    project: { name: string } | null;
    filename: string;
    isModified: boolean;
    onValidate: () => void;
    onRun: () => void;
    agentRailOpen: boolean;
    onToggleAgentRail: () => void;
}

export function Toolbar({
    project,
    filename,
    isModified,
    onValidate,
    onRun,
    agentRailOpen,
    onToggleAgentRail,
}: ToolbarProps) {
    return (
        <div
            data-testid="studio-toolbar"
            className="h-8 shrink-0 border-b border-[#2b313c] bg-[#111] flex items-center justify-between px-3 text-xs text-gray-300 select-none"
        >
            <div className="flex items-center gap-3 min-w-0">
                <span
                    data-testid="toolbar-project-chip"
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#222] text-gray-200 truncate max-w-[180px]"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="truncate">{project?.name ?? 'Untitled Project'}</span>
                </span>
                <span
                    data-testid="toolbar-filename"
                    className="truncate max-w-[240px] text-gray-400"
                >
                    {filename}
                </span>
                {isModified && (
                    <span
                        data-testid="toolbar-modified-dot"
                        aria-label="Unsaved changes"
                        className="w-2 h-2 rounded-full bg-amber-400"
                    />
                )}
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onValidate}
                    aria-label="Validate"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-gray-300 hover:text-white hover:bg-[#222] transition-colors"
                >
                    <CheckCircle2 size={12} />
                    Validate
                </button>
                <button
                    type="button"
                    onClick={onRun}
                    aria-label="Run"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                    <Play size={12} />
                    Run
                </button>
                <button
                    type="button"
                    onClick={onToggleAgentRail}
                    aria-label={agentRailOpen ? 'Close agent rail' : 'Open agent rail'}
                    aria-pressed={agentRailOpen}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                        agentRailOpen
                            ? 'bg-[#333] text-white'
                            : 'text-gray-300 hover:text-white hover:bg-[#222]'
                    }`}
                >
                    <MessageSquare size={12} />
                    Agent
                </button>
            </div>
        </div>
    );
}
