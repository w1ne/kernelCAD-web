// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The Studio's commands for the command palette. `buildStudioCommands` is a
// pure function of the Studio state, so the command set is testable without
// a viewer; `useStudioCommands` feeds it from the workbench contexts.
// Only actions the Studio really has are registered: a command must do the
// same thing as the toolbar, header or tab control it mirrors.
import { createElement, useMemo, type ComponentType } from 'react';
import {
    Box, Code2, Cuboid, Download, FilePlus, Film, FolderOpen, Grid3x3, Image, Keyboard, Layers, Link2,
    ListChecks, Maximize, Moon, PanelRight, PenLine, Play, Scissors, ShieldCheck, SlidersHorizontal,
    SquareDashed, Sun, X,
} from 'lucide-react';
import type { Command } from './useCommandRegistry';
import type { ViewTarget } from '../components/viewer/controllers/cameraPose';
import type { ViewMode3D, ViewportBackground } from '../../shared/types/viewMode';
import type { TabId } from '../types';
import type { ProjectMetadata } from '../../authoring/projectService';
import type { StudioExportFormat } from '../exportViaServer';
import { EXPORT_FORMATS } from '../exportFormats';
import { STARTERS, studioStarterCode, type StarterModel } from '../start/starterModels';
import { KEYMAP } from '../../shared/constants/shortcuts';

const ICON_PROPS = { className: 'size-4', strokeWidth: 1.75, 'aria-hidden': true } as const;
const icon = (c: ComponentType<typeof ICON_PROPS>) => createElement(c, ICON_PROPS);

/** Inspector tabs a command can open, with their palette wording. */
const TAB_COMMANDS: ReadonlyArray<{ tab: TabId; label: string; keywords: string[]; icon: ComponentType<typeof ICON_PROPS> }> = [
    { tab: 'code', label: 'Show code', keywords: ['editor', 'source', 'script'], icon: Code2 },
    { tab: 'params', label: 'Customize parameters', keywords: ['params', 'sizes', 'dimensions', 'sliders'], icon: SlidersHorizontal },
    { tab: 'validity', label: 'Show checks', keywords: ['validity', 'validate', 'interferences', 'errors'], icon: ListChecks },
    { tab: 'scene', label: 'Show model tree', keywords: ['scene', 'features', 'bodies', 'parts'], icon: Layers },
    { tab: 'joints', label: 'Show joints', keywords: ['mates', 'kinematics', 'assembly'], icon: Link2 },
    { tab: 'animation', label: 'Show animation', keywords: ['play', 'motion'], icon: Film },
    { tab: 'export', label: 'Show export options', keywords: ['download', 'formats'], icon: Download },
];

const DISPLAY_MODES: ReadonlyArray<{ mode: ViewMode3D; label: string; icon: ComponentType<typeof ICON_PROPS> }> = [
    { mode: 'shadedWithEdges', label: 'Shaded with edges', icon: Cuboid },
    { mode: 'shaded', label: 'Shaded', icon: Box },
    { mode: 'wireframe', label: 'Wireframe', icon: SquareDashed },
];

const CAMERA_VIEWS: ReadonlyArray<{ target: ViewTarget; label: string; keywords: string[] }> = [
    { target: 'fit', label: 'Fit model in view', keywords: ['zoom', 'home', 'frame', 'reset camera'] },
    { target: 'xy', label: 'Top view (XY)', keywords: ['camera', 'plan'] },
    { target: 'xz', label: 'Front view (XZ)', keywords: ['camera', 'elevation'] },
    { target: 'yz', label: 'Right view (YZ)', keywords: ['camera', 'side'] },
];

const BACKGROUNDS: ReadonlyArray<{ value: ViewportBackground; label: string; icon: ComponentType<typeof ICON_PROPS> }> = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'checkered', label: 'Checkered', icon: Grid3x3 },
];

export interface StudioCommandState {
    /** Read-only review page: no edits, no new projects. */
    viewerMode: boolean;
    hasGeometry: boolean;
    hasPlanarGeometry: boolean;
    visibleTabs: readonly TabId[];
    viewMode3D: ViewMode3D;
    viewportBackground: ViewportBackground;
    gridVisible: boolean;
    markingMode: boolean;
    sectionMode: boolean;
    inspectorOpen: boolean;
    /** Viewer pick linked to a code range (a face or edge click). */
    codeLinkFeature: string | null;
    /** Anything selected in the viewer or the code link. */
    hasSelection: boolean;
    projects: readonly ProjectMetadata[];
    activeProjectId: string | null;
}

export interface StudioCommandActions {
    run: () => void;
    validate: () => void;
    setViewMode3D: (mode: ViewMode3D) => void;
    setViewportBackground: (bg: ViewportBackground) => void;
    setGridVisible: (visible: boolean) => void;
    toggleMarkingMode: () => void;
    toggleSectionMode: () => void;
    toggleInspector: () => void;
    showTab: (tab: TabId) => void;
    viewTarget: (target: ViewTarget) => void;
    exportFormat: (format: StudioExportFormat, label: string) => void;
    savePng: () => void;
    clearSelection: () => void;
    openProjectManager: () => void;
    openProject: (id: string) => void;
    newFromStarter: (model: StarterModel, code: string) => void;
    showShortcuts: () => void;
}

/** How many other local projects the palette lists. */
const LOCAL_PROJECT_LIMIT = 5;

type S = StudioCommandState;
type A = StudioCommandActions;

function selectionCommands(s: S, a: A): Command[] {
    const commands: Command[] = [];
    if (s.codeLinkFeature !== null) {
        commands.push({
            id: 'selection.reveal-in-code',
            label: 'Reveal selection in code',
            description: `The code that made ${s.codeLinkFeature}`,
            section: 'Selection',
            keywords: ['go to code', 'source', 'jump'],
            icon: icon(Code2),
            action: () => a.showTab('code'),
        });
    }
    if (s.hasSelection) {
        commands.push({
            id: 'selection.clear',
            label: 'Clear selection',
            section: 'Selection',
            keywords: ['deselect', 'unselect'],
            icon: icon(X),
            action: a.clearSelection,
        });
    }
    return commands;
}

function modelingCommands(s: S, a: A): Command[] {
    if (s.viewerMode) return [];
    return [
        {
            id: 'model.run',
            label: 'Run model',
            description: 'Re-run the script',
            section: 'Modeling',
            keywords: ['rebuild', 'recompute', 'execute'],
            icon: icon(Play),
            action: a.run,
        },
        {
            id: 'model.validate',
            label: 'Validate model',
            description: 'Re-run the checks',
            section: 'Modeling',
            keywords: ['check', 'verify', 'review'],
            icon: icon(ShieldCheck),
            action: a.validate,
        },
        {
            id: 'model.mark-for-agent',
            label: s.markingMode ? 'Stop marking for the agent' : 'Mark for agent',
            description: 'Paint on the view and add a note for your agent',
            section: 'Modeling',
            keywords: ['brush', 'annotate', 'paint', 'review'],
            icon: icon(PenLine),
            action: a.toggleMarkingMode,
        },
    ];
}

function viewCommands(s: S, a: A): Command[] {
    const commands: Command[] = [{
        id: 'view.section',
        label: s.sectionMode ? 'Close section view' : 'Section view',
        description: 'Cut the model with a plane',
        section: 'View',
        keywords: ['cut', 'clip', 'cross section'],
        icon: icon(Scissors),
        action: a.toggleSectionMode,
    }];
    for (const v of CAMERA_VIEWS) {
        commands.push({
            id: `view.camera.${v.target}`,
            label: v.label,
            section: 'View',
            keywords: v.keywords,
            icon: icon(Maximize),
            disabled: !s.hasGeometry,
            action: () => a.viewTarget(v.target),
        });
    }
    for (const m of DISPLAY_MODES) {
        if (m.mode === s.viewMode3D) continue;
        commands.push({
            id: `view.display.${m.mode}`,
            label: `Display: ${m.label}`,
            section: 'View',
            keywords: ['render', 'style', 'mode'],
            icon: icon(m.icon),
            action: () => a.setViewMode3D(m.mode),
        });
    }
    for (const b of BACKGROUNDS) {
        if (b.value === s.viewportBackground) continue;
        commands.push({
            id: `view.background.${b.value}`,
            label: `Background: ${b.label}`,
            section: 'View',
            keywords: ['theme', 'viewport', 'color', b.value],
            icon: icon(b.icon),
            action: () => a.setViewportBackground(b.value),
        });
    }
    commands.push(
        {
            id: 'view.grid',
            label: s.gridVisible ? 'Hide ground grid' : 'Show ground grid',
            section: 'View',
            keywords: ['floor', 'plane'],
            icon: icon(Grid3x3),
            action: () => a.setGridVisible(!s.gridVisible),
        },
        {
            id: 'view.save-png',
            label: 'Save view as PNG',
            description: 'The model as you see it, without the grid',
            section: 'View',
            keywords: ['render', 'screenshot', 'image', 'picture', 'capture'],
            icon: icon(Image),
            disabled: !s.hasGeometry,
            action: a.savePng,
        },
    );
    return commands;
}

function panelCommands(s: S, a: A): Command[] {
    const commands: Command[] = [{
        id: 'panels.inspector',
        label: s.inspectorOpen ? 'Hide inspector' : 'Show inspector',
        section: 'Panels',
        shortcut: KEYMAP.toggleInspector,
        keywords: ['side panel', 'toggle'],
        icon: icon(PanelRight),
        action: a.toggleInspector,
    }];
    for (const t of TAB_COMMANDS) {
        if (!s.visibleTabs.includes(t.tab)) continue;
        commands.push({
            id: `panels.tab.${t.tab}`,
            label: t.label,
            section: 'Panels',
            keywords: t.keywords,
            icon: icon(t.icon),
            action: () => a.showTab(t.tab),
        });
    }
    return commands;
}

function exportCommands(s: S, a: A): Command[] {
    return EXPORT_FORMATS.map((f) => {
        const planarBlocked = f.requiresPlanar === true && !s.hasPlanarGeometry;
        return {
            id: `export.${f.id}`,
            label: `Export ${f.label}`,
            description: !s.hasGeometry
                ? 'Nothing to export yet'
                : planarBlocked ? 'Needs a planar face or a flat pattern' : f.help,
            section: 'Export',
            keywords: ['download', 'save', f.id],
            icon: icon(Download),
            disabled: !s.hasGeometry || planarBlocked,
            action: () => a.exportFormat(f.id, f.label),
        };
    });
}

function fileCommands(s: S, a: A): Command[] {
    const commands: Command[] = [{
        id: 'file.open-project',
        label: 'Switch project…',
        description: 'Your recent saved and local projects',
        section: 'File',
        keywords: ['open project', 'project manager', 'recent', 'files'],
        icon: icon(FolderOpen),
        action: a.openProjectManager,
    }];
    if (s.viewerMode) return commands;
    for (const model of STARTERS) {
        commands.push({
            id: `file.new.${model.id}`,
            label: `New from starter: ${model.name}`,
            section: 'File',
            keywords: ['create', 'template', 'quick start', 'example'],
            icon: icon(FilePlus),
            action: () => a.newFromStarter(model, studioStarterCode(model)),
        });
    }
    const others = s.projects
        .filter((p) => p.id !== s.activeProjectId)
        .slice()
        .sort((x, y) => y.lastUpdated.localeCompare(x.lastUpdated))
        .slice(0, LOCAL_PROJECT_LIMIT);
    for (const p of others) {
        commands.push({
            id: `file.switch.${p.id}`,
            label: `Switch to ${p.name || 'Untitled Project'}`,
            section: 'File',
            keywords: ['project', 'open', 'recent'],
            icon: icon(FolderOpen),
            action: () => a.openProject(p.id),
        });
    }
    return commands;
}

function helpCommands(a: A): Command[] {
    return [{
        id: 'help.shortcuts',
        label: 'Keyboard shortcuts',
        section: 'Help',
        keywords: ['keys', 'hotkeys', 'keymap', 'help'],
        icon: icon(Keyboard),
        keepOpen: true,
        action: a.showShortcuts,
    }];
}

export function buildStudioCommands(s: StudioCommandState, a: StudioCommandActions): Command[] {
    return [
        ...selectionCommands(s, a),
        ...modelingCommands(s, a),
        ...viewCommands(s, a),
        ...panelCommands(s, a),
        ...exportCommands(s, a),
        ...fileCommands(s, a),
        ...helpCommands(a),
    ];
}

/** Memoised `buildStudioCommands`: a new array only when an input changes. */
export function useStudioCommandList(state: StudioCommandState, actions: StudioCommandActions): Command[] {
    const {
        viewerMode, hasGeometry, hasPlanarGeometry, visibleTabs, viewMode3D, viewportBackground, gridVisible,
        markingMode, sectionMode, inspectorOpen, codeLinkFeature, hasSelection, projects, activeProjectId,
    } = state;
    return useMemo(
        () => buildStudioCommands({
            viewerMode, hasGeometry, hasPlanarGeometry, visibleTabs, viewMode3D, viewportBackground, gridVisible,
            markingMode, sectionMode, inspectorOpen, codeLinkFeature, hasSelection, projects, activeProjectId,
        }, actions),
        [
            viewerMode, hasGeometry, hasPlanarGeometry, visibleTabs, viewMode3D, viewportBackground, gridVisible,
            markingMode, sectionMode, inspectorOpen, codeLinkFeature, hasSelection, projects, activeProjectId, actions,
        ],
    );
}
