export type Vec3 = [number, number, number];
export type Vec2 = [number, number];
export type Mat4 = number[]; // 16 elements, column-major

export type FeatureId = string;
export type RewriteId = string;

export interface ScriptLocation {
  file: string;
  line: number;
  column: number;
}

export type Unit = 'mm' | 'in' | 'm' | 'deg' | 'rad' | 'unitless';

export interface Param {
  expression: string;       // e.g. 'width / 2 + 5 mm'
  unit: Unit;
  evaluated: number;        // canonical: mm for length, deg for angle
}

export type FaceRef =
  | { kind: 'canonical'; face: 'top'|'bottom'|'left'|'right'|'front'|'back' }
  | { kind: 'tracked'; faceName: string }
  | { kind: 'created'; rewriteId: RewriteId; slot: string }
  | { kind: 'propagated'; rewriteId: RewriteId; source: FaceRef }
  | { kind: 'label'; name: string }
  | { kind: 'query'; query: import('../backends/occt/edgeQueries').FaceQuery };

export type EdgeRef =
  | { kind: 'tracked'; edgeName: string; selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'created'; rewriteId: RewriteId; slot: string;
      selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'propagated'; rewriteId: RewriteId; source: EdgeRef;
      selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'query'; query: import('../backends/occt/edgeQueries').EdgeQuery }
  | { kind: 'segment'; segmentId: string }
  | { kind: 'segments'; segmentIds: string[] };

export type VertexRef =
  | { kind: 'tracked'; vertexName: string }
  | { kind: 'created'; rewriteId: RewriteId; slot: string };

export type FeatureRef =
  | { kind: 'feature'; id: FeatureId }
  | { kind: 'face'; featureId: FeatureId; ref: FaceRef }
  | { kind: 'edge'; featureId: FeatureId; ref: EdgeRef }
  | { kind: 'vertex'; featureId: FeatureId; ref: VertexRef };

export type CardinalPlane = 'xy' | 'xz' | 'yz';
export type PlaneSpec = CardinalPlane | { plane: CardinalPlane; offset?: number };

export type SketchAxis = 'x' | 'y';
export type AxisSpec = SketchAxis | { axis: SketchAxis; offset?: number };

export function isValidAxisSpec(v: unknown): v is AxisSpec {
  if (v === 'x' || v === 'y') return true;
  if (typeof v === 'object' && v !== null) {
    const o = v as { axis?: unknown; offset?: unknown };
    if (o.axis !== 'x' && o.axis !== 'y') return false;
    // offset is optional; if present, must be finite
    if (o.offset === undefined) return true;
    return typeof o.offset === 'number' && Number.isFinite(o.offset);
  }
  return false;
}

export type FeatureKind =
  // primitives
  | 'box' | 'cylinder' | 'sphere' | 'torus'
  // 2D-to-3D
  | 'extrude' | 'revolve' | 'loft' | 'sweep'
  // boolean
  | 'boolean'
  // edge/face features (v0.2+)
  | 'fillet' | 'chamfer' | 'shell' | 'hole' | 'cut' | 'draft'
  // symmetric (v0.13+)
  | 'mirror'
  // imports (v0.3+)
  | 'importedMesh' | 'importedStep'
  // sketch (v0.2+)
  | 'sketch' | 'constrainedSketch'
  // assembly (v0.6+)
  | 'assemblyPart' | 'assemblyJoint' | 'assemblyConnect'
  // specialty (v0.13+)
  | 'sheetMetal' | 'sdf';

/**
 * Runtime guard for PlaneSpec. Returns true for cardinal strings
 * ('xy' | 'xz' | 'yz') and for offset-plane objects
 * `{ plane: CardinalPlane; offset: number }` where offset is finite.
 * Rejects everything else.
 */
export function isValidPlaneSpec(value: unknown): value is PlaneSpec {
  if (typeof value === 'string') {
    return value === 'xy' || value === 'xz' || value === 'yz';
  }
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    const plane = v['plane'];
    const offset = v['offset'];
    if (!(plane === 'xy' || plane === 'xz' || plane === 'yz')) return false;
    // offset is optional; if present it must be a finite number.
    if (offset !== undefined && !(typeof offset === 'number' && Number.isFinite(offset))) return false;
    return true;
  }
  return false;
}
