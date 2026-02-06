import type { SketchEntity, Point2D } from '../../types/sketch';
import type {
    SketchEntity as SolverEntity,
    Constraint,
    Point as SolverPoint
} from './types';

export function convertSketchEntitiesToConstraints(sketchEntities: SketchEntity[]): {
    entities: Map<string, SolverEntity>;
    constraints: Constraint[];
} {
    const solverEntities = new Map<string, SolverEntity>();
    const solverConstraints: Constraint[] = [];

    const createPoint = (p: Point2D, idPrefix: string): string => {
        const id = `${idPrefix}_pt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        solverEntities.set(id, {
            id,
            type: 'POINT',
            x: p[0],
            y: p[1],
            fixed: false
        });
        return id;
    };

    sketchEntities.forEach(entity => {
        switch (entity.type) {
            case 'line': {
                const p1Id = createPoint(entity.start, entity.id + '_s');
                const p2Id = createPoint(entity.end, entity.id + '_e');

                // Fix the first point to provide a stable reference for simple solver tests
                const p1 = solverEntities.get(p1Id) as SolverPoint;
                p1.fixed = true;

                const lineId = entity.id;
                solverEntities.set(lineId, {
                    id: lineId,
                    type: 'LINE',
                    p1: p1Id,
                    p2: p2Id
                });

                if (entity.constraints?.length !== undefined) {
                    solverConstraints.push({
                        id: `dist_${lineId}`,
                        type: 'DISTANCE',
                        entities: [p1Id, p2Id],
                        value: entity.constraints.length
                    });
                }
                if (entity.constraints?.angle !== undefined) {
                    solverConstraints.push({
                        id: `angle_${lineId}`,
                        type: 'ANGLE',
                        entities: [lineId],
                        value: entity.constraints.angle
                    });
                }
                break;
            }

            case 'circle': {
                const centerId = createPoint(entity.center, entity.id + '_c');
                const circleId = entity.id;

                solverEntities.set(circleId, {
                    id: circleId,
                    type: 'CIRCLE',
                    center: centerId,
                    radius: entity.radius
                });

                if (entity.constraints?.radius !== undefined) {
                    solverConstraints.push({
                        id: `rad_${circleId}`,
                        type: 'RADIUS',
                        entities: [circleId],
                        value: entity.constraints.radius
                    });
                }
                break;
            }

            case 'rectangle': {
                const { corner, width, height } = entity;
                const p1 = createPoint(corner, entity.id + '_1'); // Top-left
                const p2 = createPoint([corner[0] + width, corner[1]], entity.id + '_2'); // Top-right
                const p3 = createPoint([corner[0] + width, corner[1] - height], entity.id + '_3'); // Bottom-right
                const p4 = createPoint([corner[0], corner[1] - height], entity.id + '_4'); // Bottom-left

                // Helper to add line
                const addLine = (id: string, s: string, e: string) => {
                    solverEntities.set(id, { id, type: 'LINE', p1: s, p2: e });
                };

                const l1 = `${entity.id}_top`;
                const l2 = `${entity.id}_right`;
                const l3 = `${entity.id}_bottom`;
                const l4 = `${entity.id}_left`;

                addLine(l1, p1, p2);
                addLine(l2, p2, p3);
                addLine(l3, p3, p4);
                addLine(l4, p4, p1);

                // Add structural constraints (Horizontal/Vertical)
                solverConstraints.push({ id: `h_${l1}`, type: 'HORIZONTAL', entities: [l1] });
                solverConstraints.push({ id: `v_${l2}`, type: 'VERTICAL', entities: [l2] });
                solverConstraints.push({ id: `h_${l3}`, type: 'HORIZONTAL', entities: [l3] });
                solverConstraints.push({ id: `v_${l4}`, type: 'VERTICAL', entities: [l4] });

                if (entity.constraints?.width !== undefined) {
                    solverConstraints.push({
                        id: `width_${entity.id}`,
                        type: 'DISTANCE',
                        entities: [p1, p2],
                        value: entity.constraints.width
                    });
                }
                if (entity.constraints?.height !== undefined) {
                    solverConstraints.push({
                        id: `height_${entity.id}`,
                        type: 'DISTANCE',
                        entities: [p1, p4],
                        value: entity.constraints.height
                    });
                }
                break;
            }
        }
    });

    return { entities: solverEntities, constraints: solverConstraints };
}
