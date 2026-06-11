// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Home } from 'lucide-react';
import type { ViewTarget } from '../controllers/cameraPose';

interface ViewGizmoProps {
    onNavigate: (target: ViewTarget) => void;
}

function Hotspot({
    label,
    children,
    className,
    style,
    onClick,
}: {
    label: string;
    children: React.ReactNode;
    className: string;
    style?: React.CSSProperties;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className={className}
            style={style}
        >
            {children}
        </button>
    );
}

export function ViewGizmo({ onNavigate }: ViewGizmoProps) {
    return (
        <div
            data-testid="view-gizmo"
            className="absolute bottom-14 right-5 z-20 h-36 w-36 select-none"
        >
            <svg
                data-testid="view-axis-arrows"
                className="pointer-events-none absolute inset-0 drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]"
                viewBox="0 0 144 144"
                aria-hidden="true"
            >
                <defs>
                    <marker id="view-gizmo-x-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 Z" fill="#f87171" />
                    </marker>
                    <marker id="view-gizmo-y-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 Z" fill="#34d399" />
                    </marker>
                    <marker id="view-gizmo-z-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 Z" fill="#38bdf8" />
                    </marker>
                    <linearGradient id="view-gizmo-top" x1="42" y1="36" x2="103" y2="67" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#8a8f98" />
                        <stop offset="1" stopColor="#535965" />
                    </linearGradient>
                    <linearGradient id="view-gizmo-left" x1="42" y1="53" x2="75" y2="99" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#646b75" />
                        <stop offset="1" stopColor="#2e333b" />
                    </linearGradient>
                    <linearGradient id="view-gizmo-right" x1="103" y1="53" x2="75" y2="99" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#565d68" />
                        <stop offset="1" stopColor="#242932" />
                    </linearGradient>
                </defs>

                <line x1="75" y1="66" x2="121" y2="90" stroke="#f87171" strokeWidth="2.5" markerEnd="url(#view-gizmo-x-arrow)" />
                <line x1="75" y1="66" x2="28" y2="91" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#view-gizmo-y-arrow)" />
                <line x1="75" y1="66" x2="75" y2="17" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#view-gizmo-z-arrow)" />

                <g data-testid="view-cube-art">
                    <polygon points="48,52 75,38 102,52 75,66" fill="url(#view-gizmo-top)" stroke="rgba(255,255,255,0.42)" strokeWidth="1.2" />
                    <polygon points="48,52 75,66 75,97 48,83" fill="url(#view-gizmo-left)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
                    <polygon points="102,52 75,66 75,97 102,83" fill="url(#view-gizmo-right)" stroke="rgba(255,255,255,0.24)" strokeWidth="1.2" />
                    <text x="75" y="54" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="700">XY</text>
                    <text x="61" y="79" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="700">XZ</text>
                    <text x="89" y="79" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="700">YZ</text>
                </g>
            </svg>

            <div data-testid="view-cube" className="absolute inset-0">
                <Hotspot
                    label="View XY plane"
                    onClick={() => onNavigate('xy')}
                    className="absolute left-12 top-[38px] h-8 w-14 bg-cyan-300/0 text-transparent transition hover:bg-cyan-300/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    style={{ clipPath: 'polygon(0 45%, 50% 0, 100% 45%, 50% 88%)' }}
                >
                    XY
                </Hotspot>
                <Hotspot
                    label="View YZ plane"
                    onClick={() => onNavigate('yz')}
                    className="absolute left-[74px] top-[52px] h-12 w-8 bg-red-300/0 text-transparent transition hover:bg-red-300/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    style={{ clipPath: 'polygon(0 28%, 100% 0, 100% 72%, 0 100%)' }}
                >
                    YZ
                </Hotspot>
                <Hotspot
                    label="View XZ plane"
                    onClick={() => onNavigate('xz')}
                    className="absolute left-12 top-[52px] h-12 w-8 bg-emerald-300/0 text-transparent transition hover:bg-emerald-300/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    style={{ clipPath: 'polygon(0 0, 100% 28%, 100% 100%, 0 72%)' }}
                >
                    XZ
                </Hotspot>
            </div>

            <Hotspot
                label="View along X axis"
                onClick={() => onNavigate('x')}
                className="absolute right-[1px] top-[78px] flex h-7 w-7 items-center justify-center rounded-full border border-red-200/50 bg-red-950/90 text-xs font-bold text-red-100 shadow-lg transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            >
                X
            </Hotspot>
            <Hotspot
                label="View along Y axis"
                onClick={() => onNavigate('y')}
                className="absolute left-1 top-[79px] flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-950/90 text-xs font-bold text-emerald-100 shadow-lg transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            >
                Y
            </Hotspot>
            <Hotspot
                label="View along Z axis"
                onClick={() => onNavigate('z')}
                className="absolute left-[58px] top-0 flex h-7 w-7 items-center justify-center rounded-full border border-sky-200/50 bg-sky-950/90 text-xs font-bold text-sky-100 shadow-lg transition hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            >
                Z
            </Hotspot>
            <Hotspot
                label="Fit model to view"
                onClick={() => onNavigate('fit')}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-neutral-950/85 text-white shadow-lg backdrop-blur transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            >
                <Home size={15} aria-hidden="true" />
            </Hotspot>
        </div>
    );
}
