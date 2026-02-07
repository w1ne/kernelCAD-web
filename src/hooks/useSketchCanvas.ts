
import { useState, useCallback, useMemo } from 'react';
import type { SketchEntity, Point2D, SketchTool } from '../types/sketch';
import { useSketching } from '../context/SketchingContext';
import { decomposeUISketchEntities, syncUIEntities } from '../lib/constraints/bridge';
import type { Constraint } from '../lib/constraints/types';

interface UseSketchCanvasProps {
    canvasWidth: number;
    canvasHeight: number;
    gridSize: number;
    gridUnit: number;
}

export interface SnapState {
    type: 'none' | 'horizontal' | 'vertical' | 'coincident' | 'midpoint' | 'center' | 'alignment';
    point: Point2D;
    refPoints?: Point2D[]; // Points to draw guide lines to
}

export function useSketchCanvas({
    canvasWidth,
    canvasHeight,
    gridSize,
    gridUnit
}: UseSketchCanvasProps) {
    const { entities: solverEntitiesMap, addEntity, addConstraint } = useSketching();
    const [tool, setTool] = useState<SketchTool>('line');
    const [entities, setEntities] = useState<SketchEntity[]>([]);

    // Sync UI entities with Solver results
    const syncedEntities = useMemo(() => {
        return syncUIEntities(entities, solverEntitiesMap);
    }, [entities, solverEntitiesMap]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point2D | null>(null);
    const [currentPoint, setCurrentPoint] = useState<Point2D | null>(null);
    const [dynamicInput, setDynamicInput] = useState<string>('');
    const [secondaryInput, setSecondaryInput] = useState<string>('');
    const [inputTarget, setInputTarget] = useState<'primary' | 'secondary'>('primary');
    const [snapState, setSnapState] = useState<SnapState | undefined>(undefined);
    const [startSnap, setStartSnap] = useState<SnapState | undefined>(undefined);

    const { pointMap } = useMemo(() => decomposeUISketchEntities(entities), [entities]);

    const getPointKey = (p: Point2D) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;

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
    const createEntity = useCallback((currentTool: SketchTool, start: Point2D, end: Point2D, dimensions: { primary?: string, secondary?: string }, snapType?: SnapState['type']): SketchEntity | null => {
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
                // Auto-constraints
                if (snapType === 'horizontal') {
                    entity.constraints = { ...entity.constraints, horizontal: true };
                } else if (snapType === 'vertical') {
                    entity.constraints = { ...entity.constraints, vertical: true };
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
    const calculateSnappedPoint = useCallback((start: Point2D, current: Point2D, dim1: string, dim2: string): SnapState => {
        const val1 = parseFloat(dim1);
        const val2 = parseFloat(dim2);

        // Snap threshold in sketch units (default 10 pixels)
        const PIXEL_THRESHOLD = 12;
        const threshold = PIXEL_THRESHOLD / gridSize;

        // Default result
        let resultPoint: Point2D = [...current];
        let snapType: SnapState['type'] = 'none';

        // 1. Gather Candidate Snap Points
        const endpoints: Point2D[] = [];
        const midpoints: Point2D[] = [];
        const centers: Point2D[] = [];

        entities.forEach(e => {
            if (e.type === 'line') {
                endpoints.push(e.start);
                endpoints.push(e.end);
                midpoints.push([
                    (e.start[0] + e.end[0]) / 2,
                    (e.start[1] + e.end[1]) / 2
                ]);
            } else if (e.type === 'rectangle') {
                const { corner, width, height } = e;
                const points: Point2D[] = [
                    corner,
                    [corner[0] + width, corner[1]],
                    [corner[0], corner[1] - height],
                    [corner[0] + width, corner[1] - height]
                ];
                endpoints.push(...points);
                // Midpoints of 4 sides
                midpoints.push([(points[0][0] + points[1][0]) / 2, points[0][1]]); // Top
                midpoints.push([(points[2][0] + points[3][0]) / 2, points[2][1]]); // Bottom
                midpoints.push([points[0][0], (points[0][1] + points[2][1]) / 2]); // Left
                midpoints.push([points[1][0], (points[1][1] + points[3][1]) / 2]); // Right
            } else if (e.type === 'circle') {
                centers.push(e.center);
            }
        });

        // 2. High Priority: Coincident / Midpoint / Center (Point Snaps)
        // Manual dimensions generally override point snaps to avoid unexpected jumps
        if (isNaN(val1) && isNaN(val2)) {
            let bestDist = threshold;
            let bestPoint: Point2D | null = null;
            let bestType: SnapState['type'] = 'none';

            // Check endpoints
            for (const pt of endpoints) {
                if (pt[0] === start[0] && pt[1] === start[1]) continue;
                const d = Math.sqrt((current[0] - pt[0]) ** 2 + (current[1] - pt[1]) ** 2);
                if (d < bestDist) {
                    bestDist = d;
                    bestPoint = pt;
                    bestType = 'coincident';
                }
            }

            // Check midpoints (if no endpoint hit)
            if (bestType === 'none') {
                for (const pt of midpoints) {
                    const d = Math.sqrt((current[0] - pt[0]) ** 2 + (current[1] - pt[1]) ** 2);
                    if (d < bestDist) {
                        bestDist = d;
                        bestPoint = pt;
                        bestType = 'midpoint';
                    }
                }
            }

            // Check centers
            if (bestType === 'none') {
                for (const pt of centers) {
                    const d = Math.sqrt((current[0] - pt[0]) ** 2 + (current[1] - pt[1]) ** 2);
                    if (d < bestDist) {
                        bestDist = d;
                        bestPoint = pt;
                        bestType = 'center';
                    }
                }
            }

            if (bestPoint) {
                return { point: bestPoint, type: bestType };
            }
        }

        // 3. Tool-Specific Logic with Alignment Snapping
        if (tool === 'line') {
            const dx = current[0] - start[0];
            const dy = current[1] - start[1];
            let angle = Math.atan2(dy, dx);
            let length = Math.sqrt(dx * dx + dy * dy);

            // Alignment Snapping (H/V relative to START)
            if (isNaN(val2)) {
                const absAngle = Math.abs(angle);
                const isHoriz = absAngle < 0.08 || Math.abs(absAngle - Math.PI) < 0.08; // ~4.5 deg
                const isVert = Math.abs(absAngle - Math.PI / 2) < 0.08;

                if (isHoriz) {
                    resultPoint = [current[0], start[1]];
                    length = Math.abs(current[0] - start[0]);
                    angle = (current[0] >= start[0]) ? 0 : Math.PI;
                    snapType = 'horizontal';
                } else if (isVert) {
                    resultPoint = [start[0], current[1]];
                    length = Math.abs(current[1] - start[1]);
                    angle = (current[1] >= start[1]) ? Math.PI / 2 : -Math.PI / 2;
                    snapType = 'vertical';
                }
            }

            // 4. Alignment Guidelines (Inference snapping to OTHER points)
            // If we didn't snap H/V to start, check if we snap H/V to OTHER points
            if (snapType === 'none' && isNaN(val1) && isNaN(val2)) {
                const allPoints = [...endpoints, ...midpoints, ...centers];
                let bestX: number | null = null;
                let bestY: number | null = null;
                const refs: Point2D[] = [];

                for (const pt of allPoints) {
                    if (pt[0] === start[0] && pt[1] === start[1]) continue;

                    if (Math.abs(current[0] - pt[0]) < threshold) {
                        bestX = pt[0];
                        refs.push(pt);
                    }
                    if (Math.abs(current[1] - pt[1]) < threshold) {
                        bestY = pt[1];
                        refs.push(pt);
                    }
                }

                if (bestX !== null || bestY !== null) {
                    resultPoint = [
                        bestX !== null ? bestX : current[0],
                        bestY !== null ? bestY : current[1]
                    ];
                    snapType = 'alignment';
                    return { point: resultPoint, type: snapType, refPoints: refs };
                }
            }

            // Dimensions Override
            if (!isNaN(val1)) length = val1;
            if (!isNaN(val2)) angle = (val2 * Math.PI) / 180;

            if (!isNaN(val1) || !isNaN(val2)) {
                resultPoint = [
                    start[0] + Math.cos(angle) * length,
                    start[1] + Math.sin(angle) * length
                ];

                // Preserve exact axis for H/V snaps even with dimension overrides
                if (snapType === 'horizontal') resultPoint[1] = start[1];
                if (snapType === 'vertical') resultPoint[0] = start[0];
            }
        } else if (tool === 'circle') {
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
    }, [tool, entities, gridSize]);

    const handleMouseDown = useCallback((x: number, y: number) => {
        const rawPoint = canvasToSketch(x, y);
        const { point: snappedPoint, type: snapType } = calculateSnappedPoint(rawPoint, rawPoint, '', '');

        setStartPoint(snappedPoint);
        setCurrentPoint(snappedPoint);
        setStartSnap({ type: snapType, point: snappedPoint });
        setIsDrawing(true);
        setDynamicInput('');
        setSecondaryInput('');
        setInputTarget('primary');
        setSnapState(undefined);
    }, [canvasToSketch, calculateSnappedPoint]);

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
        const { point: finalPoint, type: snapType } = calculateSnappedPoint(startPoint, currentPoint, dynamicInput, secondaryInput);

        // Prevent zero-length entities
        if (Math.abs(startPoint[0] - finalPoint[0]) < 0.001 && Math.abs(startPoint[1] - finalPoint[1]) < 0.001) {
            setIsDrawing(false);
            setStartPoint(null);
            setCurrentPoint(null);
            setDynamicInput('');
            setSecondaryInput('');
            setSnapState(undefined);
            setStartSnap(undefined);
            return;
        }

        const newEntity = createEntity(tool, startPoint, finalPoint, {
            primary: dynamicInput,
            secondary: secondaryInput
        }, snapType);

        if (newEntity) {
            setEntities(prev => [...prev, newEntity]);

            // Add to SketchingContext (Solver)
            // 1. Map atoms (line/arc parts)
            const { solverEntities } = decomposeUISketchEntities([newEntity]);
            solverEntities.forEach(e => addEntity(e));

            // 2. Register Constraints
            const newConstraints: Constraint[] = [];

            // A. Start point coincidence
            if (startSnap && startSnap.type !== 'none' && startSnap.type !== 'horizontal' && startSnap.type !== 'vertical') {
                const targetPointId = pointMap.get(getPointKey(startSnap.point));
                if (targetPointId) {
                    newConstraints.push({
                        id: `const_start_coin_${Date.now()}_${Math.random()}`,
                        type: 'COINCIDENT',
                        entities: [`${newEntity.id}_start`, targetPointId]
                    });
                }
            }

            // B. End point coincidence
            if (snapType !== 'none' && snapType !== 'horizontal' && snapType !== 'vertical' && snapType !== 'alignment') {
                const targetPointId = pointMap.get(getPointKey(finalPoint));
                if (targetPointId) {
                    newConstraints.push({
                        id: `const_end_coin_${Date.now()}_${Math.random()}`,
                        type: 'COINCIDENT',
                        entities: [`${newEntity.id}_end`, targetPointId]
                    });
                }
            }

            // C. Auto-constraints (Horizontal/Vertical)
            if (snapType === 'horizontal') {
                newConstraints.push({
                    id: `const_h_${newEntity.id}`,
                    type: 'HORIZONTAL',
                    entities: [`${newEntity.id}_start`, `${newEntity.id}_end`]
                });
            } else if (snapType === 'vertical') {
                newConstraints.push({
                    id: `const_v_${newEntity.id}`,
                    type: 'VERTICAL',
                    entities: [`${newEntity.id}_start`, `${newEntity.id}_end`]
                });
            }

            // D. Driving Dimensions
            if (!isNaN(parseFloat(dynamicInput))) {
                if (tool === 'line') {
                    newConstraints.push({
                        id: `const_len_${newEntity.id}`,
                        type: 'DISTANCE',
                        entities: [`${newEntity.id}_start`, `${newEntity.id}_end`],
                        value: parseFloat(dynamicInput)
                    });
                } else if (tool === 'circle') {
                    newConstraints.push({
                        id: `const_rad_${newEntity.id}`,
                        type: 'RADIUS',
                        entities: [newEntity.id],
                        value: parseFloat(dynamicInput)
                    });
                }
            }

            newConstraints.forEach(c => addConstraint(c));
        }

        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
        setDynamicInput('');
        setSecondaryInput('');
        setSnapState(undefined);
        setStartSnap(undefined);
    }, [isDrawing, startPoint, currentPoint, tool, createEntity, dynamicInput, secondaryInput, calculateSnappedPoint, addEntity, addConstraint, pointMap, startSnap]);

    const clear = useCallback(() => setEntities([]), []);

    return {
        tool,
        setTool,
        entities: syncedEntities,
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

