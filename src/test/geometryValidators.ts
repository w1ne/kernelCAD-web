

/**
 * Validates that two numbers are approximately equal within a tolerance.
 */
export function expectCloseTo(actual: number, expected: number, tolerance = 1e-5) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`Expected ${actual} to be close to ${expected} (diff: ${Math.abs(actual - expected)})`);
    }
}

/**
 * Validates the bounding box of a shape.
 */
export function expectBoundingBox(
    bounds: { min: [number, number, number]; max: [number, number, number] },
    expected: { min: [number, number, number]; max: [number, number, number] },
    tolerance = 1e-5
) {
    expectCloseTo(bounds.min[0], expected.min[0], tolerance);
    expectCloseTo(bounds.min[1], expected.min[1], tolerance);
    expectCloseTo(bounds.min[2], expected.min[2], tolerance);
    expectCloseTo(bounds.max[0], expected.max[0], tolerance);
    expectCloseTo(bounds.max[1], expected.max[1], tolerance);
    expectCloseTo(bounds.max[2], expected.max[2], tolerance);
}

/**
 * Validates basic geometric properties.
 */
export function expectGeometryMatch(
    actual: { volume?: number; surfaceArea?: number; centerOfMass?: [number, number, number] },
    expected: { volume?: number; surfaceArea?: number; centerOfMass?: [number, number, number] }
) {
    if (expected.volume !== undefined && actual.volume !== undefined) {
        expectCloseTo(actual.volume, expected.volume);
    }
    if (expected.surfaceArea !== undefined && actual.surfaceArea !== undefined) {
        expectCloseTo(actual.surfaceArea, expected.surfaceArea);
    }
    if (expected.centerOfMass && actual.centerOfMass) {
        expectCloseTo(actual.centerOfMass[0], expected.centerOfMass[0]);
        expectCloseTo(actual.centerOfMass[1], expected.centerOfMass[1]);
        expectCloseTo(actual.centerOfMass[2], expected.centerOfMass[2]);
    }
}
