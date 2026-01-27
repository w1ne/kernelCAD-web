import { useRef, useEffect, useState, useCallback } from 'react';
import type { SketchEntity, Point2D, SketchTool } from '../types/sketch';
import type { SketchPlaneEntity } from '../types/plane';

interface SketchCanvasProps {
    plane: string | SketchPlaneEntity;
    onComplete: (entities: SketchEntity[]) => void;
    onCancel: () => void;
}

export function SketchCanvas({ plane, onComplete, onCancel }: SketchCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<SketchTool>('line');
    const [entities, setEntities] = useState<SketchEntity[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point2D | null>(null);
    const [currentPoint, setCurrentPoint] = useState<Point2D | null>(null);

    // Grid settings
    const gridSize = 10; // Grid cell size in pixels
    const gridUnit = 1;  // 1 unit = 1mm

    // Convert canvas pixel coordinates to sketch coordinates
    const canvasToSketch = useCallback((x: number, y: number): Point2D => {
        const canvas = canvasRef.current;
        if (!canvas) return [0, 0];

        // Center origin at canvas center
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Convert to sketch coordinates (Y-axis inverted)
        const sketchX = (x - centerX) / gridSize * gridUnit;
        const sketchY = (centerY - y) / gridSize * gridUnit;

        // Snap to grid
        return [
            Math.round(sketchX),
            Math.round(sketchY),
        ];
    }, [gridSize, gridUnit]);

    // Convert sketch coordinates to canvas pixels
    const sketchToCanvas = useCallback((point: Point2D): Point2D => {
        const canvas = canvasRef.current;
        if (!canvas) return [0, 0];

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const x = centerX + (point[0] / gridUnit) * gridSize;
        const y = centerY - (point[1] / gridUnit) * gridSize;

        return [x, y];
    }, [gridSize, gridUnit]);

    // Draw grid
    const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
        const canvas = ctx.canvas;
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw axes
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // X-axis (red)
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.stroke();

        // Y-axis (green)
        ctx.strokeStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, canvas.height);
        ctx.stroke();

        // Origin dot
        ctx.fillStyle = '#0000ff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
    }, [gridSize]);

    // Draw a line entity
    const drawLine = useCallback((ctx: CanvasRenderingContext2D, start: Point2D, end: Point2D) => {
        const [x1, y1] = sketchToCanvas(start);
        const [x2, y2] = sketchToCanvas(end);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw points
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(x1, y1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fill();
    }, [sketchToCanvas]);

    // Draw rectangle entity
    const drawRectangle = useCallback((ctx: CanvasRenderingContext2D, corner: Point2D, width: number, height: number) => {
        const [x, y] = sketchToCanvas(corner);
        const w = width / gridUnit * gridSize;
        const h = height / gridUnit * gridSize;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y - h, w, h); // Y inverted

        // Draw corner point
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }, [sketchToCanvas, gridSize, gridUnit]);

    // Draw circle entity
    const drawCircle = useCallback((ctx: CanvasRenderingContext2D, center: Point2D, radius: number) => {
        const [x, y] = sketchToCanvas(center);
        const r = radius / gridUnit * gridSize;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Draw center point
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }, [sketchToCanvas, gridSize, gridUnit]);

    // Render canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        drawGrid(ctx);

        // Draw all entities
        entities.forEach(entity => {
            switch (entity.type) {
                case 'line':
                    drawLine(ctx, entity.start, entity.end);
                    break;
                case 'rectangle':
                    drawRectangle(ctx, entity.corner, entity.width, entity.height);
                    break;
                case 'circle':
                    drawCircle(ctx, entity.center, entity.radius);
                    break;
            }
        });

        // Draw preview
        if (isDrawing && startPoint && currentPoint) {
            ctx.strokeStyle = '#999999';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);

            if (tool === 'line') {
                const [x1, y1] = sketchToCanvas(startPoint);
                const [x2, y2] = sketchToCanvas(currentPoint);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            } else if (tool === 'rectangle') {
                const [x1, y1] = sketchToCanvas(startPoint);
                const [x2, y2] = sketchToCanvas(currentPoint);
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            } else if (tool === 'circle') {
                const [x1, y1] = sketchToCanvas(startPoint);
                const [x2, y2] = sketchToCanvas(currentPoint);
                const radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                ctx.beginPath();
                ctx.arc(x1, y1, radius, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.setLineDash([]);
        }
    }, [entities, isDrawing, startPoint, currentPoint, tool, drawGrid, drawLine, drawRectangle, drawCircle, sketchToCanvas]);

    // Mouse down - start drawing
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const point = canvasToSketch(x, y);

        setStartPoint(point);
        setCurrentPoint(point);
        setIsDrawing(true);
    };

    // Mouse move - update preview
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const point = canvasToSketch(x, y);

        setCurrentPoint(point);
    };

    // Mouse up - complete entity
    const handleMouseUp = () => {
        if (!isDrawing || !startPoint || !currentPoint) return;

        const newEntity = createEntity(tool, startPoint, currentPoint);
        if (newEntity) {
            setEntities([...entities, newEntity]);
        }

        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
    };

    // Create entity based on tool and points
    const createEntity = (currentTool: SketchTool, start: Point2D, end: Point2D): SketchEntity | null => {
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
    };

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold">Sketch Mode - {typeof plane === 'string' ? plane : plane.name}</h2>
                    <p className="text-sm text-gray-300">
                        Click and drag to draw. Grid: 1 unit = 1mm
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setTool('line')}
                        className={`px-4 py-2 rounded ${tool === 'line' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                    >
                        Line
                    </button>
                    <button
                        onClick={() => setTool('rectangle')}
                        className={`px-4 py-2 rounded ${tool === 'rectangle' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                    >
                        Rectangle
                    </button>
                    <button
                        onClick={() => setTool('circle')}
                        className={`px-4 py-2 rounded ${tool === 'circle' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                    >
                        Circle
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onComplete(entities)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                        disabled={entities.length === 0}
                    >
                        Done ({entities.length})
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                    >
                        Cancel
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={1200}
                    height={800}
                    className="cursor-crosshair bg-white"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                />
            </div>
        </div>
    );
}
