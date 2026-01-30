
export function createSafeReplicad(replicad: any): any {
    const safeReplicad = { ...replicad };

    // Wrapper class that looks like Sketcher but returns SafeSketcher instance
    const SafeSketcherWrapper = class {
        constructor(plane: any) {
            const realSketcher = new replicad.Sketcher(plane);
            return new SafeSketcher(realSketcher);
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
                    return value.bind(sketcher);
                }
                return value;
            }
        });
    }

    get sketch() {
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
        this.sketcher.movePointerTo(point);
        return this as any;
    }

    lineTo(point: Point): this {
        this.currentPosition = point;
        this.isLoopOpen = true;
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
        this.sketcher.vLine(y);
        return this as any;
    }

    close(): any {
        if (this.isLoopOpen) {
            this.isLoopOpen = false;
            this.currentPosition = null;
            return this.sketcher.close();
        }
        return this.sketcher.close();
    }

    done(): any {
        if (this.isLoopOpen) {
            this.isLoopOpen = false;
            this.currentPosition = null;
            return this.sketcher.done();
        }
        return this.sketcher.done();
    }
}
