import React from 'react';
import { type SnapState } from '../../hooks/useSketchCanvas';

interface SnapIndicatorsProps {
    type: SnapState['type'];
}

export const SnapIndicators: React.FC<SnapIndicatorsProps> = ({ type }) => {
    if (type === 'none') return null;

    return (
        <div className="flex items-center justify-center w-8 h-8 pointer-events-none">
            {type === 'coincident' && (
                <svg width="14" height="14" viewBox="0 0 16 16" className="text-yellow-400 drop-shadow-md">
                    <rect x="3" y="3" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="rgba(250, 204, 21, 0.2)" />
                </svg>
            )}
            {type === 'midpoint' && (
                <svg width="14" height="14" viewBox="0 0 16 16" className="text-yellow-400 drop-shadow-md">
                    <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="2" fill="rgba(250, 204, 21, 0.2)" />
                </svg>
            )}
            {type === 'center' && (
                <svg width="14" height="14" viewBox="0 0 16 16" className="text-yellow-400 drop-shadow-md">
                    <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="2" fill="rgba(250, 204, 21, 0.2)" />
                </svg>
            )}
            {(type === 'horizontal' || type === 'vertical') && (
                <div className="bg-yellow-400 text-black px-1.5 py-0.5 rounded-sm text-[10px] font-black shadow-lg border border-yellow-500">
                    {type === 'horizontal' ? 'H' : 'V'}
                </div>
            )}
            {type === 'alignment' && (
                <svg width="14" height="14" viewBox="0 0 16 16" className="text-yellow-400 drop-shadow-md">
                    <circle cx="8" cy="8" r="2" fill="currentColor" />
                    <path d="M8 0V16M0 8H16" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
                </svg>
            )}
        </div>
    );
};
