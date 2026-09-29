// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export const CAD_COLORS = {
    highlight: 0xFF9F1C, // Orange — hover pre-selection
    selection: 0x2EC4B6, // Blue/Teal — click selection
    codeLink: 0xB388FF,  // Violet — geometry made by the code under the cursor
    snap: 0x00FF9D,      // Green
    guide: 0xAAB3C2,     // Grey
    error: 0xFF4D4D      // Red
} as const;

/** Face tint for the clicked face (`isSelected`, selection teal) or the
 *  hovered face (pre-selection orange). Distinct so a hover never reads as a
 *  selection. */
export function faceOverlayColor(isSelected: boolean): number {
    return isSelected ? CAD_COLORS.selection : CAD_COLORS.highlight;
}

export const CAD_COLORS_HEX = {
    highlight: '#FF9F1C',
    selection: '#2EC4B6',
    codeLink: '#B388FF',
    snap: '#00FF9D',
    guide: '#AAB3C2',
    error: '#FF4D4D'
} as const;
