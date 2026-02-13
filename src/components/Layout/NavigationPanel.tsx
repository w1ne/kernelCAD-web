import React from 'react';
import Toolbar from '../Toolbar';
import { SidePanel } from './SidePanel';
import { type Feature } from '../../features/types';
import { useUI } from '../../context/UIContext';

interface NavigationPanelProps {
    viewMode: 'code' | 'gui';
    features: Feature[];
    onToolClick: (feature: Feature) => void;
    onJumpToLine: (line: number) => void;
    children: React.ReactNode;
}

export function NavigationPanel({
    viewMode,
    features,
    onToolClick,
    onJumpToLine,
    children
}: NavigationPanelProps) {
    const { sidePanelVisible } = useUI();

    return (
        <div className={`h-full flex flex-col border-r border-[#333] transition-all duration-300 ${viewMode === 'code' ? 'w-[40%]' : 'w-[250px]'}`}>
            <div className="flex-1 relative overflow-hidden flex">
                <Toolbar features={features} onToolClick={onToolClick} />

                <div className="flex-1 h-full min-h-0 relative flex flex-col">
                    {sidePanelVisible && (
                        <div
                            data-testid="sidepanel-slot"
                            className={viewMode === 'code' ? 'shrink-0 basis-[45%] min-h-[220px] max-h-[65%] overflow-hidden' : 'flex-1 min-h-0 overflow-hidden'}
                        >
                            <SidePanel onJumpToLine={onJumpToLine} />
                        </div>
                    )}
                    <div data-testid="editor-slot" className="flex-1 min-h-0">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
