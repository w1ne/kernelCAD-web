// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { CheckCircle2, Play, MessageSquare, Image as ImageIcon, Plug, Brush, Scissors, PanelRight } from 'lucide-react';

interface ToolbarProps {
    isModified: boolean;
    onValidate: () => void;
    onRun: () => void;
    agentRailOpen: boolean;
    onToggleAgentRail: () => void;
    /** Embed-mode opt-out: when false, the Agent toggle button is hidden
     *  entirely (the rail itself is also unmounted in `StudioShell`).
     *  Default true (standalone). */
    enableAgentRail?: boolean;
    /** Embed-mode opt-out for the "Connect to Claude Desktop" link. The
     *  target route (`/connect`) only exists in the standalone kernelcad.app
     *  deploy, so hosts (proto.cat) hide it to avoid dead links. Default
     *  true (standalone). */
    enableConnect?: boolean;
    /** True iff at least one referenceImage record is present in the current
     *  scene. The toggle button only renders when this is true; otherwise the
     *  toolbar slot stays empty so casual scripts don't see a dead button. */
    referenceImagesPresent: boolean;
    /** Current visibility of the `__referenceImages` overlay group. */
    referenceImagesVisible: boolean;
    onToggleReferenceImages: () => void;
    /** True iff at least one renderEnvironment record is present in the current scene. */
    renderEnvironmentPresent?: boolean;
    /** Current visibility / on-state of the HDRI environment (off = renderer falls back to default rig). */
    renderEnvironmentVisible?: boolean;
    /** Display label for the active preset ('studio', 'custom', etc.). */
    renderEnvironmentPresetLabel?: string;
    onToggleRenderEnvironment?: () => void;
    /** Inpainting-style review tool. When on, an HTML canvas overlay absorbs
     *  pointer events so the user can paint over what's wrong in the
     *  viewport; Send POSTs a packet that the agent's UserPromptSubmit hook
     *  picks up on the next turn. */
    markingMode: boolean;
    onToggleMarkingMode: () => void;
    /** Section/cut tool — clips the model with one movable plane to reveal internals. */
    sectionMode: boolean;
    onToggleSectionMode: () => void;
    /** Right-side Inspector panel visibility. */
    inspectorOpen: boolean;
    onToggleInspector: () => void;
    /** When true the agent-rail toggle button is not rendered. Used in
     * viewer mode where the model is driven by an external agent. */
    agentRailHidden?: boolean;
}

export function Toolbar({
    isModified,
    onValidate,
    onRun,
    agentRailOpen,
    onToggleAgentRail,
    enableAgentRail = true,
    enableConnect = true,
    referenceImagesPresent,
    referenceImagesVisible,
    onToggleReferenceImages,
    renderEnvironmentPresent = false,
    renderEnvironmentVisible = true,
    renderEnvironmentPresetLabel = '',
    onToggleRenderEnvironment,
    markingMode,
    onToggleMarkingMode,
    sectionMode,
    onToggleSectionMode,
    inspectorOpen,
    onToggleInspector,
    agentRailHidden = false,
}: ToolbarProps) {
    return (
        <div
            data-testid="studio-toolbar"
            className="h-8 shrink-0 border-b border-[#2b313c] bg-[#111] flex items-center justify-between px-3 text-xs text-gray-300 select-none"
        >
            <div className="flex items-center gap-2 min-w-0">
                {enableAgentRail && !agentRailHidden && (
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
                )}
                {enableConnect && (
                    <a
                        href="/connect"
                        data-testid="toolbar-connect-link"
                        aria-label="Connect to Claude Desktop"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-gray-300 hover:text-white hover:bg-[#222] transition-colors"
                    >
                        <Plug size={12} />
                        Connect
                    </a>
                )}
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
                {referenceImagesPresent && (
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
                )}
                {renderEnvironmentPresent && (
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
                )}
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
            </div>
        </div>
    );
}
