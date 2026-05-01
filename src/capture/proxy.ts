import type { FeatureId } from '../intent/types';
import type { CaptureSession } from './captureSession';
import type { EdgeQuery, FaceQuery, EdgeSegment } from '../backends/occt/edgeQueries';

type CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

export type EdgeSelector =
  | EdgeQuery
  | EdgeSegment
  | EdgeSegment[]
  | { face: CanonicalFace | string }
  | undefined;

export type FaceSelector =
  | FaceQuery
  | { face: CanonicalFace | string };

export class Shape {
  readonly id: FeatureId;
  private session: CaptureSession;

  constructor(id: FeatureId, session: CaptureSession) {
    this.id = id;
    this.session = session;
  }

  translate(x: number, y: number, z: number): Shape {
    this.session.appendTransform(this.id, { op: 'translate', x, y, z });
    return this;
  }

  rotate(axis: [number, number, number], degrees: number, pivot?: [number, number, number]): Shape {
    this.session.appendTransform(this.id, { op: 'rotateAxis', axis, degrees, pivot });
    return this;
  }

  scale(sx: number, sy?: number, sz?: number): Shape {
    this.session.appendTransform(this.id, {
      op: 'scale',
      sx,
      sy: sy ?? sx,
      sz: sz ?? sx,
    });
    return this;
  }

  subtract(...others: Shape[]): Shape {
    return this.session.boolean('difference', this, others);
  }

  union(...others: Shape[]): Shape {
    return this.session.boolean('union', this, others);
  }

  intersect(...others: Shape[]): Shape {
    return this.session.boolean('intersection', this, others);
  }

  fillet(radius: number, edges?: EdgeSelector): Shape {
    return this.session.edgeFeature('fillet', this, 'radius', radius, edges);
  }

  chamfer(distance: number, edges?: EdgeSelector): Shape {
    return this.session.edgeFeature('chamfer', this, 'distance', distance, edges);
  }

  shell(thickness: number, opts: { face: FaceSelector | CanonicalFace | string }): Shape {
    return this.session.edgeFeature('shell', this, 'thickness', thickness, { face: opts.face });
  }
}
