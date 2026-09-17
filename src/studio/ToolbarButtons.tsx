// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { CheckCircle2, Play, MessageSquare, Image as ImageIcon, Plug, Brush, Scissors, PanelRight, Share2 } from 'lucide-react';

export function AgentButton({ show, agentRailOpen, onToggleAgentRail }: {
    show: boolean;
    agentRailOpen: boolean;
    onToggleAgentRail: () => void;
}) {
    if (!show) return null;
    return (
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
    );
}

export function ConnectLink({ show }: { show: boolean }) {
    if (!show) return null;
    return (
        <a
            href="/connect"
            data-testid="toolbar-connect-link"
            aria-label="Connect to Claude Desktop"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-gray-300 hover:text-white hover:bg-[#222] transition-colors"
        >
            <Plug size={12} />
            Connect
        </a>
    );
}

export function MyDesignsLink({ show }: { show: boolean }) {
    if (!show) return null;
    return (
        <a
            href="/me"
            data-testid="toolbar-my-designs"
            aria-label="My Designs"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-gray-300 hover:text-white hover:bg-[#222] transition-colors"
        >
            My Designs
        </a>
    );
}

export function PublishButton({ publishState, onPublish }: {
    publishState: 'idle' | 'saving' | 'done' | 'error';
    onPublish: () => void;
}) {
    return (
        <button
            type="button"
            data-testid="toolbar-publish"
            onClick={onPublish}
            disabled={publishState === 'saving'}
            aria-label="Publish and share"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-gray-300 hover:text-white hover:bg-[#222] transition-colors disabled:opacity-50"
        >
            <Share2 size={12} />
            {publishState === 'saving' ? 'Publishing…' : publishState === 'error' ? 'Retry' : 'Publish & Share'}
        </button>
    );
}

export function ValidateButton({ onValidate }: { onValidate: () => void }) {
    return (
        <button
            type="button"
            onClick={onValidate}
            aria-label="Validate"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-gray-300 hover:text-white hover:bg-[#222] transition-colors"
        >
            <CheckCircle2 size={12} />
            Validate
        </button>
    );
}

export function RunButton({ onRun }: { onRun: () => void }) {
    return (
        <button
            type="button"
            onClick={onRun}
            aria-label="Run"
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
        >
            <Play size={12} />
            Run
        </button>
    );
}

export function BrushButton({ markingMode, onToggleMarkingMode }: {
    markingMode: boolean;
    onToggleMarkingMode: () => void;
}) {
    return (
        <button
            type="button"
            data-testid="toolbar-mark"
            onClick={onToggleMarkingMode}
            title={markingMode ? 'Save mark & exit (your agent can then pick it up)' : 'Paint over what is wrong, then click again to save'}
            aria-label={markingMode ? 'Save mark and exit marking mode' : 'Enter marking mode'}
            aria-pressed={markingMode}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
                markingMode
                    ? 'bg-red-600 text-white ring-2 ring-red-300'
                    : 'bg-[#2a1313] text-red-300 hover:bg-red-700 hover:text-white border border-red-700'
            }`}
        >
            <Brush size={14} />
            Brush
        </button>
    );
}

export function SectionButton({ sectionMode, onToggleSectionMode }: {
    sectionMode: boolean;
    onToggleSectionMode: () => void;
}) {
    return (
        <button
            type="button"
            data-testid="toolbar-section"
            onClick={onToggleSectionMode}
            title={sectionMode ? 'Exit section view' : 'Slice the model with a plane to see inside'}
            aria-label={sectionMode ? 'Exit section view' : 'Enter section view'}
            aria-pressed={sectionMode}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
                sectionMode
                    ? 'bg-sky-600 text-white ring-2 ring-sky-300'
                    : 'bg-[#13202a] text-sky-300 hover:bg-sky-700 hover:text-white border border-sky-700'
            }`}
        >
            <Scissors size={14} />
            Section
        </button>
    );
}

export function ReferenceButton({ show, referenceImagesVisible, onToggleReferenceImages }: {
    show: boolean;
    referenceImagesVisible: boolean;
    onToggleReferenceImages: () => void;
}) {
    if (!show) return null;
    return (
        <button
            type="button"
            onClick={onToggleReferenceImages}
            aria-label={referenceImagesVisible ? 'Hide reference images' : 'Show reference images'}
            aria-pressed={referenceImagesVisible}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                referenceImagesVisible
                    ? 'bg-[#333] text-white'
                    : 'text-gray-300 hover:text-white hover:bg-[#222]'
            }`}
        >
            <ImageIcon size={12} />
            Reference
        </button>
    );
}

export function EnvironmentButton({ show, renderEnvironmentVisible, renderEnvironmentPresetLabel, onToggleRenderEnvironment }: {
    show: boolean;
    renderEnvironmentVisible: boolean;
    renderEnvironmentPresetLabel: string;
    onToggleRenderEnvironment?: () => void;
}) {
    if (!show) return null;
    return (
        <button
            type="button"
            data-testid="toolbar-render-environment"
            onClick={onToggleRenderEnvironment}
            aria-label={renderEnvironmentVisible ? 'Disable HDRI environment' : 'Enable HDRI environment'}
            aria-pressed={renderEnvironmentVisible}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                renderEnvironmentVisible
                    ? 'bg-[#333] text-white'
                    : 'text-gray-300 hover:text-white hover:bg-[#222]'
            }`}
        >
            Env: {renderEnvironmentPresetLabel}
        </button>
    );
}

export function InspectorButton({ inspectorOpen, onToggleInspector }: {
    inspectorOpen: boolean;
    onToggleInspector: () => void;
}) {
    return (
        <button
            type="button"
            data-testid="toolbar-inspector"
            onClick={onToggleInspector}
            title={inspectorOpen ? 'Hide the inspector panel' : 'Show the inspector panel'}
            aria-label={inspectorOpen ? 'Hide inspector panel' : 'Show inspector panel'}
            aria-pressed={inspectorOpen}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                inspectorOpen
                    ? 'bg-[#333] text-white'
                    : 'text-gray-300 hover:text-white hover:bg-[#222]'
            }`}
        >
            <PanelRight size={12} />
            Inspector
        </button>
    );
}
