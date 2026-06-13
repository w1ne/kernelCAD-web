// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export const CAD_COLORS = {
    highlight: 0xFF9F1C, // Orange
    selection: 0x2EC4B6, // Blue/Teal
    snap: 0x00FF9D,      // Green
    guide: 0xAAB3C2,     // Grey
    error: 0xFF4D4D      // Red
} as const;

export const CAD_COLORS_HEX = {
    highlight: '#FF9F1C',
    selection: '#2EC4B6',
    snap: '#00FF9D',
    guide: '#AAB3C2',
    error: '#FF4D4D'
} as const;
