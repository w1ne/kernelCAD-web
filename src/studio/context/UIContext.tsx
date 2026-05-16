import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { StudioLayoutMode } from '../../shared/types/layout';
import type { ViewMode3D } from '../../shared/types/viewMode';

export interface UIContextType {
    viewMode: 'code' | 'gui';
    setViewMode: (mode: 'code' | 'gui') => void;
    layoutMode: StudioLayoutMode;
    setLayoutMode: (mode: StudioLayoutMode) => void;
    viewMode3D: ViewMode3D;
    setViewMode3D: (mode: ViewMode3D) => void;
    activeDialog: string | null;
    setActiveDialog: (dialogId: string | null) => void;
    sidePanelVisible: boolean;
    setSidePanelVisible: (visible: boolean) => void;
    toggleSidePanel: () => void;
    activePanels: string[];
    openPanel: (id: string) => void;
    closePanel: (id: string) => void;
    contextMenu: { visible: boolean; position: { x: number, y: number } | null; type: 'FACE' | 'EDGE' | 'VERTEX' | 'SKETCH' };
    setContextMenu: (menu: { visible: boolean; position: { x: number, y: number } | null; type: 'FACE' | 'EDGE' | 'VERTEX' | 'SKETCH' }) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

import { useWorkbenchState } from './WorkbenchStateContext';

const STORAGE_KEYS = {
    viewMode: 'kernelcad:viewMode',
    layoutMode: 'kernelcad:layoutMode',
    viewMode3D: 'kernelcad:viewMode3D',
    sidePanelVisible: 'kernelcad:sidePanelVisible',
} as const;

function readStoredViewMode(): 'code' | 'gui' {
    if (typeof window === 'undefined') return 'code';
    const raw = window.localStorage.getItem(STORAGE_KEYS.viewMode);
    return raw === 'gui' || raw === 'code' ? raw : 'code';
}

function readStoredLayoutMode(): StudioLayoutMode {
    if (typeof window === 'undefined') return 'split';
    const raw = window.localStorage.getItem(STORAGE_KEYS.layoutMode);
    return raw === 'split' || raw === 'viewport' || raw === 'code' ? raw : 'split';
}

function readStoredSidePanelVisible(): boolean {
    if (typeof window === 'undefined') return true;
    const raw = window.localStorage.getItem(STORAGE_KEYS.sidePanelVisible);
    return raw === 'false' ? false : true; // Default to true
}

function readStoredViewMode3D(): ViewMode3D {
    if (typeof window === 'undefined') return 'shadedWithEdges';
    const raw = window.localStorage.getItem(STORAGE_KEYS.viewMode3D);
    return raw === 'shadedWithEdges' || raw === 'wireframe' || raw === 'shaded' ? raw : 'shadedWithEdges';
}

export function UIProvider({ children }: { children: ReactNode }) {
    const [viewMode, setViewMode] = useState<'code' | 'gui'>(() => readStoredViewMode());
    const [layoutMode, setLayoutMode] = useState<StudioLayoutMode>(() => readStoredLayoutMode());
    const [viewMode3D, setViewMode3D] = useState<ViewMode3D>(() => readStoredViewMode3D());
    const [sidePanelVisible, setSidePanelVisible] = useState(() => readStoredSidePanelVisible());
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; position: { x: number, y: number } | null; type: 'FACE' | 'EDGE' | 'VERTEX' | 'SKETCH' }>({
        visible: false,
        position: null,
        type: 'FACE'
    });

    // Use the central state machine for dialogs
    const { state, dispatch } = useWorkbenchState();

    const activeDialog = state.mode.type === 'DIALOG' ? state.mode.id : null;

    const setActiveDialog = useCallback((dialogId: string | null) => {
        if (dialogId) {
            // Redirect specific IDs to panels if they are part of the new system
            const panelIds = [
                'extrude', 'revolve', 'fillet', 'chamfer',
                'union', 'cut', 'intersect', 'offsetPlane',
                'planeSelector', 'midplane', 'tangentPlane'
            ];

            if (panelIds.includes(dialogId)) {
                dispatch({ type: 'OPEN_PANEL', id: dialogId });
                return;
            }

            dispatch({ type: 'OPEN_DIALOG', id: dialogId });
        } else {
            dispatch({ type: 'CLOSE_DIALOG' });
        }
    }, [dispatch]);

    const toggleSidePanel = useCallback(() => {
        setSidePanelVisible(prev => !prev);
    }, []);

    const openPanel = useCallback((id: string) => {
        dispatch({ type: 'OPEN_PANEL', id });
    }, [dispatch]);

    const closePanel = useCallback((id: string) => {
        dispatch({ type: 'CLOSE_PANEL', id });
    }, [dispatch]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEYS.viewMode, viewMode);
    }, [viewMode]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEYS.layoutMode, layoutMode);
    }, [layoutMode]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEYS.viewMode3D, viewMode3D);
    }, [viewMode3D]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEYS.sidePanelVisible, String(sidePanelVisible));
    }, [sidePanelVisible]);

    const value: UIContextType = useMemo(() => ({
        viewMode,
        setViewMode,
        layoutMode,
        setLayoutMode,
        viewMode3D,
        setViewMode3D,
        activeDialog,
        setActiveDialog,
        sidePanelVisible,
        setSidePanelVisible,
        toggleSidePanel,
        activePanels: state.activePanels,
        openPanel,
        closePanel,
        contextMenu,
        setContextMenu,
    }), [viewMode, layoutMode, viewMode3D, activeDialog, setActiveDialog, sidePanelVisible, toggleSidePanel, state.activePanels, openPanel, closePanel, contextMenu]);

    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUI() {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error("useUI must be used within a UIProvider");
    }
    return context;
}

export { UIContext };
