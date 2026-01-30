import { createContext, useContext, useState, type ReactNode } from 'react';
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

export function UIProvider({ children }: { children: ReactNode }) {
    const [viewMode, setViewMode] = useState<'code' | 'gui'>('code');
    const [viewMode3D, setViewMode3D] = useState<ViewMode3D>('shadedWithEdges');
    const [activeDialog, setActiveDialog] = useState<string | null>(null);

    const value: UIContextType = {
        viewMode,
        setViewMode,
        viewMode3D,
        setViewMode3D,
        activeDialog,
        setActiveDialog,
    };

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
