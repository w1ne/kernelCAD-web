
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
    const createEntity = useCallback((currentTool: SketchTool, start: Point2D, end: Point2D): SketchEntity | null => {
        const id = `entity_${Date.now()}`;

        switch (currentTool) {
            case 'line':
                return {
                    id,
                    type: 'line',
                    start,
                    end,
                };
            case 'rectangle': {
                const width = Math.abs(end[0] - start[0]);
                const height = Math.abs(end[1] - start[1]);
                const corner: Point2D = [
                    Math.min(start[0], end[0]),
                    Math.max(start[1], end[1]), // Top-left in sketch coords
                ];
                return {
                    id,
                    type: 'rectangle',
                    corner,
                    width,
                    height,
                };
            }
            case 'circle': {
                const radius = Math.sqrt(
                    (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2
                );
                return {
                    id,
                    type: 'circle',
                    center: start,
                    radius,
                };
            }
            default:
                return null;
        }
    }, []);

    const handleMouseDown = useCallback((x: number, y: number) => {
        const point = canvasToSketch(x, y);
        setStartPoint(point);
        setCurrentPoint(point);
        setIsDrawing(true);
    }, [canvasToSketch]);

    const handleMouseMove = useCallback((x: number, y: number) => {
        if (!isDrawing) return;
        const point = canvasToSketch(x, y);
        setCurrentPoint(point);
    }, [isDrawing, canvasToSketch]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing || !startPoint || !currentPoint) return;

        // Prevent zero-length entities
        if (startPoint[0] === currentPoint[0] && startPoint[1] === currentPoint[1]) {
            setIsDrawing(false);
            setStartPoint(null);
            setCurrentPoint(null);
            return;
        }

        const newEntity = createEntity(tool, startPoint, currentPoint);
        if (newEntity) {
            setEntities(prev => [...prev, newEntity]);
        }

        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
    }, [isDrawing, startPoint, currentPoint, tool, createEntity]);

    const clear = useCallback(() => setEntities([]), []);

    return {
        tool,
        setTool,
        entities,
        setEntities,
        isDrawing,
        startPoint,
        currentPoint,
        canvasToSketch,
        sketchToCanvas,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        clear
    };
}
