type Point = [number, number] | [number, number, number];

type ReplicadLike = Record<string, unknown> & {
  Sketcher: unknown;
};

type SketcherLike = {
  movePointerTo(point: Point): unknown;
  lineTo(point: Point): unknown;
  line(x: number, y: number): unknown;
  hLine(x: number): unknown;
  vLine(y: number): unknown;
  close(): unknown;
  done(): unknown;
  halfEllipse(
    xDist: number,
    yDist: number,
    minorRadius: number,
    rotation?: number,
    longAxis?: boolean,
    sweep?: boolean,
  ): unknown;
  ellipse(
    xDist: number,
    yDist: number,
    horizontalRadius: number,
    verticalRadius: number,
    rotation?: number,
    longAxis?: boolean,
    sweep?: boolean,
  ): unknown;
  sketch?: unknown;
  [key: string]: unknown;
};

function isPoint3(point: Point): point is [number, number, number] {
  return point.length === 3;
}

export function createSafeReplicad<T extends ReplicadLike>(
  replicad: T,
  onSketchCreated?: (s: SafeSketcher) => void,
): T {
  const safeReplicad = Object.create(replicad) as T;

  const SafeSketcherWrapper = class {
    constructor(plane?: unknown) {
      const SketcherCtor = replicad.Sketcher as unknown as new (plane?: unknown) => SketcherLike;
      const realSketcher = new SketcherCtor(plane);
      const instance = new SafeSketcher(realSketcher);
      onSketchCreated?.(instance);
      return instance;
    }
  } as unknown as (new (plane?: unknown) => SafeSketcher) & Record<string, unknown>;

  // Copy static methods from original Sketcher (if any)
  Object.assign(SafeSketcherWrapper, replicad.Sketcher);

  // Override Sketcher in the safe scope
  (safeReplicad as unknown as Record<string, unknown>).Sketcher = SafeSketcherWrapper;

  // Wrap makeBox to handle dimensions (w, h, d) by delegating to makeBaseBox
  const originalMakeBox = (replicad as unknown as Record<string, unknown>).makeBox;
  const originalMakeBaseBox = (replicad as unknown as Record<string, unknown>).makeBaseBox;

  if (typeof originalMakeBox === 'function' && typeof originalMakeBaseBox === 'function') {
    (safeReplicad as unknown as Record<string, unknown>).makeBox = (...args: unknown[]) => {
      if (args.length === 3 && args.every((a) => typeof a === 'number')) {
        return originalMakeBaseBox.apply(safeReplicad, args);
      }
      return originalMakeBox.apply(safeReplicad, args);
    };
  }

  return safeReplicad;
}

export class SafeSketcher {
  private sketcher: SketcherLike;
  private currentPosition: Point | null = null;
  private isLoopOpen = false;
  private hasGeometry = false;
  private lastDoneResult: unknown = null;
  private readonly tolerance = 1e-6;

  constructor(sketcher: unknown) {
    this.sketcher = sketcher as SketcherLike;

    // Return Proxy to forward unknown calls to underlying sketcher
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop in target) return Reflect.get(target, prop, receiver);

        const value = target.sketcher[prop as keyof SketcherLike];
        if (typeof value !== 'function') return value;

        return (...args: unknown[]) => {
          const methodName = String(prop);
          const drawingMethods = [
            'line',
            'lineTo',
            'hLine',
            'vLine',
            'rect',
            'circle',
            'arc',
            'bezier',
            'spline',
            'ellipse',
            'halfEllipse',
            'polyflow',
            'close',
          ];

          if (drawingMethods.some((m) => methodName.toLowerCase().includes(m.toLowerCase()))) {
            target.hasGeometry = true;
          }

          const result = (value as (...fnArgs: unknown[]) => unknown).apply(target.sketcher, args);
          return result === target.sketcher ? receiver : result;
        };
      },
    });
  }

  get sketch(): unknown {
    return this.lastDoneResult ?? this.sketcher.sketch;
  }

  private isSamePoint(p1: Point, p2: Point): boolean {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return dx * dx + dy * dy < this.tolerance * this.tolerance;
  }

  private invalidatePosition(): void {
    this.currentPosition = null;
  }

  movePointerTo(point: Point): this {
    if (this.currentPosition && this.isSamePoint(this.currentPosition, point)) return this;
    if (this.isLoopOpen) this.close();

    this.currentPosition = point;
    this.isLoopOpen = false;

    try {
      this.sketcher.movePointerTo(point);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('if there is no edge defined')) throw err;
    }

    return this;
  }

  lineTo(point: Point): this {
    this.currentPosition = point;
    this.isLoopOpen = true;
    this.hasGeometry = true;
    this.sketcher.lineTo(point);
    return this;
  }

  line(x: number, y: number): this {
    if (this.currentPosition) {
      this.currentPosition = isPoint3(this.currentPosition)
        ? [this.currentPosition[0] + x, this.currentPosition[1] + y, this.currentPosition[2]]
        : [this.currentPosition[0] + x, this.currentPosition[1] + y];
    } else {
      this.invalidatePosition();
    }

    this.isLoopOpen = true;
    this.hasGeometry = true;
    this.sketcher.line(x, y);
    return this;
  }

  hLine(x: number): this {
    if (this.currentPosition) {
      this.currentPosition = isPoint3(this.currentPosition)
        ? [x, this.currentPosition[1], this.currentPosition[2]]
        : [x, this.currentPosition[1]];
    } else {
      this.invalidatePosition();
    }

    this.isLoopOpen = true;
    this.hasGeometry = true;
    this.sketcher.hLine(x);
    return this;
  }

  vLine(y: number): this {
    if (this.currentPosition) {
      this.currentPosition = isPoint3(this.currentPosition)
        ? [this.currentPosition[0], y, this.currentPosition[2]]
        : [this.currentPosition[0], y];
    } else {
      this.invalidatePosition();
    }

    this.isLoopOpen = true;
    this.hasGeometry = true;
    this.sketcher.vLine(y);
    return this;
  }

  extrude(distance: number, config?: unknown): unknown {
    const doneResult = this.done();
    if (typeof doneResult !== 'object' || doneResult === null) return doneResult;

    const maybeExtrude = (doneResult as Record<string, unknown>).extrude;
    if (typeof maybeExtrude !== 'function') {
      throw new Error('Sketch result does not support extrude()');
    }

    return (maybeExtrude as (d: number, cfg?: unknown) => unknown).call(doneResult, distance, config);
  }

  revolve(revolutionAxis?: unknown, config?: unknown): unknown {
    const doneResult = this.done();
    if (typeof doneResult !== 'object' || doneResult === null) return doneResult;

    const maybeRevolve = (doneResult as Record<string, unknown>).revolve;
    if (typeof maybeRevolve !== 'function') {
      throw new Error('Sketch result does not support revolve()');
    }

    return (maybeRevolve as (axis?: unknown, cfg?: unknown) => unknown).call(doneResult, revolutionAxis, config);
  }

  close(): unknown {
    if (this.isLoopOpen) {
      this.isLoopOpen = false;
      this.currentPosition = null;
    }
    const result = this.sketcher.close();
    this.lastDoneResult = result;
    return result === this.sketcher ? this : result;
  }

  circle(radius: number): this {
    const cx = this.currentPosition ? this.currentPosition[0] : 0;
    const cy = this.currentPosition ? this.currentPosition[1] : 0;

    // Lift pen to rim, then draw 2 half ellipses
    this.movePointerTo([cx + radius, cy]);
    this.halfEllipse(-2 * radius, 0, radius);
    this.halfEllipse(2 * radius, 0, radius);

    return this;
  }

  halfEllipse(
    xDist: number,
    yDist: number,
    minorRadius: number,
    rotation?: number,
    longAxis?: boolean,
    sweep?: boolean,
  ): this {
    this.isLoopOpen = true;
    this.hasGeometry = true;
    this.sketcher.halfEllipse(xDist, yDist, minorRadius, rotation, longAxis, sweep);
    return this;
  }

  rect(width: number, height: number, center = true): this {
    const halfW = width / 2;
    const halfH = height / 2;

    if (center) {
      this.movePointerTo([-halfW, -halfH]);
      this.lineTo([halfW, -halfH]);
      this.lineTo([halfW, halfH]);
      this.lineTo([-halfW, halfH]);
      this.close();
    } else {
      const cx = this.currentPosition ? this.currentPosition[0] : 0;
      const cy = this.currentPosition ? this.currentPosition[1] : 0;
      this.movePointerTo([cx, cy]);
      this.line(width, 0);
      this.line(0, height);
      this.line(-width, 0);
      this.close();
    }
    return this;
  }

  ellipse(
    xDist: number,
    yDist: number,
    horizontalRadius: number,
    verticalRadius: number,
    rotation?: number,
    longAxis?: boolean,
    sweep?: boolean,
  ): this {
    this.isLoopOpen = true;
    this.hasGeometry = true;
    this.sketcher.ellipse(xDist, yDist, horizontalRadius, verticalRadius, rotation, longAxis, sweep);
    return this;
  }

  done(): unknown {
    if (!this.hasGeometry) {
      throw new Error('Cannot complete sketch: No geometry has been drawn. Add some lines or arcs first.');
    }
    if (this.isLoopOpen) {
      this.isLoopOpen = false;
      this.currentPosition = null;
    }
    const result = this.sketcher.done();
    this.lastDoneResult = result;
    return result;
  }
}
