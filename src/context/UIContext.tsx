import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ViewMode3D } from '../types/viewMode';

export interface UIContextType {
    viewMode: 'code' | 'gui';
    setViewMode: (mode: 'code' | 'gui') => void;
    viewMode3D: ViewMode3D;
    setViewMode3D: (mode: ViewMode3D) => void;
    activeDialog: string | null;
    setActiveDialog: (dialogId: string | null) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

import { useWorkbenchState } from './WorkbenchStateContext';

const STORAGE_KEYS = {
    viewMode: 'kernelcad:viewMode',
    viewMode3D: 'kernelcad:viewMode3D',
} as const;

function readStoredViewMode(): 'code' | 'gui' {
    if (typeof window === 'undefined') return 'code';
    const raw = window.localStorage.getItem(STORAGE_KEYS.viewMode);
    return raw === 'gui' || raw === 'code' ? raw : 'code';
}

function readStoredViewMode3D(): ViewMode3D {
    if (typeof window === 'undefined') return 'shadedWithEdges';
    const raw = window.localStorage.getItem(STORAGE_KEYS.viewMode3D);
    return raw === 'shadedWithEdges' || raw === 'wireframe' || raw === 'shaded' ? raw : 'shadedWithEdges';
}

export function UIProvider({ children }: { children: ReactNode }) {
    const [viewMode, setViewMode] = useState<'code' | 'gui'>(() => readStoredViewMode());
    const [viewMode3D, setViewMode3D] = useState<ViewMode3D>(() => readStoredViewMode3D());

    // Use the central state machine for dialogs
    const { state, dispatch } = useWorkbenchState();

    const activeDialog = state.mode.type === 'DIALOG' ? state.mode.id : null;

    const setActiveDialog = useCallback((dialogId: string | null) => {
        if (dialogId) {
            dispatch({ type: 'OPEN_DIALOG', id: dialogId });
        } else {
            dispatch({ type: 'CLOSE_DIALOG' });
        }
    }, [dispatch]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEYS.viewMode, viewMode);
    }, [viewMode]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEYS.viewMode3D, viewMode3D);
    }, [viewMode3D]);

    const value: UIContextType = useMemo(() => ({
        viewMode,
        setViewMode,
        viewMode3D,
        setViewMode3D,
        activeDialog,
        setActiveDialog,
    }), [viewMode, viewMode3D, activeDialog, setActiveDialog]);

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
