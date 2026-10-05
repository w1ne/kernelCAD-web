// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';

/** Resolve a `--kc-*` CSS variable to a THREE.Color at call time so 3D overlays
 *  follow the active Studio theme. Falls back to `fallback` (numeric) when the
 *  variable is unset (tests, SSR). */
export function readThemeColor(variable: string, fallback: number): THREE.Color {
    try {
        const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
        if (raw) return new THREE.Color(raw);
    } catch { /* no DOM */ }
    return new THREE.Color(fallback);
}
