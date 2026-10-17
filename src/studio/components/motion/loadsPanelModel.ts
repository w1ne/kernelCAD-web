// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { MechanismLoadsJoint } from '../../../modeling/runtime/mechanismVerdict';

export const LOADS_PLOT_W = 160;
export const LOADS_PLOT_H = 32;
const W = LOADS_PLOT_W;
const H = LOADS_PLOT_H;

/** SVG polyline points for [tMs, torqueNm] pairs, scaled to the box. */
export function torquePath(torque: MechanismLoadsJoint['torque']): string {
    if (torque.length < 2) return '';
    const t0 = torque[0][0];
    const t1 = torque[torque.length - 1][0];
    const peak = Math.max(...torque.map(([, v]) => Math.abs(v)), 1e-12);
    const span = t1 - t0 || 1;
    return torque
        .map(([t, v]) => `${(((t - t0) / span) * W).toFixed(1)},${(H / 2 - (v / peak) * (H / 2 - 1)).toFixed(1)}`)
        .join(' ');
}

