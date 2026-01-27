/**
 * Plane utility functions for kernelCAD
 * Centralizes plane creation and validation logic
 */

/**
 * Creates Replicad Plane constructor code from origin and normal vectors
 */
export function createPlaneConstructorCode(
    origin: [number, number, number],
    normal: [number, number, number]
): string {
    const [ox, oy, oz] = origin;
    const [nx, ny, nz] = normal;
    return `new replicad.Plane([${ox}, ${oy}, ${oz}], null, [${nx}, ${ny}, ${nz}])`;
}

/**
 * Checks if a plane string is a Replicad Plane constructor
 */
export function isPlaneConstructor(plane: string): boolean {
    return plane.startsWith('new replicad.Plane(');
}

/**
 * Checks if a plane string is a standard plane name (XY, XZ, YZ)
 */
export function isStandardPlaneName(plane: string): boolean {
    return ['XY', 'XZ', 'YZ'].includes(plane);
}

/**
 * Formats a plane string for use in Sketcher constructor
 */
export function formatPlaneForSketcher(plane: string): string {
    if (isPlaneConstructor(plane)) {
        // Already a constructor, use as-is
        return plane;
    } else if (isStandardPlaneName(plane)) {
        // Standard plane name, wrap in quotes
        return `'${plane}'`;
    } else {
        // Assume it's already formatted correctly
        return plane;
    }
}
