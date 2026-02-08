import { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Circle, Square, MousePointer2 } from 'lucide-react';
import type { SketchEntity } from '../types/sketch';
import type { SketchPlaneEntity } from '../types/plane';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useSketchCanvas } from '../hooks/useSketchCanvas';
import { SnapIndicators } from './Sketch/SnapIndicators';

interface SketchCanvasProps {
    plane: string | SketchPlaneEntity;
    onComplete: (entities: SketchEntity[]) => void;
    onCancel: () => void;
}

export function SketchCanvas({ plane, onComplete, onCancel }: SketchCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Canvas size state
    const [size, setSize] = useState({ width: 800, height: 600 });

    useEffect(() => {
        if (!containerRef.current) return;

        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                if (clientWidth > 0 && clientHeight > 0) {
                    setSize({ width: clientWidth, height: clientHeight });
                }
            }
        };

        const observer = new ResizeObserver(() => {
            updateSize();
        });

        observer.observe(containerRef.current);
        updateSize();

        return () => observer.disconnect();
    }, []);

    // Grid settings
    // Calculate pixels per unit based on camera distance and FOV
    // Visible Height at Reference Depth = 2 * Distance * tan(FOV / 2)
    // Distance = 20 (SKETCH_DISTANCE), FOV = 40 (SKETCH_FOV)
    // We assume the camera is mainly at this distance.
    const SKETCH_DISTANCE = 20;
    const SKETCH_FOV = 40;

    const visibleHeight = 2 * SKETCH_DISTANCE * Math.tan((SKETCH_FOV / 2) * (Math.PI / 180));
    const pixelsPerUnit = size.height / visibleHeight;

    // gridSize is the pixel size of one unit
    const gridSize = pixelsPerUnit;
    const gridUnit = 1;  // 1 unit = 1mm

    const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);

    const {
        tool,
        setTool,
        entities,
        isDrawing,
        startPoint,
        currentPoint,
        dynamicInput,
        setDynamicInput,
        secondaryInput,
        setSecondaryInput,
        inputTarget,
        setInputTarget,
        snapState,
        sketchToCanvas,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        clear
    } = useSketchCanvas({
        canvasWidth: size.width,
        canvasHeight: size.height,
        gridSize,
        gridUnit
    });

    useKeyboardShortcuts({
        'l': () => !isDrawing && setTool('line'),
        'r': () => !isDrawing && setTool('rectangle'),
        'c': () => !isDrawing && setTool('circle'),
        'escape': () => {
            if (isDrawing) {
                // Cancel drawing
                handleMouseUp();
            } else {
                onCancel();
            }
        }
    });

    // Handle dynamic dimension input
    useEffect(() => {
        if (!isDrawing) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Numbers and decimals
            if (/^[0-9.]$/.test(e.key)) {
                e.stopPropagation();
                if (inputTarget === 'primary') {
                    setDynamicInput(prev => prev + e.key);
                } else {
                    setSecondaryInput(prev => prev + e.key);
                }
                return;
            }

            // Backspace
            if (e.key === 'Backspace') {
                e.stopPropagation();
                if (inputTarget === 'primary') {
                    setDynamicInput(prev => prev.slice(0, -1));
                } else {
                    setSecondaryInput(prev => prev.slice(0, -1));
                }
                return;
            }

            // Tab (Switch target)
            if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                setInputTarget(prev => prev === 'primary' ? 'secondary' : 'primary');
                return;
            }

            // Enter (Finish)
            if (e.key === 'Enter') {
                e.stopPropagation();
                handleMouseUp();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to be first
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isDrawing, handleMouseUp, setDynamicInput, setSecondaryInput, inputTarget, setInputTarget]);

    // Draw functions (kept in component as they relate to rendering)
    const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
        const canvas = ctx.canvas;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Faint white for dark/transparent bg
        ctx.lineWidth = 1;

        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.stroke();

        ctx.strokeStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, canvas.height);
        ctx.stroke();

        ctx.fillStyle = '#0000ff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
    }, [gridSize]);

    const drawLine = useCallback((ctx: CanvasRenderingContext2D, start: [number, number], end: [number, number]) => {
        const [x1, y1] = sketchToCanvas(start);
        const [x2, y2] = sketchToCanvas(end);

        ctx.strokeStyle = '#ffffff'; // White lines for visibility
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(x1, y1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fill();
    }, [sketchToCanvas]);

    const drawRectangle = useCallback((ctx: CanvasRenderingContext2D, corner: [number, number], width: number, height: number) => {
        const [x, y] = sketchToCanvas(corner);
        const w = width / gridUnit * gridSize;
        const h = height / gridUnit * gridSize;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y - h, w, h);

        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }, [sketchToCanvas, gridUnit, gridSize]);

    const drawCircle = useCallback((ctx: CanvasRenderingContext2D, center: [number, number], radius: number) => {
        const [x, y] = sketchToCanvas(center);
        const r = radius / gridUnit * gridSize;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }, [sketchToCanvas, gridUnit, gridSize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid(ctx);

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

        if (isDrawing && startPoint && currentPoint) {
            ctx.strokeStyle = '#cccccc'; // Lighter grey for pending drawing
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);

            const [x1, y1] = sketchToCanvas(startPoint);
            const [x2, y2] = sketchToCanvas(currentPoint);

            if (tool === 'line') {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            } else if (tool === 'rectangle') {
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            } else if (tool === 'circle') {
                const radius = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                ctx.beginPath();
                ctx.arc(x1, y1, radius, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.setLineDash([]);
        }

        // Draw guidelines (Alignment / H / V)
        if (isDrawing && snapState && snapState.type !== 'none') {
            const SNAP_GREEN = 'rgba(0, 255, 157, 0.4)'; // #00FF9D with opacity
            ctx.strokeStyle = SNAP_GREEN;
            ctx.setLineDash([8, 4]);
            ctx.lineWidth = 1;

            if (snapState.type === 'alignment' && snapState.refPoints) {
                snapState.refPoints.forEach(pt => {
                    const [px, py] = sketchToCanvas(pt);
                    const [cx, cy] = sketchToCanvas(snapState.point);

                    if (Math.abs(px - cx) < 1) { // Vertical guide
                        ctx.beginPath();
                        ctx.moveTo(px, 0);
                        ctx.lineTo(px, canvas.height);
                        ctx.stroke();
                    }
                    if (Math.abs(py - cy) < 1) { // Horizontal guide
                        ctx.beginPath();
                        ctx.moveTo(0, py);
                        ctx.lineTo(canvas.width, py);
                        ctx.stroke();
                    }
                });
            } else if (snapState.type === 'horizontal' && startPoint) {
                const [, sy] = sketchToCanvas(startPoint);
                ctx.beginPath();
                ctx.moveTo(0, sy);
                ctx.lineTo(canvas.width, sy);
                ctx.stroke();
            } else if (snapState.type === 'vertical' && startPoint) {
                const [sx] = sketchToCanvas(startPoint);
                ctx.beginPath();
                ctx.moveTo(sx, 0);
                ctx.lineTo(sx, canvas.height);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }
    }, [size, entities, isDrawing, startPoint, currentPoint, tool, sketchToCanvas, drawGrid, drawLine, drawRectangle, drawCircle, snapState]);

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col" data-testid="sketch-canvas-overlay">
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
                        onClick={clear}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
                        disabled={entities.length === 0}
                    >
                        Clear All
                    </button>
                    <button
                        onClick={() => onComplete(entities)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors shadow-lg shadow-green-900/20"
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

            <div className="flex-1 overflow-hidden" ref={containerRef}>
                <canvas
                    ref={canvasRef}
                    width={size.width}
                    height={size.height}
                    className="cursor-crosshair bg-transparent"
                    onMouseDown={(e) => {
                        const rect = canvasRef.current?.getBoundingClientRect();
                        if (rect) handleMouseDown(e.clientX - rect.left, e.clientY - rect.top);
                    }}
                    onMouseMove={(e) => {
                        const rect = canvasRef.current?.getBoundingClientRect();
                        if (rect) {
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            setMousePosition({ x, y });
                            handleMouseMove(x, y);
                        }
                    }}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => setMousePosition(null)}
                    data-testid="sketch-canvas"
                />

                {/* Persistent Dimension Labels - Rendered as HTML overlays for better text quality & positioning */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    {entities.map(entity => {
                        if (!('constraints' in entity) || !entity.constraints) return null;

                        const labels = [];

                        if (entity.type === 'line') {
                            const constraints = entity.constraints;
                            const [x1, y1] = sketchToCanvas(entity.start);
                            const [x2, y2] = sketchToCanvas(entity.end);
                            const midX = (x1 + x2) / 2;
                            const midY = (y1 + y2) / 2;

                            if (constraints?.length !== undefined) {
                                labels.push(
                                    <div key="len" className="absolute px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-[#00FF9D] font-mono border border-[#00FF9D]/30 backdrop-blur-sm"
                                        style={{ left: midX, top: midY, transform: 'translate(-50%, -50%)' }}>
                                        L: {constraints.length}
                                    </div>
                                );
                            }
                            if (constraints?.angle !== undefined) {
                                // Place angle label near start point
                                labels.push(
                                    <div key="ang" className="absolute px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-blue-400 font-mono border border-blue-400/30 backdrop-blur-sm"
                                        style={{ left: x1, top: y1, transform: 'translate(10px, -20px)' }}>
                                        A: {constraints.angle}°
                                    </div>
                                );
                            }
                        } else if (entity.type === 'rectangle') {
                            const constraints = entity.constraints;
                            // Based on drawRectangle logic: Top-Left on screen is (x, y - h)? 
                            // Actually let's recalculate screen coords safely
                            // entity.corner is top-left in sketch (max Y)
                            const [sx, sy] = sketchToCanvas(entity.corner);
                            const w = entity.width / gridUnit * gridSize;
                            const h = entity.height / gridUnit * gridSize;

                            // Visual rect top-left is (sx, sy - h) based on drawRectangle
                            const topY = sy - h;
                            const leftX = sx;

                            if (constraints?.width !== undefined) {
                                labels.push(
                                    <div key="w" className="absolute px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-[#00FF9D] font-mono border border-[#00FF9D]/30 backdrop-blur-sm"
                                        style={{ left: leftX + w / 2, top: topY, transform: 'translate(-50%, -100%) translateY(-4px)' }}>
                                        W: {constraints.width}
                                    </div>
                                );
                            }
                            if (constraints?.height !== undefined) {
                                labels.push(
                                    <div key="h" className="absolute px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-[#00FF9D] font-mono border border-[#00FF9D]/30 backdrop-blur-sm"
                                        style={{ left: leftX, top: topY + h / 2, transform: 'translate(-100%, -50%) translateX(-4px)' }}>
                                        H: {constraints.height}
                                    </div>
                                );
                            }
                        } else if (entity.type === 'circle') {
                            const constraints = entity.constraints;
                            const [cx, cy] = sketchToCanvas(entity.center);
                            const r = entity.radius / gridUnit * gridSize;

                            if (constraints?.radius !== undefined) {
                                labels.push(
                                    <div key="r" className="absolute px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-[#00FF9D] font-mono border border-[#00FF9D]/30 backdrop-blur-sm"
                                        style={{ left: cx, top: cy, transform: `translate(${r / 1.4}px, -${r / 1.4}px)` }}>
                                        R: {constraints.radius}
                                    </div>
                                );
                            }
                        }

                        if (labels.length === 0) return null;
                        return <div key={entity.id}>{labels}</div>;
                    })}
                </div>
                {isDrawing && currentPoint && (
                    <div
                        className="pointer-events-none absolute z-50 flex items-center gap-2"
                        style={{
                            left: sketchToCanvas(currentPoint)[0] + 20,
                            top: sketchToCanvas(currentPoint)[1] - 20,
                        }}
                    >

                        {(() => {
                            // Calculate live values if input is empty
                            let livePrimary = '---';
                            let liveSecondary = '---';

                            if (startPoint) {
                                if (tool === 'line') {
                                    const dx = currentPoint[0] - startPoint[0];
                                    const dy = currentPoint[1] - startPoint[1];
                                    const len = Math.sqrt(dx * dx + dy * dy);
                                    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
                                    livePrimary = len.toFixed(1);
                                    liveSecondary = Math.abs(ang).toFixed(0);
                                } else if (tool === 'circle') {
                                    const dx = currentPoint[0] - startPoint[0];
                                    const dy = currentPoint[1] - startPoint[1];
                                    const r = Math.sqrt(dx * dx + dy * dy);
                                    livePrimary = r.toFixed(1);
                                } else if (tool === 'rectangle') {
                                    const w = Math.abs(currentPoint[0] - startPoint[0]);
                                    const h = Math.abs(currentPoint[1] - startPoint[1]);
                                    livePrimary = w.toFixed(1);
                                    liveSecondary = h.toFixed(1);
                                }
                            }

                            return (
                                <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-zinc-900/90 p-2 shadow-2xl backdrop-blur-xl">
                                    {/* Primary Input */}
                                    <div className="flex items-center gap-2">
                                        <span className="w-12 text-[10px] font-bold uppercase text-zinc-500">
                                            {tool === 'line' ? 'Len' :
                                                tool === 'circle' ? 'Rad' :
                                                    'Width'}
                                        </span>
                                        <div
                                            className={`flex items-center gap-1 rounded px-2 py-1 transition-all ${inputTarget === 'primary'
                                                ? (snapState?.type !== 'none' ? 'bg-[#00FF9D]/10 ring-1 ring-[#00FF9D]/50 shadow-[0_0_10px_rgba(0,255,157,0.1)]' : 'bg-blue-500/20 ring-1 ring-blue-500/50')
                                                : 'bg-zinc-800'
                                                }`}
                                            data-testid="primary-input-display"
                                        >
                                            <span className={`text-sm font-mono transition-colors ${inputTarget === 'primary'
                                                ? (snapState?.type !== 'none' ? 'text-[#00FF9D] font-bold' : 'text-blue-400')
                                                : 'text-zinc-400'
                                                }`}>
                                                {dynamicInput || livePrimary}
                                            </span>
                                            <span className="text-[10px] text-zinc-500">mm</span>
                                        </div>
                                    </div>

                                    {/* Secondary Input (Conditional) */}
                                    {(tool === 'line' || tool === 'rectangle') && (
                                        <div className="flex items-center gap-2">
                                            <span className="w-12 text-[10px] font-bold uppercase text-zinc-500">
                                                {tool === 'line' ? 'Ang' : 'Height'}
                                            </span>
                                            <div
                                                className={`flex items-center gap-1 rounded px-2 py-1 transition-all ${inputTarget === 'secondary'
                                                    ? (snapState?.type !== 'none' ? 'bg-[#00FF9D]/10 ring-1 ring-[#00FF9D]/50 shadow-[0_0_10px_rgba(0,255,157,0.1)]' : 'bg-blue-500/20 ring-1 ring-blue-500/50')
                                                    : 'bg-zinc-800'
                                                    }`}
                                                data-testid="secondary-input-display"
                                            >
                                                <span className={`text-sm font-mono transition-colors ${inputTarget === 'secondary'
                                                    ? (snapState?.type !== 'none' ? 'text-[#00FF9D] font-bold' : 'text-blue-400')
                                                    : 'text-zinc-400'
                                                    }`}>
                                                    {secondaryInput || liveSecondary}
                                                </span>
                                                <span className="text-[10px] text-zinc-500">{tool === 'line' ? 'deg' : 'mm'}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-1 flex flex-col gap-0.5 border-t border-white/5 pt-1">
                                        {(tool === 'line' || tool === 'rectangle') && (
                                            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                                <kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">Tab</kbd>
                                                <span>to switch fields</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                            <kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">Enter</kbd>
                                            <span>to finish</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Snap Indicators */}
                {isDrawing && snapState && snapState.type !== 'none' && (
                    <div
                        className="pointer-events-none absolute z-50 transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                            left: sketchToCanvas(snapState.point)[0],
                            top: sketchToCanvas(snapState.point)[1],
                        }}
                    >
                        <SnapIndicators type={snapState.type} />
                    </div>
                )}

                {/* Custom Cursor Badge */}
                {mousePosition && (
                    <div
                        className="pointer-events-none absolute z-[100] transform translate-x-3 translate-y-3 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md px-2 py-1 rounded border border-white/10 shadow-2xl transition-opacity animate-in fade-in duration-200"
                        style={{ left: mousePosition.x, top: mousePosition.y }}
                    >
                        {tool === 'line' && <Pencil size={12} className="text-blue-400" />}
                        {tool === 'circle' && <Circle size={12} className="text-purple-400" />}
                        {tool === 'rectangle' && <Square size={12} className="text-green-400" />}
                        {tool === 'select' && <MousePointer2 size={12} className="text-zinc-400" />}
                        <span className="text-[10px] text-zinc-100 font-bold uppercase tracking-widest">{tool}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
