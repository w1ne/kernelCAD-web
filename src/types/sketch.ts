import type { SketchPlaneEntity } from './plane';

/**
 * Sketch type definitions for v0.5.0 Sketching System
 */

/**
 * Sketch planes in 3D space
 */
export type SketchPlane = 'XY' | 'XZ' | 'YZ' | string;

/**
 * A 2D point in sketch space
 */
export type Point2D = [number, number];

/**
 * Base sketch entity
 */
interface BaseSketchEntity {
    id: string;
    type: string;
}

/**
 * Line entity - straight line from start to end
 */
export interface LineEntity extends BaseSketchEntity {
    type: 'line';
    start: Point2D;
    end: Point2D;
    constraints?: {
        length?: number;
        angle?: number;
        horizontal?: boolean;
        vertical?: boolean;
    };
}

/**
 * Rectangle entity - defined by corner and dimensions
 */
export interface RectangleEntity extends BaseSketchEntity {
    type: 'rectangle';
    corner: Point2D;
    width: number;
    height: number;
    constraints?: {
        width?: number;
        height?: number;
    };
}

/**
 * Circle entity - defined by center and radius
 */
export interface CircleEntity extends BaseSketchEntity {
    type: 'circle';
    center: Point2D;
    radius: number;
    constraints?: {
        radius?: number;
    };
}

/**
 * Arc entity - circular arc from start to end
 */
export interface ArcEntity extends BaseSketchEntity {
    type: 'arc';
    start: Point2D;
    end: Point2D;
    radius: number;
    clockwise: boolean;
}

/**
 * Union type for all sketch entities
 */
export type SketchEntity = LineEntity | RectangleEntity | CircleEntity | ArcEntity;

/**
 * Complete sketch data
 */
export interface SketchData {
    id: string;
    name: string;  // e.g., "sketch1", "sketch2"
    plane: SketchPlane;
    entities: SketchEntity[];
    closed: boolean;  // Is the sketch a closed path?
    createdAt: number;
}

/**
 * Sketch mode state
 */
export interface SketchModeState {
    active: boolean;
    plane: SketchPlane | SketchPlaneEntity | null;
    currentSketch: SketchData | null;
    tool: SketchTool;
}

/**
 * Available sketch tools
 */
export type SketchTool = 'select' | 'line' | 'rectangle' | 'circle' | 'arc';

/**
 * Sketch tool state for active drawing
 */
export interface SketchToolState {
    type: SketchTool;
    startPoint: Point2D | null;
    previewEntity: SketchEntity | null;
}
