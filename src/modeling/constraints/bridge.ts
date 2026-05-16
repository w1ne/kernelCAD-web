import { type SketchEntity as UISketchEntity, type Point2D } from '../../shared/types/sketch';
import { type SketchEntity as SolverEntity, type Point as SolverPoint, type Line as SolverLine, type Circle as SolverCircle } from './types';

export interface EntityBridgeResult {
    solverEntities: SolverEntity[];
    pointMap: Map<string, string>; // Maps UI entity point locations to Solver Point IDs
}

/**
 * Decomposes UI Sketch Entities into Solver-ready atomic entities.
 * 
 * Logic:
 * - Line: 2 Points + 1 Line
 * - Rectangle: 4 Points + 4 Lines
 * - Circle: 1 Point (Center) + 1 Circle
 */
export function decomposeUISketchEntities(entities: UISketchEntity[]): EntityBridgeResult {
    const solverEntities: SolverEntity[] = [];
    const pointMap = new Map<string, string>();

    const getPointKey = (p: Point2D) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;

    const createPoint = (p: Point2D, id: string): SolverPoint => {
        const point: SolverPoint = {
            id,
            type: 'POINT',
            x: p[0],
            y: p[1],
            fixed: false
        };
        pointMap.set(getPointKey(p), id);
        return point;
    };

    entities.forEach((entity) => {
        switch (entity.type) {
            case 'line': {
                const p1Id = `${entity.id}_start`;
                const p2Id = `${entity.id}_end`;
                solverEntities.push(createPoint(entity.start, p1Id));
                solverEntities.push(createPoint(entity.end, p2Id));
                solverEntities.push({
                    id: entity.id,
                    type: 'LINE',
                    p1: p1Id,
                    p2: p2Id
                } as SolverLine);
                break;
            }
            case 'rectangle': {
                const { corner, width, height } = entity;
                const p1: Point2D = corner; // Top-left
                const p2: Point2D = [corner[0] + width, corner[1]]; // Top-right
                const p3: Point2D = [corner[0] + width, corner[1] - height]; // Bottom-right
                const p4: Point2D = [corner[0], corner[1] - height]; // Bottom-left

                const points = [p1, p2, p3, p4];
                const pIds = points.map((p, i) => {
                    const id = `${entity.id}_p${i + 1}`;
                    solverEntities.push(createPoint(p, id));
                    return id;
                });

                // Create 4 lines
                for (let i = 0; i < 4; i++) {
                    solverEntities.push({
                        id: `${entity.id}_l${i + 1}`,
                        type: 'LINE',
                        p1: pIds[i],
                        p2: pIds[(i + 1) % 4]
                    } as SolverLine);
                }
                break;
            }
            case 'circle': {
                const centerId = `${entity.id}_center`;
                solverEntities.push(createPoint(entity.center, centerId));
                solverEntities.push({
                    id: entity.id,
                    type: 'CIRCLE',
                    center: centerId,
                    radius: entity.radius
                } as SolverCircle);
                break;
            }
        }
    });

    return { solverEntities, pointMap };
}

/**
 * Recomposes UI Sketch Entities from Solved Solver Entities.
 */
export function syncUIEntities(uiEntities: UISketchEntity[], solverEntities: Map<string, SolverEntity>): UISketchEntity[] {
    return uiEntities.map((entity) => {
        switch (entity.type) {
            case 'line': {
                const p1 = solverEntities.get(`${entity.id}_start`) as SolverPoint;
                const p2 = solverEntities.get(`${entity.id}_end`) as SolverPoint;
                if (p1 && p2) {
                    return {
                        ...entity,
                        start: [p1.x, p1.y],
                        end: [p2.x, p2.y]
                    };
                }
                break;
            }
            case 'rectangle': {
                const p1 = solverEntities.get(`${entity.id}_p1`) as SolverPoint;
                const p2 = solverEntities.get(`${entity.id}_p2`) as SolverPoint;
                const p4 = solverEntities.get(`${entity.id}_p4`) as SolverPoint;
                if (p1 && p2 && p4) {
                    // Recalculate width/height from solved points
                    const width = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                    const height = Math.sqrt(Math.pow(p4.x - p1.x, 2) + Math.pow(p4.y - p1.y, 2));
                    return {
                        ...entity,
                        corner: [p1.x, p1.y],
                        width,
                        height
                    };
                }
                break;
            }
            case 'circle': {
                const center = solverEntities.get(`${entity.id}_center`) as SolverPoint;
                const circle = solverEntities.get(entity.id) as SolverCircle;
                if (center && circle) {
                    return {
                        ...entity,
                        center: [center.x, center.y],
                        radius: circle.radius
                    };
                }
                break;
            }
        }
        return entity;
    });
}
