/**
 * View mode types for CAD-style visualization
 */

import { type LucideIcon } from 'lucide-react';

export type ViewMode3D = 'shaded' | 'wireframe' | 'shadedWithEdges';

export interface ViewModeConfig {
    id: ViewMode3D;
    name: string;
    icon: LucideIcon;
    description: string;
}

/**
 * Viewport background modes for the Studio 3D view.
 *   - `dark`       — opaque dark grey (default; preserves current behaviour).
 *   - `light`      — opaque near-white surface.
 *   - `checkered`  — alternating two-grey checker pattern (transparency-style),
 *                    useful when judging silhouettes against a neutral pattern.
 */
export type ViewportBackground = 'dark' | 'light' | 'checkered';
