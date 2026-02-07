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

                <div className="flex-1 h-full relative flex flex-col">
                    {sidePanelVisible && (
                        <SidePanel onJumpToLine={onJumpToLine} />
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
}
