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
  | { kind: 'propagated'; rewriteId: RewriteId; source: FaceRef };

export type EdgeRef =
  | { kind: 'tracked'; edgeName: string; selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'created'; rewriteId: RewriteId; slot: string;
      selector: 'edge'|'start'|'end'|'midpoint' }
  | { kind: 'propagated'; rewriteId: RewriteId; source: EdgeRef;
      selector: 'edge'|'start'|'end'|'midpoint' };

export type VertexRef =
  | { kind: 'tracked'; vertexName: string }
  | { kind: 'created'; rewriteId: RewriteId; slot: string };

export type FeatureRef =
  | { kind: 'feature'; id: FeatureId }
  | { kind: 'face'; featureId: FeatureId; ref: FaceRef }
  | { kind: 'edge'; featureId: FeatureId; ref: EdgeRef }
  | { kind: 'vertex'; featureId: FeatureId; ref: VertexRef };

export type FeatureKind =
  // primitives
  | 'box' | 'cylinder' | 'sphere' | 'torus'
  // 2D-to-3D
  | 'extrude' | 'revolve' | 'loft' | 'sweep'
  // boolean
  | 'boolean'
  // edge/face features (v0.2+)
  | 'fillet' | 'chamfer' | 'shell' | 'hole' | 'cut' | 'draft'
  // imports (v0.3+)
  | 'importedMesh' | 'importedStep'
  // sketch (v0.2+)
  | 'sketch' | 'constrainedSketch'
  // assembly (v0.6+)
  | 'assemblyPart' | 'assemblyJoint' | 'assemblyConnect'
  // specialty (v0.13+)
  | 'sheetMetal' | 'sdf';
