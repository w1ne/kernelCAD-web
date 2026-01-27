/**
 * Standard plane names in Replicad
 */

export const STANDARD_PLANES = ['XY', 'XZ', 'YZ'] as const;
export type StandardPlaneName = typeof STANDARD_PLANES[number];

/**
 * Check if a string is a standard plane name
 */
export function isStandardPlane(plane: string): plane is StandardPlaneName {
    return STANDARD_PLANES.includes(plane as StandardPlaneName);
}

/**
 * Plane display names for UI
 */
export const PLANE_DISPLAY_NAMES: Record<StandardPlaneName, string> = {
    'XY': 'XY Plane (Top)',
    'XZ': 'XZ Plane (Front)',
    'YZ': 'YZ Plane (Right)'
};
