// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Loads panel: actuator torque vs time for each driven joint, from the
// motion-load study that evaluate_script runs when a mechanicalJoint declares
// torqueNm. Shows the margin, the shaft bending moment and the radial load on
// each support. A view only; the full table is verify({ check: 'motion-load' }).

import type { JSX } from 'react';
import type { MechanismLoadsJoint, MechanismLoadsLine } from '../../../modeling/runtime/mechanismVerdict';
import { LOADS_PLOT_H as H, LOADS_PLOT_W as W, torquePath } from './loadsPanelModel';

const LEVEL_CLASS = { ok: 'text-ok', warning: 'text-warn', error: 'text-danger' } as const;

export interface LoadsPanelProps {
    readonly loads: MechanismLoadsLine | null | undefined;
}

function fmt(n: number): string {
    const a = Math.abs(n);
    return a >= 100 ? n.toFixed(0) : a >= 10 ? n.toFixed(1) : n.toFixed(2);
}

function JointRow({ j }: { j: MechanismLoadsJoint }): JSX.Element {
    const margin = j.torqueMargin !== undefined ? `${fmt(j.torqueMargin)}x` : j.ratedTorqueNm !== undefined ? 'not loaded' : 'no rating';
    const supports = j.supports.map((s) => `${s.part} ${fmt(s.peakRadialN)} N`).join(', ');
    return (
        <li className="flex flex-col gap-0.5" data-testid="loads-joint" data-joint={j.joint}>
            <div className="flex items-baseline justify-between gap-2 text-2xs">
                <span className="truncate text-fg-2">{j.joint}</span>
                <span className={`font-mono ${LEVEL_CLASS[j.maxLevel]}`}>{margin}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-full text-accent" preserveAspectRatio="none" role="img"
                aria-label={`${j.joint} torque over time, peak ${fmt(j.peakTorqueNm * 1000)} N·mm`}>
                <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.5" />
                <polyline points={torquePath(j.torque)} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
            <p className="font-mono text-2xs text-fg-3">
                peak {fmt(j.peakTorqueNm * 1000)} N·mm · bending {fmt(j.peakBendingNmm)} N·mm{supports ? ` · ${supports}` : ''}
            </p>
        </li>
    );
}

export function LoadsPanel({ loads }: LoadsPanelProps): JSX.Element | null {
    if (!loads?.joints || loads.joints.length === 0) return null;
    return (
        <section className="flex flex-col gap-1.5" aria-label="Joint loads" data-testid="loads-panel">
            <h3 className="text-2xs font-medium uppercase tracking-wide text-fg-3">Loads</h3>
            <p className={`text-2xs ${LEVEL_CLASS[loads.maxLevel]}`}>{loads.statement}</p>
            <ul className="flex flex-col gap-2">
                {loads.joints.map((j) => <JointRow key={j.joint} j={j} />)}
            </ul>
        </section>
    );
}
