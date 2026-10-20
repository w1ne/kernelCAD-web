// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The toolbar that floats over the top of the viewport: Run, Validate,
// Section, Mark for agent, the camera and the display options. It replaces
// the second chrome row, so the model gets that height back.
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type JSX, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import {
    Box, Check, Circle, Eye, Grid3x3, GripVertical, Image as ImageIcon, LayoutGrid, Maximize, Moon, MoreHorizontal, PenLine, Play,
    Scissors, ShieldCheck, Sparkles, Sun, SquareDashed,
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
import { PHONE_QUERY, useIsNarrow } from './hooks/useIsNarrow';
import { OrderButton } from './OrderButton';
import { CORNER_INSET_VAR, TOOL_DOCK_SLOT_ID, registerToolDock } from './components/viewer/cornerControls';

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

/** Hidden on phones, where the toolbar needs every pixel to stay one row. */
function Divider(): JSX.Element {
    return <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-border max-md:hidden" />;
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
    const size = useIsNarrow(PHONE_QUERY) ? 'touch' : 'sm';
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

/** On a phone the tools that are used least fold into one "More tools" menu,
 *  so the toolbar stays one row of 44 px targets on a 360 px screen. */
function moreToolEntries(props: ViewportToolbarProps, includeRun: boolean): MenuEntry[] {
    const { onRun, onValidate, sectionMode, onToggleSectionMode, markingMode, onToggleMarkingMode } = props;
    const entries: MenuEntry[] = [];
    if (includeRun) entries.push({ id: 'run', label: 'Run', icon: <Play {...ICON} />, onSelect: onRun });
    entries.push(
        { id: 'validate', label: 'Validate', icon: <ShieldCheck {...ICON} />, onSelect: onValidate },
        {
            id: 'section',
            label: sectionMode ? 'Exit section view' : 'Section view',
            icon: choiceIcon(sectionMode, <Scissors {...ICON} />),
            onSelect: onToggleSectionMode,
        },
        {
            id: 'mark',
            label: markingMode ? 'Save mark for agent' : 'Mark for agent',
            icon: markingMode ? <Sparkles {...ICON} /> : <PenLine {...ICON} />,
            onSelect: onToggleMarkingMode,
        },
    );
    return entries;
}

const TOOLBAR_PLACE_KEY = 'kernelcad:toolbar-place';

interface ToolbarPlace { left: number; top: number }

function readToolbarPlace(): ToolbarPlace | null {
    try {
        const raw = localStorage.getItem(TOOLBAR_PLACE_KEY);
        if (!raw) return null;
        const place = JSON.parse(raw) as ToolbarPlace;
        if (typeof place.left === 'number' && typeof place.top === 'number') return place;
    } catch {
        // A bad stored place falls back to the centered default.
    }
    return null;
}

/** Drag the grip to park the toolbar. A double-click puts it back on top. */
function useToolbarDrag(barRef: RefObject<HTMLDivElement | null>) {
    const [place, setPlace] = useState<ToolbarPlace | null>(readToolbarPlace);
    const drag = useRef<{ ox: number; oy: number } | null>(null);

    const onGripDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
        const bar = barRef.current;
        const host = bar?.parentElement;
        if (!bar || !host || event.button !== 0) return;
        event.preventDefault();
        const barBox = bar.getBoundingClientRect();
        drag.current = { ox: event.clientX - barBox.left, oy: event.clientY - barBox.top };
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* not every test host implements capture */ }
        const move = (ev: PointerEvent) => {
            const current = barRef.current;
            const parent = current?.parentElement;
            if (!current || !parent || !drag.current) return;
            const h = parent.getBoundingClientRect();
            const b = current.getBoundingClientRect();
            const left = Math.min(Math.max(8, ev.clientX - h.left - drag.current.ox), Math.max(8, h.width - b.width - 8));
            const top = Math.min(Math.max(8, ev.clientY - h.top - drag.current.oy), Math.max(8, h.height - b.height - 8));
            setPlace({ left, top });
        };
        const up = () => {
            drag.current = null;
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            setPlace((current) => {
                if (current) localStorage.setItem(TOOLBAR_PLACE_KEY, JSON.stringify(current));
                return current;
            });
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }, [barRef]);

    const reset = useCallback(() => {
        localStorage.removeItem(TOOLBAR_PLACE_KEY);
        setPlace(null);
    }, []);

    return { place, onGripDown, reset };
}

/** Width of the top-left Studio control cluster (Measure, Dimensions, Markup, Explode). */
const CORNER_CONTROLS_RIGHT_PX = 220;

/** Publish the toolbar's footprint so corner controls never sit under it.
 *  The inset is 0 when the toolbar does not reach the corner (wide viewport). */
function useCornerInset() {
    const ref = useRef<HTMLDivElement | null>(null);
    useLayoutEffect(() => {
        const bar = ref.current;
        const host = bar?.parentElement;
        if (!bar || !host) return undefined;
        const update = () => {
            const b = bar.getBoundingClientRect();
            const h = host.getBoundingClientRect();
            const overlaps = b.left - h.left < CORNER_CONTROLS_RIGHT_PX;
            host.style.setProperty(CORNER_INSET_VAR, overlaps ? `${Math.ceil(b.bottom - h.top)}px` : '0px');
        };
        update();
        if (typeof ResizeObserver !== 'function') return () => host.style.removeProperty(CORNER_INSET_VAR);
        const observer = new ResizeObserver(update);
        observer.observe(bar);
        observer.observe(host);
        return () => {
            observer.disconnect();
            host.style.removeProperty(CORNER_INSET_VAR);
        };
    }, []);
    return ref;
}

type ToolSize = 'sm' | 'touch';

/** Run, Validate, Section and Mark. On a phone only the ones that must stay
 *  one tap away show here (Run after a failed run, Save mark while marking);
 *  the rest are in More tools. */
function ScriptTools({ props, phone, size }: { props: ViewportToolbarProps; phone: boolean; size: ToolSize }): JSX.Element {
    const { onRun, onValidate, runNeeded = false, markingMode, onToggleMarkingMode, sectionMode, onToggleSectionMode } = props;
    const showRun = !phone || runNeeded;
    const showMark = !phone || markingMode;
    return (
        <>
            {showRun && <RunControl onRun={onRun} runNeeded={runNeeded} size={size} />}
            {!phone && (
                <>
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
                </>
            )}
            {showMark && (
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
            )}
        </>
    );
}

/** Order, Fit, View options, the optional toggles and (phone) More tools. */
function ViewTools({ props, phone, size }: { props: ViewportToolbarProps; phone: boolean; size: ToolSize }): JSX.Element {
    const { display, runNeeded = false, sectionMode } = props;
    return (
        <>
            <OrderButton size={size} compact={phone} />
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
            {phone && (
                <Menu
                    align="end"
                    label="More tools"
                    items={moreToolEntries(props, !runNeeded)}
                    trigger={(triggerProps) => (
                        <IconButton
                            {...triggerProps}
                            label="More tools"
                            icon={<MoreHorizontal {...ICON} />}
                            size={size}
                            tooltipSide="bottom"
                            pressed={sectionMode}
                            data-testid="toolbar-more-tools"
                        />
                    )}
                />
            )}
        </>
    );
}

function MoveGrip({ onGripDown, reset }: Pick<ReturnType<typeof useToolbarDrag>, 'onGripDown' | 'reset'>): JSX.Element {
    return (
        <button
            type="button"
            aria-label="Move tools"
            title="Drag to move. Double-click to put back."
            data-testid="toolbar-move"
            className="cursor-grab touch-none rounded-control px-0.5 text-fg-3 hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
            onPointerDown={onGripDown}
            onDoubleClick={reset}
        >
            <GripVertical className="size-4" aria-hidden="true" />
        </button>
    );
}

const BAR_CLASS = 'pointer-events-auto absolute z-[1001] w-max max-w-[calc(100%-1.5rem)] rounded-panel border border-border bg-surface-1/95 p-1 shadow-e1 backdrop-blur-sm';
const PHONE_ROW_CLASS = 'bar-scroll-x flex flex-nowrap items-center gap-0 [&_button]:min-h-touch [&_button]:min-w-touch';
const DESKTOP_ROW_CLASS = 'flex flex-wrap items-center justify-center gap-0.5 max-md:gap-0';

export function ViewportToolbar(props: ViewportToolbarProps): JSX.Element {
    // Phones get 44 px touch targets in one row that never wraps; the
    // desktop toolbar stays dense.
    const phone = useIsNarrow(PHONE_QUERY);
    const size: ToolSize = phone ? 'touch' : 'sm';
    useRunShortcut(props.onRun);
    const ref = useCornerInset();
    const { place: storedPlace, onGripDown, reset } = useToolbarDrag(ref);
    // A phone has no room to park the toolbar elsewhere: it stays on top.
    const place = phone ? null : storedPlace;
    const anchor = phone ? 'left-1/2 top-2 -translate-x-1/2' : 'left-1/2 top-3 -translate-x-1/2';

    return (
        <div
            ref={ref}
            role="toolbar"
            aria-label="Model tools"
            data-testid="studio-toolbar"
            data-placed={place ? 'true' : 'false'}
            data-layout={phone ? 'phone' : 'desktop'}
            // The phone camera fit frames the model below this bar.
            data-viewport-occluder=""
            data-theme="dark"
            // Above the marking overlay (z 1000): "Mark for agent" must stay
            // clickable to save the mark and leave marking mode. On a desktop
            // it wraps rather than spill past a narrow split pane; on a phone
            // it is one row that scrolls sideways if a tool panel widens it.
            // A stored place drops the centered anchor so the grip can park it.
            style={place ? { left: place.left, top: place.top } : undefined}
            className={cx(BAR_CLASS, place ? '' : anchor)}
        >
            <div data-testid="studio-toolbar-row" className={phone ? PHONE_ROW_CLASS : DESKTOP_ROW_CLASS}>
                {!phone && <MoveGrip onGripDown={onGripDown} reset={reset} />}
                <div id={TOOL_DOCK_SLOT_ID} ref={registerToolDock} className="contents" data-testid="toolbar-viewer-tools" />
                <ScriptTools props={props} phone={phone} size={size} />
                <Divider />
                <ViewTools props={props} phone={phone} size={size} />
            </div>
        </div>
    );
}
