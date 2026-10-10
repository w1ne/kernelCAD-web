// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The toolbar that floats over the top of the viewport: Run, Validate,
// Section, Mark for agent, the camera and the display options. It replaces
// the second chrome row, so the model gets that height back.
import { useMemo, type JSX } from 'react';
import {
    Box, Check, Circle, Eye, Grid3x3, Image as ImageIcon, LayoutGrid, Maximize, Moon, PenLine, Play, Scissors,
    ShieldCheck, Sparkles, Sun, SquareDashed,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Kbd } from '../ui/Kbd';
import { Menu, type MenuEntry } from '../ui/Menu';
import { cx } from '../ui/cx';
import { KEYMAP, shortcutCombo } from '../shared/constants/shortcuts';
import type { ViewMode3D, ViewportBackground } from '../shared/types/viewMode';
import type { ViewTarget } from './components/viewer/controllers/cameraPose';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { viewTargetRequests } from './hooks/studioNavigation';
import { useIsNarrow } from './hooks/useIsNarrow';
import { OrderButton } from './OrderButton';

const ICON = { className: 'size-4', strokeWidth: 1.75 } as const;

/** The display controls the old header carried; they now sit in "View options". */
export interface ViewportDisplay {
    viewMode3D: ViewMode3D;
    setViewMode3D: (mode: ViewMode3D) => void;
    background: ViewportBackground;
    setBackground: (bg: ViewportBackground) => void;
    gridVisible: boolean;
    setGridVisible: (visible: boolean) => void;
}

export interface ViewportToolbarProps {
    onRun: () => void;
    onValidate: () => void;
    /** The last run failed: Run becomes the primary action. */
    runNeeded?: boolean;
    /** Inpainting-style review tool ("Mark for agent"). When on, an overlay
     *  takes the pointer so the user can paint over what is wrong; pressing
     *  it again saves the mark for the agent. */
    markingMode: boolean;
    onToggleMarkingMode: () => void;
    /** Section/cut tool: one movable plane clips the model. */
    sectionMode: boolean;
    onToggleSectionMode: () => void;
    /** The reference-image toggle shows only when the scene has one. */
    referenceImagesPresent: boolean;
    referenceImagesVisible: boolean;
    onToggleReferenceImages: () => void;
    /** The HDRI toggle shows only when the scene declares an environment. */
    renderEnvironmentPresent?: boolean;
    renderEnvironmentVisible?: boolean;
    renderEnvironmentPresetLabel?: string;
    onToggleRenderEnvironment?: () => void;
    display: ViewportDisplay;
}

const CAMERA_VIEWS: ReadonlyArray<{ target: ViewTarget; label: string }> = [
    { target: 'xy', label: 'Top view (XY)' },
    { target: 'xz', label: 'Front view (XZ)' },
    { target: 'yz', label: 'Right view (YZ)' },
];

const DISPLAY_MODES: ReadonlyArray<{ mode: ViewMode3D; label: string; icon: JSX.Element }> = [
    { mode: 'shadedWithEdges', label: 'Shaded with edges', icon: <Box {...ICON} /> },
    { mode: 'shaded', label: 'Shaded', icon: <Circle {...ICON} /> },
    { mode: 'wireframe', label: 'Wireframe', icon: <SquareDashed {...ICON} /> },
];

const BACKGROUNDS: ReadonlyArray<{ value: ViewportBackground; label: string; icon: JSX.Element }> = [
    { value: 'dark', label: 'Dark background', icon: <Moon {...ICON} /> },
    { value: 'light', label: 'Light background', icon: <Sun {...ICON} /> },
    { value: 'checkered', label: 'Checkered background', icon: <LayoutGrid {...ICON} /> },
];

/** A check marks the active choice; the others keep their own icon. */
function choiceIcon(active: boolean, icon: JSX.Element): JSX.Element {
    return active ? <Check {...ICON} className="size-4 text-accent" /> : icon;
}

/** The "View options" menu: camera presets, display mode, background, grid. */
function viewOptionEntries(display: ViewportDisplay): MenuEntry[] {
    const entries: MenuEntry[] = CAMERA_VIEWS.map((v) => ({
        id: `camera-${v.target}`,
        label: v.label,
        icon: <Eye {...ICON} />,
        onSelect: () => viewTargetRequests.request(v.target),
    }));
    entries.push({ id: 'sep-display', separator: true });
    for (const m of DISPLAY_MODES) {
        entries.push({
            id: `display-${m.mode}`,
            label: m.label,
            icon: choiceIcon(display.viewMode3D === m.mode, m.icon),
            onSelect: () => display.setViewMode3D(m.mode),
        });
    }
    entries.push({ id: 'sep-background', separator: true });
    for (const b of BACKGROUNDS) {
        entries.push({
            id: `background-${b.value}`,
            label: b.label,
            icon: choiceIcon(display.background === b.value, b.icon),
            onSelect: () => display.setBackground(b.value),
        });
    }
    entries.push(
        { id: 'sep-grid', separator: true },
        {
            id: 'grid',
            label: display.gridVisible ? 'Hide ground grid' : 'Show ground grid',
            icon: <Grid3x3 {...ICON} />,
            onSelect: () => display.setGridVisible(!display.gridVisible),
        },
    );
    return entries;
}

function Divider(): JSX.Element {
    return <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

function RunControl({ onRun, runNeeded, size }: {
    onRun: () => void;
    runNeeded: boolean;
    size: 'sm' | 'touch';
}): JSX.Element {
    if (runNeeded) {
        return (
            <Button
                variant="primary"
                size="sm"
                onClick={onRun}
                aria-label="Run"
                aria-keyshortcuts="Meta+Enter Control+Enter"
                leadingIcon={<Play {...ICON} />}
                trailingIcon={size === 'sm' ? <Kbd keys={KEYMAP.run} className="ml-1 opacity-80" /> : undefined}
                className={cx(size === 'touch' && 'h-touch')}
            >
                Run
            </Button>
        );
    }
    return (
        <IconButton
            label="Run"
            description="Re-run the script"
            shortcut={KEYMAP.run}
            icon={<Play {...ICON} />}
            size={size}
            tooltipSide="bottom"
            onClick={onRun}
        />
    );
}

/** Mod+Enter runs, also from the code editor (not from other text fields). */
function useRunShortcut(onRun: () => void): void {
    const bindings = useMemo(() => ({ [shortcutCombo(KEYMAP.run)]: () => onRun() }), [onRun]);
    const options = useMemo(() => ({
        shouldAllowInTypingTarget: ({ combo, event }: { combo: string; event: KeyboardEvent }) =>
            combo === shortcutCombo(KEYMAP.run)
            && event.target instanceof Element
            && event.target.closest('.monaco-editor') !== null,
    }), []);
    useKeyboardShortcuts(bindings, options);
}

function OptionalToggles(props: ViewportToolbarProps): JSX.Element {
    const {
        referenceImagesPresent, referenceImagesVisible, onToggleReferenceImages,
        renderEnvironmentPresent = false, renderEnvironmentVisible = true, renderEnvironmentPresetLabel = '',
        onToggleRenderEnvironment,
    } = props;
    const size = useIsNarrow() ? 'touch' : 'sm';
    return (
        <>
            {referenceImagesPresent && (
                <IconButton
                    label={referenceImagesVisible ? 'Hide reference images' : 'Show reference images'}
                    icon={<ImageIcon {...ICON} />}
                    size={size}
                    tooltipSide="bottom"
                    pressed={referenceImagesVisible}
                    onClick={onToggleReferenceImages}
                />
            )}
            {renderEnvironmentPresent && (
                <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={renderEnvironmentVisible}
                    aria-label={renderEnvironmentVisible ? 'Disable HDRI environment' : 'Enable HDRI environment'}
                    onClick={onToggleRenderEnvironment}
                    data-testid="toolbar-render-environment"
                >
                    Env: {renderEnvironmentPresetLabel}
                </Button>
            )}
        </>
    );
}

export function ViewportToolbar(props: ViewportToolbarProps): JSX.Element {
    const {
        onRun, onValidate, runNeeded = false, markingMode, onToggleMarkingMode, sectionMode, onToggleSectionMode,
        display,
    } = props;
    // Phones get 44 px touch targets; the desktop toolbar stays dense.
    const narrow = useIsNarrow();
    const size = narrow ? 'touch' : 'sm';
    useRunShortcut(onRun);

    return (
        <div
            role="toolbar"
            aria-label="Model tools"
            data-testid="studio-toolbar"
            data-theme="dark"
            // Above the marking overlay (z 1000): "Mark for agent" must stay
            // clickable to save the mark and leave marking mode.
            className="pointer-events-auto absolute left-1/2 top-3 z-[1001] flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-0.5 rounded-panel border border-border bg-surface-1/95 p-1 shadow-e1 backdrop-blur-sm"
        >
            <RunControl onRun={onRun} runNeeded={runNeeded} size={size} />
            <IconButton
                label="Validate"
                description="Re-run the checks"
                icon={<ShieldCheck {...ICON} />}
                size={size}
                tooltipSide="bottom"
                onClick={onValidate}
            />
            <Divider />
            <IconButton
                label={sectionMode ? 'Exit section view' : 'Section view'}
                description="Cut the model with a plane to see inside"
                icon={<Scissors {...ICON} />}
                size={size}
                tooltipSide="bottom"
                pressed={sectionMode}
                onClick={onToggleSectionMode}
                data-testid="toolbar-section"
            />
            <IconButton
                label={markingMode ? 'Save mark for agent' : 'Mark for agent'}
                description={markingMode
                    ? 'Save the mark and exit; your agent picks it up'
                    : 'Paint over what is wrong, then press again to save'}
                icon={markingMode ? <Sparkles {...ICON} /> : <PenLine {...ICON} />}
                size={size}
                tooltipSide="bottom"
                pressed={markingMode}
                variant={markingMode ? 'agent' : 'ghost'}
                onClick={onToggleMarkingMode}
                data-testid="toolbar-mark"
            />
            <Divider />
            <OrderButton size={size} />
            <IconButton
                label="Fit model in view"
                icon={<Maximize {...ICON} />}
                size={size}
                tooltipSide="bottom"
                onClick={() => viewTargetRequests.request('fit')}
                data-testid="toolbar-fit"
            />
            <Menu
                align="end"
                label="View options"
                items={viewOptionEntries(display)}
                trigger={(triggerProps) => (
                    <IconButton
                        {...triggerProps}
                        label="View options"
                        icon={<Eye {...ICON} />}
                        size={size}
                        tooltipSide="bottom"
                        data-testid="toolbar-view-options"
                    />
                )}
            />
            <OptionalToggles {...props} />
        </div>
    );
}
