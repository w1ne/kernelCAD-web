import type { Constraint, Point, SketchEntity, SolverState } from "./types";
// import type { EntityType } from "./types";

export class ConstraintSolver {
    private iterations: number = 20;

    solve(state: SolverState) {
        for (let i = 0; i < this.iterations; i++) {
            let totalError = 0;
            for (const constraint of state.constraints) {
                totalError += this.solveConstraint(constraint, state.entities);
            }
            // If satisfied, break early? (Maybe keep it stable for dragging)
            if (totalError < 0.0001) break;
        }
    }

    private solveConstraint(constraint: Constraint, entities: Map<string, SketchEntity>): number {
        switch (constraint.type) {
            case 'COINCIDENT':
                return this.solveCoincident(constraint, entities);
            case 'DISTANCE':
                return this.solveDistance(constraint, entities);
            case 'HORIZONTAL':
                return this.solveHorizontal(constraint, entities);
            case 'VERTICAL':
                return this.solveVertical(constraint, entities);
            default:
                // console.warn('Unsupported constraint type:', constraint.type);
                return 0;
        }
    }

    private getPoint(id: string, entities: Map<string, SketchEntity>): Point | null {
        // Direct point
        let entity = entities.get(id);
        if (entity?.type === 'POINT') return entity;

        // If entity is a line/circle, we might be referencing a sub-point, 
        // but for now, we assume constraints link Points directly.
        // A "Coincident" on an endpoint of a line should target the endpoint's ID, 
        // which should be an independent Point entity in our model.
        return null;
    }

    private solveCoincident(c: Constraint, entities: Map<string, SketchEntity>): number {
        if (c.entities.length !== 2) return 0;
        const p1 = this.getPoint(c.entities[0], entities);
        const p2 = this.getPoint(c.entities[1], entities);

        if (!p1 || !p2) return 0;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < 0.000001) return 0; // Already coincident

        // Move points towards each other (0.5 each if both free)
        const factor = 0.5;

        if (!p1.fixed && !p2.fixed) {
            p1.x += dx * factor;
            p1.y += dy * factor;
            p2.x -= dx * factor;
            p2.y -= dy * factor;
        } else if (!p1.fixed) {
            p1.x += dx;
            p1.y += dy;
        } else if (!p2.fixed) {
            p2.x -= dx;
            p2.y -= dy;
        }

        return distSq;
    }

    private solveDistance(c: Constraint, entities: Map<string, SketchEntity>): number {
        if (c.entities.length !== 2 || c.value === undefined) return 0;
        const p1 = this.getPoint(c.entities[0], entities);
        const p2 = this.getPoint(c.entities[1], entities);
        if (!p1 || !p2) return 0;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const currentDist = Math.sqrt(dx * dx + dy * dy);

        if (Math.abs(currentDist - c.value) < 0.001) return 0;

        const difference = (currentDist - c.value) / currentDist;
        const moveX = dx * difference * 0.5;
        const moveY = dy * difference * 0.5;

        if (!p1.fixed && !p2.fixed) {
            p1.x += moveX;
            p1.y += moveY;
            p2.x -= moveX;
            p2.y -= moveY;
        } else if (!p1.fixed) {
            // P2 is fixed, P1 moves full difference away/towards
            p1.x += dx * difference; // Check direction
            p1.y += dy * difference;
        } else if (!p2.fixed) {
            p2.x -= dx * difference;
            p2.y -= dy * difference;
        }

        return Math.abs(currentDist - c.value);
    }

    private solveHorizontal(c: Constraint, entities: Map<string, SketchEntity>): number {
        // Enforce same Y
        if (c.entities.length !== 2) return 0;
        const p1 = this.getPoint(c.entities[0], entities);
        const p2 = this.getPoint(c.entities[1], entities);
        if (!p1 || !p2) return 0;

        const dy = p2.y - p1.y;
        if (Math.abs(dy) < 0.0001) return 0;

        if (!p1.fixed && !p2.fixed) {
            p1.y += dy * 0.5;
            p2.y -= dy * 0.5;
        } else if (!p1.fixed) {
            p1.y += dy;
        } else if (!p2.fixed) {
            p2.y -= dy;
        }
        return Math.abs(dy);
    }

    private solveVertical(c: Constraint, entities: Map<string, SketchEntity>): number {
        // Enforce same X
        if (c.entities.length !== 2) return 0;
        const p1 = this.getPoint(c.entities[0], entities);
        const p2 = this.getPoint(c.entities[1], entities);
        if (!p1 || !p2) return 0;

        const dx = p2.x - p1.x;
        if (Math.abs(dx) < 0.0001) return 0;

        if (!p1.fixed && !p2.fixed) {
            p1.x += dx * 0.5;
            p2.x -= dx * 0.5;
        } else if (!p1.fixed) {
            p1.x += dx;
        } else if (!p2.fixed) {
            p2.x -= dx;
        }
        return Math.abs(dx);
    }
}
