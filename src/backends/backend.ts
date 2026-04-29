import type { FeatureRecord } from '../intent/featureRecord';
import type { FeatureKind, Vec3 } from '../intent/types';
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import type { RuntimeMesh } from './runtimeMesh';

// Canonical backend target enum. 'faceted-mesh' is reserved for a future fallback
// path (Manifold / mesh-only); v0.1 ships only 'export-occt'.
export const BACKEND_TARGETS = ['export-occt', 'faceted-mesh'] as const;
export type BackendTarget = (typeof BACKEND_TARGETS)[number];

export interface ShapeBackend {
  readonly target: BackendTarget;
  translate(x: number, y: number, z: number): ShapeBackend;
  rotate(axis: Vec3, degrees: number, pivot?: Vec3): ShapeBackend;
  scale(s: number | Vec3): ShapeBackend;
  mirror(normal: Vec3): ShapeBackend;
  union(other: ShapeBackend): ShapeBackend;
  subtract(other: ShapeBackend): ShapeBackend;
  intersect(other: ShapeBackend): ShapeBackend;
  splitByPlane(normal: Vec3, offset: number): [ShapeBackend, ShapeBackend];
  boundingBox(): { min: Vec3; max: Vec3 };
  volume(): number;
  surfaceArea(): number;
  isEmpty(): boolean;
  getMesh(): RuntimeMesh;
  exportSTL(): Uint8Array;
  exportSTEP(): Uint8Array;
  exportBREP?(): Uint8Array;
  dispose?(): void;
}

export interface ResolvedInputs {
  byKey: Record<string, ShapeBackend>;
}

export interface LowerResult {
  shape: ShapeBackend;
  diagnostics: CompilerDiagnostic[];
}

export interface FeatureLowerer {
  readonly target: BackendTarget;
  readonly supports: ReadonlySet<FeatureKind>;
  lower(record: FeatureRecord, inputs: ResolvedInputs): Promise<LowerResult>;
}
