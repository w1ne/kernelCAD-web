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
