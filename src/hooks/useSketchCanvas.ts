
import { useState, useCallback } from 'react';
import type { SketchEntity, Point2D, SketchTool } from '../types/sketch';

interface UseSketchCanvasProps {
    canvasWidth: number;
    canvasHeight: number;
    gridSize: number;
    gridUnit: number;
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
    const calculateSnappedPoint = useCallback((start: Point2D, current: Point2D, dim1: string, dim2: string): Point2D => {
        const val1 = parseFloat(dim1);
        const val2 = parseFloat(dim2);

        if (isNaN(val1) && isNaN(val2)) return current;

        let point = [...current] as Point2D;

        if (tool === 'line') {
            const dx = current[0] - start[0];
            const dy = current[1] - start[1];
            let angle = Math.atan2(dy, dx);
            let length = Math.sqrt(dx * dx + dy * dy);

            if (!isNaN(val1)) length = val1;
            if (!isNaN(val2)) angle = (val2 * Math.PI) / 180;

            point = [
                start[0] + Math.cos(angle) * length,
                start[1] + Math.sin(angle) * length
            ];
        } else if (tool === 'circle') {
            if (!isNaN(val1)) {
                const dx = current[0] - start[0];
                const dy = current[1] - start[1];
                const angle = Math.atan2(dy, dx);
                point = [
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

            point = [
                start[0] + signX * width,
                start[1] + signY * height
            ];
        }
        return point;
    }, [tool]);

    const handleMouseDown = useCallback((x: number, y: number) => {
        const point = canvasToSketch(x, y);
        setStartPoint(point);
        setCurrentPoint(point);
        setIsDrawing(true);
        setDynamicInput('');
        setSecondaryInput('');
        setInputTarget('primary');
    }, [canvasToSketch]);

    const handleMouseMove = useCallback((x: number, y: number) => {
        if (!isDrawing || !startPoint) return;
        const rawPoint = canvasToSketch(x, y);
        const snappedPoint = calculateSnappedPoint(startPoint, rawPoint, dynamicInput, secondaryInput);
        setCurrentPoint(snappedPoint);
    }, [isDrawing, canvasToSketch, dynamicInput, secondaryInput, startPoint, calculateSnappedPoint]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing || !startPoint || !currentPoint) return;

        // Ensure we use the latest snapped point even if mouse didn't move after typing
        const finalPoint = calculateSnappedPoint(startPoint, currentPoint, dynamicInput, secondaryInput);

        // Prevent zero-length entities
        if (startPoint[0] === finalPoint[0] && startPoint[1] === finalPoint[1]) {
            setIsDrawing(false);
            setStartPoint(null);
            setCurrentPoint(null);
            setDynamicInput('');
            setSecondaryInput('');
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
