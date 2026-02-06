import type { Constraint, Point, SketchEntity, SolverState, Line, Circle } from "./types";
// import type { EntityType } from "./types";

export class ConstraintSolver {
    private iterations: number = 100;

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
            case 'PARALLEL':
                return this.solveParallel(constraint, entities);
            case 'PERPENDICULAR':
                return this.solvePerpendicular(constraint, entities);
            case 'TANGENT':
                return this.solveTangent(constraint, entities);
            case 'RADIUS':
                return this.solveRadius(constraint, entities);
            case 'ANGLE':
                return this.solveAngle(constraint, entities);
            case 'EQUAL_LENGTH':
                return this.solveConnect(constraint, entities); // Equal length logic
            default:
                // console.warn('Unsupported constraint type:', constraint.type);
                return 0;
        }
    }

    private getPoint(id: string, entities: Map<string, SketchEntity>): Point | null {
        // Direct point
        const entity = entities.get(id);
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

    private getLine(id: string, entities: Map<string, SketchEntity>): { line: Line, p1: Point, p2: Point } | null {
        const entity = entities.get(id);
        if (entity?.type !== 'LINE') return null;

        const p1 = this.getPoint(entity.p1, entities);
        const p2 = this.getPoint(entity.p2, entities);

        if (!p1 || !p2) return null;
        return { line: entity, p1, p2 };
    }

    private getCircle(id: string, entities: Map<string, SketchEntity>): { circle: Circle, center: Point } | null {
        const entity = entities.get(id);
        if (entity?.type !== 'CIRCLE') return null;
        const center = this.getPoint(entity.center, entities);
        if (!center) return null;
        return { circle: entity, center };
    }

    private solveParallel(c: Constraint, entities: Map<string, SketchEntity>): number {
        if (c.entities.length !== 2) return 0;
        const l1 = this.getLine(c.entities[0], entities);
        const l2 = this.getLine(c.entities[1], entities);

        if (!l1 || !l2) return 0;

        const dx1 = l1.p2.x - l1.p1.x;
        const dy1 = l1.p2.y - l1.p1.y;
        const dx2 = l2.p2.x - l2.p1.x;
        const dy2 = l2.p2.y - l2.p1.y;

        // Cross product of direction vectors should be 0
        // (x1*y2 - x2*y1)
        const cross = dx1 * dy2 - dx2 * dy1;

        if (Math.abs(cross) < 0.001) return 0;

        // Normalized vectors:
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (len1 < 0.001 || len2 < 0.001) return 0;

        const ndx1 = dx1 / len1;
        const ndy1 = dy1 / len1;
        const ndx2 = dx2 / len2;
        const ndy2 = dy2 / len2;

        // sine of angle between them is close to cross product of normalized
        const sinTheta = ndx1 * ndy2 - ndx2 * ndy1;

        // We want to reduce sinTheta to 0.
        // Move points perpendicular to their lines.
        // Scale by length because moving an endpoint of a long line requires larger displacement for same angle.
        // factor 0.5.

        if (!l1.p1.fixed) {
            const scale = len1 * 0.5 * sinTheta;
            l1.p1.x += ndy1 * scale;
            l1.p1.y -= ndx1 * scale;
        }
        if (!l1.p2.fixed) {
            const scale = len1 * 0.5 * sinTheta;
            l1.p2.x -= ndy1 * scale;
            l1.p2.y += ndx1 * scale;
        }

        if (!l2.p1.fixed) {
            const scale = len2 * 0.5 * sinTheta;
            l2.p1.x -= ndy2 * scale;
            l2.p1.y += ndx2 * scale;
        }
        if (!l2.p2.fixed) {
            const scale = len2 * 0.5 * sinTheta;
            l2.p2.x += ndy2 * scale;
            l2.p2.y -= ndx2 * scale;
        }

        return Math.abs(cross);
    }

    private solvePerpendicular(c: Constraint, entities: Map<string, SketchEntity>): number {
        if (c.entities.length !== 2) return 0;
        const l1 = this.getLine(c.entities[0], entities);
        const l2 = this.getLine(c.entities[1], entities);

        if (!l1 || !l2) return 0;

        const dx1 = l1.p2.x - l1.p1.x;
        const dy1 = l1.p2.y - l1.p1.y;
        const dx2 = l2.p2.x - l2.p1.x;
        const dy2 = l2.p2.y - l2.p1.y;

        // Dot product should be 0
        const dot = dx1 * dx2 + dy1 * dy2;

        if (Math.abs(dot) < 0.001) return 0;

        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (len1 < 0.001 || len2 < 0.001) return 0;

        // Normalize
        const ndx1 = dx1 / len1;
        const ndy1 = dy1 / len1;
        const ndx2 = dx2 / len2;
        const ndy2 = dy2 / len2;

        // Cosine of angle is dot product of normalized
        const cosTheta = ndx1 * ndx2 + ndy1 * ndy2;

        // Rotate L1
        if (!l1.p1.fixed) {
            const scale = len1 * 0.5 * cosTheta;
            l1.p1.x += ndy1 * scale;
            l1.p1.y -= ndx1 * scale;
        }
        if (!l1.p2.fixed) {
            const scale = len1 * 0.5 * cosTheta;
            l1.p2.x -= ndy1 * scale;
            l1.p2.y += ndx1 * scale;
        }

        // Rotate L2
        if (!l2.p1.fixed) {
            const scale = len2 * 0.5 * cosTheta;
            l2.p1.x += ndy2 * scale;
            l2.p1.y -= ndx2 * scale;
        }
        if (!l2.p2.fixed) {
            const scale = len2 * 0.5 * cosTheta;
            l2.p2.x -= ndy2 * scale;
            l2.p2.y += ndx2 * scale;
        }

        return Math.abs(dot);
    }

    private solveTangent(c: Constraint, entities: Map<string, SketchEntity>): number {
        if (c.entities.length !== 2) return 0;

        // Check types
        const e1 = entities.get(c.entities[0]);
        const e2 = entities.get(c.entities[1]);

        if (!e1 || !e2) return 0;

        // Case 1: Circle and Line
        let circleInfo: { circle: Circle, center: Point } | null = null;
        let lineInfo: { line: Line, p1: Point, p2: Point } | null = null;

        if (e1.type === 'CIRCLE' && e2.type === 'LINE') {
            circleInfo = this.getCircle(c.entities[0], entities);
            lineInfo = this.getLine(c.entities[1], entities);
        } else if (e1.type === 'LINE' && e2.type === 'CIRCLE') {
            lineInfo = this.getLine(c.entities[0], entities);
            circleInfo = this.getCircle(c.entities[1], entities);
        }

        if (circleInfo && lineInfo) {
            return this.solveTangentCircleLine(circleInfo, lineInfo);
        }

        // Case 2: Circle and Circle
        if (e1.type === 'CIRCLE' && e2.type === 'CIRCLE') {
            const c1 = this.getCircle(c.entities[0], entities);
            const c2 = this.getCircle(c.entities[1], entities);
            if (c1 && c2) return this.solveTangentCircleCircle(c1, c2);
        }

        return 0;
    }

    private solveTangentCircleLine(
        c: { circle: Circle, center: Point },
        l: { line: Line, p1: Point, p2: Point }
    ): number {
        // Distance from center to line should equal radius
        const dx = l.p2.x - l.p1.x;
        const dy = l.p2.y - l.p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len < 0.0001) return 0;

        // Standard line eq: Ax + By + C = 0
        // A = -dy, B = dx, C = dy*x1 - dx*y1
        // Dist = |Ax0 + By0 + C| / sqrt(A^2 + B^2)

        const A = -dy;
        const B = dx;
        const C_val = dy * l.p1.x - dx * l.p1.y;

        const num = Math.abs(A * c.center.x + B * c.center.y + C_val);
        const dist = num / len;

        const err = dist - c.circle.radius;
        if (Math.abs(err) < 0.001) return 0;

        // Move center towards/away from line
        // Normal vector to line: (A, B) normalized
        // We want center to be at distance R.
        // Vector from line to center (signed distance direction) is roughly...

        // Let's project center onto line to find closest point P_closest
        const t = ((c.center.x - l.p1.x) * dx + (c.center.y - l.p1.y) * dy) / (len * len);
        const closestX = l.p1.x + t * dx;
        const closestY = l.p1.y + t * dy;

        const toCenterX = c.center.x - closestX;
        const toCenterY = c.center.y - closestY;
        const currentDistToLine = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);

        if (currentDistToLine < 0.0001) {
            // Center is ON the line. Push it out along the line normal.
            // Normal is (-dy, dx) / len
            const nx = -dy / len;
            const ny = dx / len;
            if (!c.center.fixed) {
                c.center.x += nx * c.circle.radius;
                c.center.y += ny * c.circle.radius;
            }
            return c.circle.radius;
        }

        const moveDist = c.circle.radius - currentDistToLine;
        const moveX = (toCenterX / currentDistToLine) * moveDist * 0.5;
        const moveY = (toCenterY / currentDistToLine) * moveDist * 0.5;

        if (!c.center.fixed) {
            c.center.x += moveX;
            c.center.y += moveY;
        }

        // Also move line? (simplified: just move center for now, or push line)
        // Pushing line is harder because it involves rotating or translating. 
        // Translating line is easier.
        if (!l.p1.fixed && !l.p2.fixed) {
            l.p1.x -= moveX;
            l.p1.y -= moveY;
            l.p2.x -= moveX;
            l.p2.y -= moveY;
        }

        return Math.abs(err);
    }

    private solveTangentCircleCircle(
        c1: { circle: Circle, center: Point },
        c2: { circle: Circle, center: Point }
    ): number {
        const dx = c2.center.x - c1.center.x;
        const dy = c2.center.y - c1.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Target distance is sum of radii (external tangent) 
        // OR abs diff (internal). 
        // Usually sketches default to external unless close to internal? 
        // Let's assume external for now: R1 + R2.
        const target = c1.circle.radius + c2.circle.radius;

        const err = dist - target;
        if (Math.abs(err) < 0.001) return 0;

        if (dist < 0.0001) {
            // Concentric center. Push apart.
            if (!c2.center.fixed) c2.center.x += 1;
            return Math.abs(err);
        }

        const moveFraction = err / dist * 0.5;
        const moveX = dx * moveFraction;
        const moveY = dy * moveFraction;

        if (!c1.center.fixed && !c2.center.fixed) {
            c1.center.x += moveX;
            c1.center.y += moveY;
            c2.center.x -= moveX;
            c2.center.y -= moveY;
        } else if (!c1.center.fixed) {
            c1.center.x += moveX * 2;
            c1.center.y += moveY * 2;
        } else if (!c2.center.fixed) {
            c2.center.x -= moveX * 2;
            c2.center.y -= moveY * 2;
        }

        return Math.abs(err);
    }

    private solveRadius(c: Constraint, entities: Map<string, SketchEntity>): number {
        if (c.entities.length !== 1 || c.value === undefined) return 0;
        const circleInfo = this.getCircle(c.entities[0], entities);
        if (!circleInfo) return 0;

        const currentRadius = circleInfo.circle.radius;
        const err = currentRadius - c.value;

        if (Math.abs(err) < 0.001) return 0;

        // Radius is a property of the circle entity itself, so we can just set it?
        // But the solver should be iterative. However, radius is often a direct property.
        // Let's "move" it towards target.
        circleInfo.circle.radius -= err * 0.5;

        return Math.abs(err);
    }

    private solveAngle(c: Constraint, entities: Map<string, SketchEntity>): number {
        // Absolute Angle (Single Line relative to X-axis)
        if (c.entities.length === 1 && c.value !== undefined) {
            const l = this.getLine(c.entities[0], entities);
            if (!l) return 0;

            const dx = l.p2.x - l.p1.x;
            const dy = l.p2.y - l.p1.y;
            const currentRad = Math.atan2(dy, dx);
            const targetRad = c.value * (Math.PI / 180);

            let err = targetRad - currentRad;
            // Wrap error to [-PI, PI]
            while (err > Math.PI) err -= 2 * Math.PI;
            while (err < -Math.PI) err += 2 * Math.PI;

            if (Math.abs(err) < 0.00001) return 0;

            // Larger step for faster convergence
            const correction = err * 0.5;
            this.rotateLine(l, correction);

            return Math.abs(err);
        }

        // Angle between two lines
        if (c.entities.length !== 2 || c.value === undefined) return 0;
        const l1 = this.getLine(c.entities[0], entities);
        const l2 = this.getLine(c.entities[1], entities);
        if (!l1 || !l2) return 0;

        const dx1 = l1.p2.x - l1.p1.x;
        const dy1 = l1.p2.y - l1.p1.y;
        const dx2 = l2.p2.x - l2.p1.x;
        const dy2 = l2.p2.y - l2.p1.y;

        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        if (len1 < 0.001 || len2 < 0.001) return 0;

        // Current angle via dot product
        const dot = dx1 * dx2 + dy1 * dy2;
        const cosCurrent = Math.max(-1, Math.min(1, dot / (len1 * len2)));
        const currentAngle = Math.acos(cosCurrent); // Result in [0, PI]

        // Target is in radians? Let's assume input is Degrees for user friendliness, converted to Radians?
        // OR assume input is Radians. Let's assume Radians for internal solver.
        // But usually constraint values are "degrees". Let's treat c.value as DEGREES.
        const targetRad = c.value * (Math.PI / 180);

        const err = currentAngle - targetRad;
        if (Math.abs(err) < 0.001) return 0;

        // We need to rotate lines.
        // It's hard to know which way to rotate (b/c dot product is ambiguous sign).
        // Cross product gives sign.
        // It was used to check direction before loop but trusted region logic was simplified.

        const correction = err * 0.5 * 0.1; // Small step

        // Rotate vector (x,y) by theta:
        // x' = x cos - y sin
        // y' = x sin + y cos

        // Rotate L1 p2 around p1? Or around center?
        // Let's rotate around midpoint for stability or p1 if p1 fixed.
        // Simplified: rotate around p1.

        this.rotateLine(l1, correction);
        this.rotateLine(l2, -correction);

        return Math.abs(err);
    }

    private rotateLine(l: { line: Line, p1: Point, p2: Point }, angle: number) {
        if (l.p1.fixed && l.p2.fixed) return;

        const dx = l.p2.x - l.p1.x;
        const dy = l.p2.y - l.p1.y;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const ndx = dx * cos - dy * sin;
        const ndy = dx * sin + dy * cos;

        // If p1 fixed, move p2
        if (l.p1.fixed) {
            l.p2.x = l.p1.x + ndx;
            l.p2.y = l.p1.y + ndy;
        }
        // If p2 fixed, move p1
        else if (l.p2.fixed) {
            l.p1.x = l.p2.x - ndx;
            l.p1.y = l.p2.y - ndy;
        }
        // Move both around midpoint
        else {
            const midX = (l.p1.x + l.p2.x) / 2;
            const midY = (l.p1.y + l.p2.y) / 2;

            // Re-calc half vectors
            const hx = dx / 2;
            const hy = dy / 2;

            const nhx = hx * cos - hy * sin;
            const nhy = hx * sin + hy * cos;

            l.p2.x = midX + nhx;
            l.p2.y = midY + nhy;
            l.p1.x = midX - nhx;
            l.p1.y = midY - nhy;
        }
    }

    private solveConnect(c: Constraint, entities: Map<string, SketchEntity>): number {
        // Equal Length
        if (c.entities.length !== 2) return 0;
        const l1 = this.getLine(c.entities[0], entities);
        const l2 = this.getLine(c.entities[1], entities);

        if (!l1 && !l2) return 0; // Could be 2 circles?

        if (l1 && l2) {
            const dx1 = l1.p2.x - l1.p1.x;
            const dy1 = l1.p2.y - l1.p1.y;
            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

            const dx2 = l2.p2.x - l2.p1.x;
            const dy2 = l2.p2.y - l2.p1.y;
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            const diff = len1 - len2;
            if (Math.abs(diff) < 0.001) return 0;

            // Check fixed status
            const l1Fixed = l1.p1.fixed && l1.p2.fixed;
            const l2Fixed = l2.p1.fixed && l2.p2.fixed;

            let targetLen = (len1 + len2) / 2;
            if (l1Fixed) targetLen = len1;
            else if (l2Fixed) targetLen = len2;

            // Adjust l1
            if (!l1Fixed) {
                const f1 = targetLen / len1;
                this.scaleLine(l1, f1);
            }

            // Adjust l2
            if (!l2Fixed) {
                const f2 = targetLen / len2;
                this.scaleLine(l2, f2);
            }

            return Math.abs(diff);
        }
        return 0;
    }

    private scaleLine(l: { line: Line, p1: Point, p2: Point }, factor: number) {
        const dx = l.p2.x - l.p1.x;
        const dy = l.p2.y - l.p1.y;
        const midX = (l.p1.x + l.p2.x) / 2;
        const midY = (l.p1.y + l.p2.y) / 2;

        const ndx = dx * factor;
        const ndy = dy * factor;

        if (l.p1.fixed) {
            l.p2.x = l.p1.x + ndx;
            l.p2.y = l.p1.y + ndy;
        } else if (l.p2.fixed) {
            l.p1.x = l.p2.x - ndx;
            l.p1.y = l.p2.y - ndy;
        } else {
            l.p2.x = midX + ndx / 2;
            l.p2.y = midY + ndy / 2;
            l.p1.x = midX - ndx / 2;
            l.p1.y = midY - ndy / 2;
        }
    }
}

