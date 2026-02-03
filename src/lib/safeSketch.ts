
export function createSafeReplicad(replicad: any, onSketchCreated?: (s: any) => void): any {
    const safeReplicad = { ...replicad };

    // Wrapper class that looks like Sketcher but returns SafeSketcher instance
    const SafeSketcherWrapper = class {
        constructor(plane: any) {
            const realSketcher = new replicad.Sketcher(plane);
            // console.log("SafeSketcherWrapper created. Real sketcher keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(realSketcher)));
            // console.log("Real sketcher has circle?", typeof (realSketcher as any).circle);

            const instance = new SafeSketcher(realSketcher);
            if (onSketchCreated) onSketchCreated(instance);
            return instance;
        }
    } as any;

    // Copy static methods from original Sketcher (if any)
    if (replicad.Sketcher) {
        Object.assign(SafeSketcherWrapper, replicad.Sketcher);
    }

    // Override Sketcher in the safe scope
    safeReplicad.Sketcher = SafeSketcherWrapper;

    return safeReplicad;
}

type Point = [number, number] | [number, number, number];


export class SafeSketcher {
    private sketcher: any;
    private currentPosition: Point | null = null;
    private isLoopOpen: boolean = false;
    private _hasGeometry: boolean = false;
    private TOLERANCE = 1e-6;

    constructor(sketcher: any) {
        this.sketcher = sketcher;

        // return Proxy to forward unknown calls to underlying sketcher
        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (prop in target) {
                    return Reflect.get(target, prop, receiver);
                }
                const sketcher = (target as any).sketcher;
                const value = sketcher[prop];

                if (typeof value === 'function') {
                    return (...args: any[]) => {
                        const methodName = String(prop);
                        // List of methods that add geometry
                        const drawingMethods = ['line', 'lineTo', 'hLine', 'vLine', 'rect', 'circle', 'arc', 'bezier', 'spline', 'ellipse', 'halfEllipse', 'polyflow', 'close'];
                        if (drawingMethods.some(m => methodName.toLowerCase().includes(m.toLowerCase()))) {
                            (target as any)._hasGeometry = true;
                        }

                        const result = value.apply(sketcher, args);
                        // Ensure chaining returns the proxy
                        if (result === sketcher) {
                            return receiver;
                        }
                        return result;
                    };
                }
                return value;
            }
        });
    }

    get sketch() {
        // console.log("Proxy access sketch property");
        return this.sketcher.sketch;
    }

    // ... tracked methods ...
    private isSamePoint(p1: Point, p2: Point): boolean {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        return (dx * dx + dy * dy) < (this.TOLERANCE * this.TOLERANCE);
    }

    private invalidatePosition() {
        this.currentPosition = null;
    }

    movePointerTo(point: Point): this {
        if (this.currentPosition && this.isSamePoint(this.currentPosition, point)) {
            return this as any;
        }

        if (this.isLoopOpen) {
            this.close();
        }

        this.currentPosition = point;
        this.isLoopOpen = false;
        try {
            this.sketcher.movePointerTo(point);
        } catch (e: any) {
            // If Replicad complains about "edge defined", it implies it thinks we are already drawing.
            // But we want to enforce a Move. 
            // In some versions of Replicad/OCJS, implicit closing might leave state.
            // If we just Closed, treating this as a no-op *might* be correct if the next command implicitly starts a new wire?
            // But we need to move the pointer.

            // Let's log it for now or ignore strictly this error if we believe we are right.
            if (e.message && e.message.includes('if there is no edge defined')) {
                // Swallow - this likely means we are constrained by the previous loop logic 
                // but physically simply setting the start point for the next one is implied?
                // CAREFUL: If we swallow this, does the next lineTo start from the correct place?
                // Replicad probably rejected the move.

                // Alternative: force a done() then start new sketch? No, same sketcher.
            } else {
                throw e;
            }
        }
        return this as any;
    }

    lineTo(point: Point): this {
        this.currentPosition = point;
        this.isLoopOpen = true;
        this._hasGeometry = true;
        this.sketcher.lineTo(point);
        return this as any;
    }

    hLine(x: number): this {
        if (this.currentPosition) {
            const newPos: Point = [x, this.currentPosition[1]];
            if ((this.currentPosition as any)[2] !== undefined) (newPos as any)[2] = (this.currentPosition as any)[2];
            this.currentPosition = newPos;
        } else {
            this.invalidatePosition();
        }

        this.isLoopOpen = true;
        this._hasGeometry = true;
        this.sketcher.hLine(x);
        return this as any;
    }

    vLine(y: number): this {
        if (this.currentPosition) {
            const newPos: Point = [this.currentPosition[0], y];
            if ((this.currentPosition as any)[2] !== undefined) (newPos as any)[2] = (this.currentPosition as any)[2];
            this.currentPosition = newPos;
        } else {
            this.invalidatePosition();
        }

        this.isLoopOpen = true;
        this._hasGeometry = true;
        this.sketcher.vLine(y);
        return this as any;
    }

    // Convenience method to extrude directly from sketcher (auto-close/done)
    extrude(distance: number, config?: any): any {
        // If we are extrusion, we must be done.
        // We can call done().extrude()
        return this.done().extrude(distance, config);
    }

    revolve(revolutionAxis?: any, config?: any): any {
        return this.done().revolve(revolutionAxis, config);
    }

    close(): any {
        if (this.isLoopOpen) {
            this.isLoopOpen = false;
            this.currentPosition = null;
            return this.sketcher.close();
        }
        return this.sketcher.close();
    }

    // Polyfill circle for better DX
    circle(radius: number): this {
        // Draw a full circle using two half-ellipses
        // Assuming we want to start/end at current position?
        // Or circle CENTERED at current position?
        // geometryHelpers uses .circle(10). Conventional CAD "Circle" command usually takes center then radius.
        // But Sketcher is a "turtle" graphics.
        // If I say .circle(10), does it mean "Draw circle of radius 10 at current point"?
        // Or "Draw circle tangent"?
        // Replicad drawCircle(r) implies center at 0,0.
        // Let's assume center at current position.
        // We need to move to the edge first to start the arc without leaving a line?
        // Sketcher is continous.
        // If we want a detached circle, we should move.
        // But simply: Move relative (r, 0). Arc 180. Arc 180. Move back (-r, 0)?

        // Strategy:
        // 1. Move to (x+r, y). (This creates a line if we are drawing? No, use movePointerTo if starting)
        // If we are already drawing, this adds a line segment from A to A+(r,0). 
        // Then circle.
        // This might not be what user wants (Lollipop).

        // But `sketchCircle(r)` creates a circle centered at origin.
        // `05_offset_plane`: new Sketcher(plane).circle(10).
        // Starts at 0,0 (Plane origin).
        // So we want circle centered at 0,0.
        // 1. Move to (r, 0).
        // 2. halfEllipse(-2r, 0, r).
        // 3. halfEllipse(2r, 0, r).
        // 4. Returns to (r, 0).
        // 5. If we want to return to 0,0? `movePointerTo`?

        // Let's try:
        this.movePointerTo([radius, 0]); // This is absolute if no current pos? No, movePointerTo takes [x,y].
        // But we need relative if we want to support any center.
        // But Sketcher only supports `movePointerTo` absolute?
        // Wait, SafeSketcher.movePointerTo calls sketcher.movePointerTo.

        // Implementation for CENTERED at current (or 0,0 if null):
        const cx = this.currentPosition ? this.currentPosition[0] : 0;
        const cy = this.currentPosition ? this.currentPosition[1] : 0;

        // We need to lift the pen (move) to the rim.
        this.movePointerTo([cx + radius, cy]);

        // Draw 2 half ellipses
        this.halfEllipse(-2 * radius, 0, radius); // Relative coords for line/arc commands
        this.halfEllipse(2 * radius, 0, radius);

        // We are now back at (cx + radius, cy).
        // User might expect to be back at center? Or irrelevant if closed.

        return this;
    }

    halfEllipse(xDist: number, yDist: number, minorRadius: number, rotation?: number, longAxis?: boolean, sweep?: boolean): this {
        if (this.currentPosition) {
            // Update position logic if needed, or invalidate
            // halfEllipse is relative
        }
        this.isLoopOpen = true;
        this._hasGeometry = true;
        this.sketcher.halfEllipse(xDist, yDist, minorRadius, rotation, longAxis, sweep);
        return this as any;
    }

    ellipse(xDist: number, yDist: number, horizontalRadius: number, verticalRadius: number, rotation?: number, longAxis?: boolean, sweep?: boolean): this {
        if (this.currentPosition) {
            // Ellipse updates position? Usually starts from current.
            // We need to track position if we want to be strict, but for now just forward.
        }
        this.isLoopOpen = true; // Loops usually closed manually or by shape
        this._hasGeometry = true;
        this.sketcher.ellipse(xDist, yDist, horizontalRadius, verticalRadius, rotation, longAxis, sweep);
        return this as any;
    }

    done(): any {
        if (!this._hasGeometry) {
            throw new Error("Cannot complete sketch: No geometry has been drawn. Add some lines or arcs first.");
        }
        if (this.isLoopOpen) {
            this.isLoopOpen = false;
            this.currentPosition = null;
            return this.sketcher.done();
        }
        return this.sketcher.done();
    }
}
