/**
 * Constants for sketch operations
 */

export const DEFAULT_SKETCH_TOOLS = ['line', 'rectangle', 'circle'] as const;
export type SketchTool = typeof DEFAULT_SKETCH_TOOLS[number];

export const SKETCH_GRID_SIZE = 1;
export const SKETCH_GRID_DIVISIONS = 10;
export const SKETCH_SNAP_THRESHOLD = 0.5;

/**
 * Default sketch name prefix
 */
export const DEFAULT_SKETCH_PREFIX = 'sketch';

/**
 * Sketch canvas dimensions
 */
export const SKETCH_CANVAS_SIZE = 500;
