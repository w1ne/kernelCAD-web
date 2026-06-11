// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export interface Point2D {
    id: string;
    x: number;
    y: number;
}

export function computeCentroid(points: Point2D[]): { x: number; y: number } | null {
    if (points.length === 0) return null;
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
}
