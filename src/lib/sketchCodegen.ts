/**
 * Code generation from sketch entities to Replicad code
 */

import type { SketchData, SketchEntity, Point2D } from '../types/sketch';
import { formatPlaneForSketcher } from './planeUtils';

// Helper to format numbers for code generation
const f = (n: number) => Number(n.toFixed(4));

/**
 * Generate Replicad code from sketch data
 */
export function generateSketchCode(sketch: SketchData): string {
    const { name, plane, entities } = sketch;

    if (entities.length === 0) {
        return '';
    }

    // Start sketch on plane
    const planeCode = formatPlaneForSketcher(plane);
    let code = `const ${name} = new Sketcher(${planeCode})\n`;

    // Append body
    code += generateSketchBody(entities);

    code += ';\n';

    return code;
}

/**
 * Generate the body of the sketch (drawing operations + close/done)
 * Does NOT include the constructor or the final semicolon.
 */
export function generateSketchBody(entities: SketchEntity[]): string {
    // Defensive validation - should never happen if UI validation works
    if (!entities || entities.length === 0) {
        throw new Error('Cannot generate sketch body: No entities provided. This indicates a validation bug.');
    }

    let code = '';

    // Track current position for continuous path
    let currentPos: Point2D | null = null;

    entities.forEach((entity) => {
        const generated = generateEntityCode(entity, currentPos);
        code += generated.code;
        currentPos = generated.endPos;
    });

    // Finish the sketch
    if (isClosedPath(entities)) {
        // Replicad's Sketcher `.close()` finalizes closed paths (returns a sketch object).
        code += `  .close()`;
    } else {
        code += `  .done()`;
    }

    return code;
}

/**
 * Generate code for a single entity
 */
function generateEntityCode(
    entity: SketchEntity,
    currentPos: Point2D | null
): { code: string; endPos: Point2D | null } {
    switch (entity.type) {
        case 'line':
            return generateLineCode(entity, currentPos);
        case 'rectangle':
            return generateRectangleCode(entity);
        case 'circle':
            return generateCircleCode(entity);
        default:
            return { code: '', endPos: null };
    }
}

/**
 * Generate code for line entity
 */
function generateLineCode(
    line: { start: Point2D; end: Point2D },
    currentPos: Point2D | null
): { code: string; endPos: Point2D } {
    let code = '';

    // Move to start if not already there
    if (!currentPos || !pointsEqual(currentPos, line.start)) {
        code += `  .movePointerTo([${f(line.start[0])}, ${f(line.start[1])}])\n`;
    }

    // Draw line to end
    code += `  .lineTo([${f(line.end[0])}, ${f(line.end[1])}])\n`;

    return { code, endPos: line.end };
}

/**
 * Generate code for rectangle entity
 * Creates 4 lines forming a rectangle
 */
function generateRectangleCode(
    rect: { corner: Point2D; width: number; height: number }
): { code: string; endPos: Point2D } {
    const { corner, width, height } = rect;
    const [x, y] = corner;

    // Rectangle as 4 lines (top-left corner, counterclockwise)
    const code = `  .movePointerTo([${f(x)}, ${f(y)}])\n` +
        `  .lineTo([${f(x + width)}, ${f(y)}])\n` +
        `  .lineTo([${f(x + width)}, ${f(y - height)}])\n` +
        `  .lineTo([${f(x)}, ${f(y - height)}])\n` +
        `  .lineTo([${f(x)}, ${f(y)}])\n`; // Close back to start

    return { code, endPos: corner };
}

/**
 * Generate code for circle entity
 * NOTE: Replicad may not support circle() directly in Sketcher
 * This is a fallback - needs testing
 */
function generateCircleCode(
    circle: { center: Point2D; radius: number }
): { code: string; endPos: Point2D | null } {
    const { center, radius } = circle;
    const [x, y] = center;

    // A circle as two 180-degree arcs (sagitta arcs)
    const code = `  .movePointerTo([${f(x + radius)}, ${f(y)}])\n` +
        `  .vSagittaArc(${f(radius * 2)}, ${f(radius)})\n` +
        `  .vSagittaArc(${f(-radius * 2)}, ${f(radius)})\n`;

    return { code, endPos: [x + radius, y] };
}

/**
 * Check if two points are equal
 */
function pointsEqual(p1: Point2D, p2: Point2D, tolerance = 0.01): boolean {
    return Math.abs(p1[0] - p2[0]) < tolerance && Math.abs(p1[1] - p2[1]) < tolerance;
}

/**
 * Check if entities form a closed path
 */
function isClosedPath(entities: SketchEntity[]): boolean {
    if (entities.length === 0) return false;

    // Get first and last points
    const first = getStartPoint(entities[0]);
    const last = getEndPoint(entities[entities.length - 1]);

    if (!first || !last) return false;

    return pointsEqual(first, last);
}

/**
 * Get start point of an entity
 */
function getStartPoint(entity: SketchEntity): Point2D | null {
    switch (entity.type) {
        case 'line':
            return entity.start;
        case 'rectangle':
            return entity.corner;
        case 'circle':
            return [entity.center[0] + entity.radius, entity.center[1]];
        default:
            return null;
    }
}

/**
 * Get end point of an entity
 */
function getEndPoint(entity: SketchEntity): Point2D | null {
    switch (entity.type) {
        case 'line':
            return entity.end;
        case 'rectangle':
            return entity.corner; // Rectangle closes to its corner
        case 'circle':
            return [entity.center[0] + entity.radius, entity.center[1]];
        default:
            return null;
    }
}

/**
 * Generate next available sketch name
 */
export function generateSketchName(existingCode: string): string {
    const matches = existingCode.match(/const (sketch\d+)/g);
    if (!matches) return 'sketch1';

    const numbers = matches.map(m => {
        const num = m.match(/\d+/);
        return num ? parseInt(num[0]) : 0;
    });

    const maxNum = Math.max(...numbers, 0);
    return `sketch${maxNum + 1}`;
}
