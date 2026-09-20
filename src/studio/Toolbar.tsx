// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { OverflowMenu } from './components/Layout/OverflowMenu';
import { useIsNarrow } from './hooks/useIsNarrow';
import { usePublishAction } from './usePublishAction';
import {
    AgentButton, ConnectLink, MyDesignsLink, PublishButton, ValidateButton, RunButton,
    BrushButton, SectionButton, ReferenceButton, EnvironmentButton, InspectorButton,
} from './ToolbarButtons';

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
    /** Current editor code — passed to saveProject on publish. */
    code: string;
    /** Active project name — used as the publish title (falls back to first
     *  60 chars of code, then "Untitled"). */
    projectName?: string;
}

function buildToolbarButtons(
    {
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
    }: ToolbarProps,
    publish: ReturnType<typeof usePublishAction>,
) {
    const { session, publishState, handlePublish } = publish;

    const agentButton = (
        <AgentButton
            show={enableAgentRail && !agentRailHidden}
            agentRailOpen={agentRailOpen}
            onToggleAgentRail={onToggleAgentRail}
        />
    );
    const connectLink = <ConnectLink show={enableConnect} />;
    const myDesignsLink = <MyDesignsLink show={!!session} />;
    const publishButton = <PublishButton publishState={publishState} onPublish={() => void handlePublish()} />;
    const validateButton = <ValidateButton onValidate={onValidate} />;
    const runButton = <RunButton onRun={onRun} />;
    const brushButton = <BrushButton markingMode={markingMode} onToggleMarkingMode={onToggleMarkingMode} />;
    const sectionButton = <SectionButton sectionMode={sectionMode} onToggleSectionMode={onToggleSectionMode} />;
    const referenceButton = (
        <ReferenceButton
            show={referenceImagesPresent}
            referenceImagesVisible={referenceImagesVisible}
            onToggleReferenceImages={onToggleReferenceImages}
        />
    );
    const environmentButton = (
        <EnvironmentButton
            show={renderEnvironmentPresent}
            renderEnvironmentVisible={renderEnvironmentVisible}
            renderEnvironmentPresetLabel={renderEnvironmentPresetLabel}
            onToggleRenderEnvironment={onToggleRenderEnvironment}
        />
    );
    const inspectorButton = <InspectorButton inspectorOpen={inspectorOpen} onToggleInspector={onToggleInspector} />;

    return {
        agentButton,
        connectLink,
        myDesignsLink,
        publishButton,
        validateButton,
        runButton,
        brushButton,
        sectionButton,
        referenceButton,
        environmentButton,
        inspectorButton,
    };
}

export function Toolbar(props: ToolbarProps) {
    const publish = usePublishAction(props.code, props.projectName);
    // Below `md` only the two act-on-the-model buttons (Validate / Run) stay on
    // the bar; everything else moves into the overflow menu. Previously the
    // whole set stayed inline and Run was pushed past the right edge of a
    // phone screen, into a scroll region with no visible scrollbar.
    const narrow = useIsNarrow();
    const {
        agentButton, connectLink, myDesignsLink, publishButton, validateButton, runButton,
        brushButton, sectionButton, referenceButton, environmentButton, inspectorButton,
    } = buildToolbarButtons(props, publish);

    return (
        <div
            data-testid="studio-toolbar"
            className="h-8 shrink-0 border-b border-[#2b313c] bg-[#111] flex items-center gap-2 px-2 md:px-3 text-xs text-gray-300 select-none bar-scroll-x"
        >
            <div className="flex items-center gap-2 shrink-0">
                {narrow ? (
                    <OverflowMenu label="More studio actions" align="left" testId="toolbar-overflow">
                        <div className="flex flex-col gap-1 min-w-[190px] [&_a]:w-full [&_button]:w-full [&_a]:justify-start [&_button]:justify-start [&_a]:py-2 [&_button]:py-2">
                            {agentButton}
                            {connectLink}
                            {myDesignsLink}
                            {publishButton}
                            <div className="h-px bg-[#2b313c] my-1" />
                            {brushButton}
                            {sectionButton}
                            {referenceButton}
                            {environmentButton}
                            {inspectorButton}
                        </div>
                    </OverflowMenu>
                ) : (
                    <>
                        {agentButton}
                        {connectLink}
                        {myDesignsLink}
                        {publishButton}
                    </>
                )}
                {publish.publishedLink && (
                    <a
                        href={publish.publishedLink}
                        data-testid="toolbar-publish-link"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-emerald-400 hover:text-emerald-300 text-xs transition-colors truncate max-w-[45vw]"
                    >
                        Link copied — {publish.publishedLink}
                    </a>
                )}
                {props.isModified && (
                    <span
                        data-testid="toolbar-modified-dot"
                        aria-label="Unsaved changes"
                        className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
                    />
                )}
            </div>

            <div className="flex items-center gap-2 ml-auto shrink-0">
                {validateButton}
                {runButton}
                {!narrow && (
                    <>
                        {brushButton}
                        {sectionButton}
                        {referenceButton}
                        {environmentButton}
                        {inspectorButton}
                    </>
                )}
            </div>
        </div>
    );
}
