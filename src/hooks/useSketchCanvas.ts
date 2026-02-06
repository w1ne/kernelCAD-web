
import { useState, useCallback } from 'react';
import type { SketchEntity, Point2D, SketchTool } from '../types/sketch';

interface UseSketchCanvasProps {
    canvasWidth: number;
    canvasHeight: number;
    gridSize: number;
    gridUnit: number;
}

export interface SnapState {
    type: 'none' | 'horizontal' | 'vertical' | 'coincident';
    point: Point2D;
}

export function useSketchCanvas({
    canvasWidth,
    canvasHeight,
    gridSize,
    gridUnit
}: UseSketchCanvasProps) {
    const [tool, setTool] = useState<SketchTool>('line');
    const [entities, setEntities] = useState<SketchEntity[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point2D | null>(null);
    const [currentPoint, setCurrentPoint] = useState<Point2D | null>(null);
    const [dynamicInput, setDynamicInput] = useState<string>('');
    const [secondaryInput, setSecondaryInput] = useState<string>('');
    const [inputTarget, setInputTarget] = useState<'primary' | 'secondary'>('primary');
    const [snapState, setSnapState] = useState<SnapState | undefined>(undefined); // State for snapping visualization

    // Convert canvas pixel coordinates to sketch coordinates
    const canvasToSketch = useCallback((x: number, y: number): Point2D => {
        // Center origin at canvas center
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        // Convert to sketch coordinates (Y-axis inverted)
        const sketchX = (x - centerX) / gridSize * gridUnit;
        const sketchY = (centerY - y) / gridSize * gridUnit;

        // Snap to grid
        return [
            Math.round(sketchX),
            Math.round(sketchY),
        ];
    }, [canvasWidth, canvasHeight, gridSize, gridUnit]);

    // Convert sketch coordinates to canvas pixels
    const sketchToCanvas = useCallback((point: Point2D): Point2D => {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        const x = centerX + (point[0] / gridUnit) * gridSize;
        const y = centerY - (point[1] / gridUnit) * gridSize;

        return [x, y];
    }, [canvasWidth, canvasHeight, gridSize, gridUnit]);

    // Create entity factory
    const createEntity = useCallback((currentTool: SketchTool, start: Point2D, end: Point2D, dimensions: { primary?: string, secondary?: string }): SketchEntity | null => {
        const id = `entity_${Date.now()}`;
        const val1 = parseFloat(dimensions.primary || '');
        const val2 = parseFloat(dimensions.secondary || '');

        switch (currentTool) {
            case 'line': {
                const entity: SketchEntity = {
                    id,
                    type: 'line',
                    start,
                    end,
                };
                if (!isNaN(val1)) {
                    entity.constraints = { ...entity.constraints, length: val1 };
                }
                if (!isNaN(val2)) {
                    entity.constraints = { ...entity.constraints, angle: val2 };
                }
                return entity;
            }
            case 'rectangle': {
                const width = Math.abs(end[0] - start[0]);
                const height = Math.abs(end[1] - start[1]);
                const corner: Point2D = [
                    Math.min(start[0], end[0]),
                    Math.max(start[1], end[1]), // Top-left in sketch coords
                ];
                const entity: SketchEntity = {
                    id,
                    type: 'rectangle',
                    corner,
                    width,
                    height,
                };
                if (!isNaN(val1)) {
                    entity.constraints = { ...entity.constraints, width: val1 };
                }
                if (!isNaN(val2)) {
                    entity.constraints = { ...entity.constraints, height: val2 };
                }
                return entity;
            }
            case 'circle': {
                const radius = Math.sqrt(
                    (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2
                );
                const entity: SketchEntity = {
                    id,
                    type: 'circle',
                    center: start,
                    radius,
                };
                if (!isNaN(val1)) {
                    entity.constraints = { ...entity.constraints, radius: val1 };
                }
                return entity;
            }
            default:
                return null;
        }
    }, []);



    // Help calculate snapped points based on mouse + typed dimensions
    const calculateSnappedPoint = useCallback((start: Point2D, current: Point2D, dim1: string, dim2: string): { point: Point2D, type: 'none' | 'horizontal' | 'vertical' | 'coincident' } => {
        const val1 = parseFloat(dim1);
        const val2 = parseFloat(dim2);

        // Default result
        let resultPoint: Point2D = [...current];
        let snapType: 'none' | 'horizontal' | 'vertical' | 'coincident' = 'none';

        // 1. Gather Candidate Snap Points (Vertices) from existing entities
        const snapCandidates: Point2D[] = [];
        entities.forEach(e => {
            if (e.type === 'line') {
                snapCandidates.push(e.start);
                snapCandidates.push(e.end);
            } else if (e.type === 'rectangle') {
                snapCandidates.push(e.corner);
                snapCandidates.push([e.corner[0] + e.width, e.corner[1]]);
                snapCandidates.push([e.corner[0], e.corner[1] + e.height]);
                snapCandidates.push([e.corner[0] + e.width, e.corner[1] + e.height]);
            } else if (e.type === 'circle') {
                snapCandidates.push(e.center);
            }
        });

        // 2. Check Coincident Snapping (Highest Priority)
        // If we provided a manual dimension (length/angle), we generally don't snap coincident
        // unless it perfectly matches? For now, manual dimensions disable coincident snap to avoid fighting.
        if (isNaN(val1) && isNaN(val2)) {
            // Tolerance: We use grid units from the hook prop, but here we work in sketch coordinates.
            // Since coordinates are integers (mostly), we look for exact or very close matches?
            // "Magnetic" means we snap even if slightly off.
            // Let's say threshold is 1 unit (since grid is 1).
            const SNAP_THRESHOLD = 1.5; // Allow snapping to adjacent diagonals?

            let bestDist = Infinity;
            let bestPoint: Point2D | null = null;

            for (const cand of snapCandidates) {
                // Don't snap to start point of CURRENT line (trivial)
                if (cand[0] === start[0] && cand[1] === start[1]) continue;

                const dx = current[0] - cand[0];
                const dy = current[1] - cand[1];
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= SNAP_THRESHOLD && dist < bestDist) {
                    bestDist = dist;
                    bestPoint = cand;
                }
            }

            if (bestPoint) {
                return { point: bestPoint, type: 'coincident' };
            }
        }

        // 3. Tool-Specific Logic with Alignment Snapping
        if (tool === 'line') {
            const dx = current[0] - start[0];
            const dy = current[1] - start[1];
            let angle = Math.atan2(dy, dx);
            let length = Math.sqrt(dx * dx + dy * dy);

            // Alignment Snapping (H/V)
            // Only if angle NOT explicitly typed
            if (isNaN(val2)) {
                // Determine deviation from horizontal (0 or PI) and vertical (PI/2 or -PI/2)
                const absAngle = Math.abs(angle);
                const isHoriz = absAngle < 0.1 || Math.abs(absAngle - Math.PI) < 0.1; // ~5.7 degrees
                const isVert = Math.abs(absAngle - Math.PI / 2) < 0.1;

                if (isHoriz) {
                    // Force dy to 0
                    // But we must respect the current X projection 
                    // Snap Y to start Y
                    resultPoint = [current[0], start[1]];
                    // Recalculate length based on new projection
                    length = Math.abs(current[0] - start[0]);
                    angle = (current[0] >= start[0]) ? 0 : Math.PI;
                    snapType = 'horizontal';
                } else if (isVert) {
                    // Snap X to start X
                    resultPoint = [start[0], current[1]];
                    length = Math.abs(current[1] - start[1]);
                    angle = (current[1] >= start[1]) ? Math.PI / 2 : -Math.PI / 2;
                    snapType = 'vertical';
                }
            }

            // Dimensions Override
            if (!isNaN(val1)) length = val1;
            if (!isNaN(val2)) angle = (val2 * Math.PI) / 180;

            if (!isNaN(val1) || !isNaN(val2) || snapType !== 'none') {
                resultPoint = [
                    start[0] + Math.cos(angle) * length,
                    start[1] + Math.sin(angle) * length
                ];
                // Round to nearest integer for grid coherence?
                // If typed dimension is "50", we want exactly 50.0.
                // But generally the sketcher works in grid units?
                // If we return float, `canvasToSketch` might round it next frame? 
                // No, this is for `currentPoint` state which drives rendering.
                // We should keep floats if dimensions are specific.
                // But for snaps (H/V), we want integers if start is integer.
                if (snapType !== 'none' && isNaN(val1)) {
                    resultPoint = [Math.round(resultPoint[0]), Math.round(resultPoint[1])];
                }
            }
        } else if (tool === 'circle') {
            // ... existing circle logic ...
            if (!isNaN(val1)) {
                const dx = current[0] - start[0];
                const dy = current[1] - start[1];
                const angle = Math.atan2(dy, dx);
                resultPoint = [
                    start[0] + Math.cos(angle) * val1,
                    start[1] + Math.sin(angle) * val1
                ];
            }
        } else if (tool === 'rectangle') {
            let width = Math.abs(current[0] - start[0]);
            let height = Math.abs(current[1] - start[1]);
            const signX = current[0] >= start[0] ? 1 : -1;
            const signY = current[1] >= start[1] ? 1 : -1;

            if (!isNaN(val1)) width = val1;
            if (!isNaN(val2)) height = val2;

            resultPoint = [
                start[0] + signX * width,
                start[1] + signY * height
            ];
        }

        return { point: resultPoint, type: snapType };
    }, [tool, entities]);

    const handleMouseDown = useCallback((x: number, y: number) => {
        const point = canvasToSketch(x, y);
        setStartPoint(point);
        setCurrentPoint(point);
        setIsDrawing(true);
        setDynamicInput('');
        setSecondaryInput('');
        setInputTarget('primary');
        setSnapState(undefined);
    }, [canvasToSketch]);

    const handleMouseMove = useCallback((x: number, y: number) => {
        if (!isDrawing || !startPoint) return;
        const rawPoint = canvasToSketch(x, y);
        const { point: snappedPoint, type: snapType } = calculateSnappedPoint(startPoint, rawPoint, dynamicInput, secondaryInput);

        setCurrentPoint(snappedPoint);
        setSnapState({ type: snapType, point: snappedPoint });
    }, [isDrawing, canvasToSketch, dynamicInput, secondaryInput, startPoint, calculateSnappedPoint]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing || !startPoint || !currentPoint) return;

        // Ensure we use the latest snapped point
        const { point: finalPoint } = calculateSnappedPoint(startPoint, currentPoint, dynamicInput, secondaryInput);

        // Prevent zero-length entities
        if (Math.abs(startPoint[0] - finalPoint[0]) < 0.001 && Math.abs(startPoint[1] - finalPoint[1]) < 0.001) {
            setIsDrawing(false);
            setStartPoint(null);
            setCurrentPoint(null);
            setDynamicInput('');
            setSecondaryInput('');
            setSnapState(undefined);
            return;
        }

        const newEntity = createEntity(tool, startPoint, finalPoint, {
            primary: dynamicInput,
            secondary: secondaryInput
        });
        if (newEntity) {
            setEntities(prev => [...prev, newEntity]);
        }

        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
        setDynamicInput('');
        setSecondaryInput('');
        setSnapState(undefined);
    }, [isDrawing, startPoint, currentPoint, tool, createEntity, dynamicInput, secondaryInput, calculateSnappedPoint]);

    const clear = useCallback(() => setEntities([]), []);

    return {
        tool,
        setTool,
        entities,
        setEntities,
        isDrawing,
        startPoint,
        currentPoint,
        snapState,
        dynamicInput,
        setDynamicInput,
        secondaryInput,
        setSecondaryInput,
        inputTarget,
        setInputTarget,
        canvasToSketch,
        sketchToCanvas,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        clear
    };
}

