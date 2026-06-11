// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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


/**
 * Validates if the plane object has valid origin and normal arrays
 */
export function isValidPlaneData(
    plane: unknown,
): plane is { origin: [number, number, number]; normal: [number, number, number] } {
    if (typeof plane !== 'object' || plane === null) return false;
    const rec = plane as Record<string, unknown>;
    const origin = rec.origin;
    const normal = rec.normal;

    const isVec3 = (v: unknown): v is [number, number, number] =>
        Array.isArray(v) &&
        v.length === 3 &&
        v.every((n) => typeof n === 'number' && Number.isFinite(n));

    return isVec3(origin) && isVec3(normal);
}
