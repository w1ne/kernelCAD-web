// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureMeshing.ts
import type { FeatureId, FeatureKind, FeatureRef } from '../../shared/intent/types';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FaceGeometry } from '../../shared/worker/workerTypes';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { PBRMaterial } from '../../shared/intent/material';
import type { ReferenceImageMetadata } from '../../shared/intent/referenceImageRecord';
import type { RenderEnvironmentMetadata } from '../../shared/intent/renderEnvironmentRecord';
import type { CameraTargetMetadata } from '../../shared/intent/cameraTargetRecord';
import type { Vec3 } from '../../shared/intent/types';
import { OcctLowerer } from '../backends/occt/occtLowerer';
import { OcctBackend, initOcct, pbrFromMetadata } from '../../kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { meshShape } from '../../kernel/backends/occt/meshing';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { transformFeatureMesh } from './transformMesh';
import { resolveFaceLabelToFace } from '../../kernel/backends/occt/edgeSelection';
import { faceHashOf } from '../../kernel/backends/occt/createdRefs';
import { generatePlanarUVs } from './planarUv';
import { helixPolylineRouted } from '../mates/helixPolyline';

/** Attach bbox-planar UVs to every face in-place (idempotent — pre-existing
 *  uv arrays are preserved). Called after meshing so any consumer of
 *  `material.textures` or `materialByFaceId` has a stable UV space without
 *  requiring a conformal unwrap. */
function attachPlanarUVs(faces: FaceGeometry[]): void {
  for (const face of faces) {
    if (face.uv === undefined) {
      face.uv = generatePlanarUVs(face);
    }
  }
}

/** Extract the raw replicad shape so meshShape() can walk .faces / .meshEdges. */
function extractRawShape(backend: ShapeBackend): unknown {
  if (backend instanceof OcctBackend) {
    return backend.getReplicadShape();
  }
  throw new Error(
    `meshFeaturesPerFeature: unsupported backend target '${backend.target}' — only OcctBackend is supported`
  );
}

export interface FeatureMesh {
  featureId: FeatureId;
  featureKind: FeatureKind;
  predecessors: FeatureId[];
  op?: 'subtract' | 'union' | 'intersect';
  faces: FaceGeometry[];
  volume?: number;
  edges?: Float32Array;
  /** Color attribute carried from FeatureRecord.metadata.color (a ColorToken
   *  or `#rrggbb` hex). Renderer resolves via `resolveColor()`; absent means
   *  use the renderer's default. */
  color?: string;
  /** Full PBR material from FeatureRecord.metadata.material (or promoted from
   *  metadata.color). Present when the record has material metadata. The renderer
   *  (Task 8+) prefers this over the legacy `color` string field. */
  material?: PBRMaterial;
  /** Per-face PBR materials keyed by the integer `faceId` of `faces[i]`.
   *  Populated when `FeatureRecord.metadata.materialByLabel` resolves at least
   *  one label against the meshed shape (`Shape.material({ face, ... })`
   *  per-face API). The renderer prefers this entry over `material` on a
   *  face-by-face basis; unmatched faces fall back to `material`. */
  materialByFaceId?: Record<number, PBRMaterial>;
  /** Stable human-readable mesh label for manifests and object filters. */
  displayName?: string;
  /** Deterministic names/ids that can match this mesh in inspection filters. */
  filterNames?: readonly string[];
  /** Original FeatureRecord.metadata.name when authored on the source record. */
  sourceMetadataName?: string;
  /** Assembly feature id when this mesh is a SceneBackend part fan-out. */
  assemblyFeatureId?: FeatureId;
  /** Assembly part name when this mesh is a SceneBackend part fan-out. */
  assemblyPartName?: string;
  /** Column-major 4x4 local-to-world transform for viewport-side posing. */
  transform?: readonly number[];
  /** True for virtual (non-geometry) records such as referenceImage. */
  virtual?: boolean;
  /** Reference image payload; present when featureKind === 'referenceImage'. */
  referenceImage?: ReferenceImageMetadata;
  /** Render-environment payload; present when featureKind === 'renderEnvironment'. */
  renderEnvironment?: RenderEnvironmentMetadata;
  /** Camera-target payload; present when featureKind === 'cameraTarget'. */
  cameraTarget?: CameraTargetMetadata;
}

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

/** Soft warning emitted when `Shape.material({ face })` referenced a label
 *  that failed to resolve at mesh time. Surfaced via `MeshFeaturesResult`
 *  so the caller can route to the diagnostic stream of choice (recompute
 *  engine warnings, MCP response, etc.). The build does NOT fail — the
 *  affected faces simply fall back to the shape-level material. */
export interface PerFaceMaterialWarning {
  code: 'feature.material.face-label-no-match';
  featureId: FeatureId;
  label: string;
  detail: string;
}

/** Diagnostic emitted when a leaf record with its own explicit material is
 *  consumed by a downstream boolean.fuse (union/intersect) whose head record
 *  also has its own material. The kernel's boolean operation produces a single
 *  post-fuse mesh whose faces inherit the head record's material — the leaf's
 *  material is therefore invisible on the static silhouette (post-fuse render
 *  in `kernelcad render` and after the build animation settles in
 *  `npm run capture-demo`). The leaf material IS visible during the staged
 *  build animation while predecessor groups are still fading.
 *
 *  Authors who want a multi-material static render today must either:
 *    (a) split the construction so the material-bearing leaf is not unioned
 *        into a parent that also has its own material, OR
 *    (b) author the leaf as a separate `assemblyPart` (assembly fan-out path
 *        preserves per-part materials in the static render).
 *
 *  Tracked as a follow-up code fix in
 *  `docs/specs/per-leaf-material-survives-static-render.md`. */
export interface MaterialShadowingWarning {
  leafFeatureId: FeatureId;
  leafFeatureKind: FeatureKind;
  shadowingFeatureId: FeatureId;
  shadowingFeatureKind: FeatureKind;
  message: string;
}

export interface MeshFeaturesResult {
  features: FeatureMesh[];
  bounds: Bounds;
  failedFeatureIds: FeatureId[];  // empty array if no failures
  /** Soft warnings collected during per-face material label resolution.
   *  Optional — absent when no labels were referenced. */
  perFaceMaterialWarnings?: PerFaceMaterialWarning[];
  /** Multi-material diagnostic. See `MaterialShadowingWarning` for context. */
  materialShadowingWarnings: MaterialShadowingWarning[];
}

/**
 * Compute the construction-input closure: feature IDs whose meshes the
 * SceneBackend fan-out path subsumes. Skipping these in the per-feature
 * meshing pass prevents intermediate primitives (boxes, fillets, holes,
 * boolean cutters, sketch profiles) from being emitted at LOCAL frame —
 * they would otherwise stack at the origin and drown out the colored
 * assembly fan-out.
 *
 * Members of the closure:
 *   - Every `assemblyPart`, `assemblyJoint`, `assemblyConnect` record (these
 *     are construction nodes that don't produce renderable single-shape
 *     geometry on their own; the assembly model/export consumer fans them
 *     out via SceneBackend).
 *   - The transitive set of records reachable via any `kind: 'feature'`
 *     input ref starting from each `assemblyPart`'s `inputs.shape`. The
 *     walk follows ALL feature-kind input fields so it catches `base`,
 *     `target`, `shape`, `profile`, `cutter_N` (boolean), etc. — anything
 *     a part's source shape was constructed from.
 *
 * The walker terminates naturally on primitives (no upstream feature-kind
 * inputs) and is cycle-safe via the visited set.
 *
 * Returns an empty set when no `assemblyPart` records exist — non-assembly
 * scripts (e.g. `box(10,10,10).fillet(...)`) emit FeatureMesh entries
 * unchanged.
 */
function computeConstructionClosure(
  records: readonly FeatureRecord[],
): Set<FeatureId> {
  const closure = new Set<FeatureId>();
  const recordById = new Map<FeatureId, FeatureRecord>();
  for (const r of records) recordById.set(r.id, r);

  // Seed with assembly construction-node IDs (the part/joint/connect
  // records themselves don't produce renderable single-shape meshes —
  // SceneBackend handles their composed presentation).
  for (const r of records) {
    if (
      r.kind === 'assemblyPart' ||
      r.kind === 'assemblyJoint' ||
      r.kind === 'assemblyConnect'
    ) {
      closure.add(r.id);
    }
  }

  // Walk upstream from each assemblyPart's source shape, visiting all
  // feature-kind input refs transitively. Any record that contributes to
  // the BUILD of an assembly part is construction debris from the
  // renderer's perspective.
  const queue: FeatureId[] = [];
  for (const r of records) {
    if (r.kind !== 'assemblyPart') continue;
    const shapeRef = r.inputs.shape as FeatureRef | undefined;
    if (shapeRef && shapeRef.kind === 'feature') queue.push(shapeRef.id);
  }

  while (queue.length > 0) {
    const id = queue.pop()!;
    if (closure.has(id)) continue;
    closure.add(id);
    const record = recordById.get(id);
    if (record === undefined) continue;
    for (const value of Object.values(record.inputs)) {
      // Follow plain feature refs only. face/edge/vertex refs reference
      // geometry on a feature already covered via base/target.
      if (value && (value as FeatureRef).kind === 'feature') {
        queue.push((value as { id: FeatureId }).id);
      }
    }
  }

  return closure;
}

function uniqueStrings(values: readonly (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (value === undefined || value.length === 0 || out.includes(value)) continue;
    out.push(value);
  }
  return out;
}

function metadataNameOf(record: FeatureRecord | undefined): string | undefined {
  const name = (record?.metadata as { name?: unknown } | undefined)?.name;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

/**
 * Structural shape used to access the Assembly's tendon + part surface
 * without importing the concrete `Assembly` class (avoids the
 * capture/featureMeshing → capture/assembly cycle CaptureSession
 * already avoids via `Map<string, unknown>` for `assemblies`).
 */
interface AssemblyLikeForTendons {
  __tendons(): readonly {
    readonly name: string;
    readonly from: string;
    readonly to: string;
    readonly visualDiameterMm: number;
    /** P10: undefined on pre-P10 callers (fallback to 'line'). */
    readonly visualStyle?: 'line' | 'coil';
    readonly coilTurns?: number;
    readonly coilDiameterMm?: number;
    /** P11 Slice 3: ordered wrap-geom rails the coil routes over. */
    readonly wrapGeoms?: readonly {
      readonly partName: string;
      readonly wrapName: string;
    }[];
  }[];
  __parts(): readonly {
    readonly name: string;
    readonly mateConnectors: readonly {
      readonly name: string;
      readonly origin:
        | { kind: 'vec3'; value: Vec3 }
        | { kind: 'topology'; query: unknown };
    }[];
    /** P11 Slice 3: wrap-geom rails declared on this part. */
    readonly wrapGeoms?: readonly {
      readonly name: string;
      readonly origin: Vec3;
    }[];
  }[];
}

function isAssemblyLikeForTendons(value: unknown): value is AssemblyLikeForTendons {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { __tendons?: unknown; __parts?: unknown };
  return typeof v.__tendons === 'function' && typeof v.__parts === 'function';
}

/** Apply a column-major 4x4 transform to a Vec3 point. */
function applyMat4ToPoint(m: readonly number[], local: Vec3): Vec3 {
  const lx = local[0], ly = local[1], lz = local[2];
  return [
    m[0] * lx + m[4] * ly + m[8] * lz + m[12],
    m[1] * lx + m[5] * ly + m[9] * lz + m[13],
    m[2] * lx + m[6] * ly + m[10] * lz + m[14],
  ];
}

/**
 * Build a triangle mesh for a cylinder spanning two world-frame
 * endpoints. The cylinder is built directly with WORLD-FRAME vertices
 * (no transform), so the consumer can treat it as a regular feature
 * mesh and the SceneBackend fan-out's bounds aggregation picks it up
 * for free. 16-segment cap-less cylinder — matches Studio's
 * `CylinderGeometry(1,1,1,16)` topology.
 */
function buildCylinderFaceWorld(
  fromWorld: Vec3,
  toWorld: Vec3,
  diameterMm: number,
  segments = 16,
): FaceGeometry | null {
  const dx = toWorld[0] - fromWorld[0];
  const dy = toWorld[1] - fromWorld[1];
  const dz = toWorld[2] - fromWorld[2];
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (length < 1e-6 || diameterMm <= 0) return null;
  const axis: Vec3 = [dx / length, dy / length, dz / length];
  // Build an orthonormal basis (u, v) perpendicular to axis.
  const seed: Vec3 = Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  // u = axis × seed (normalised), v = axis × u
  const ux = axis[1] * seed[2] - axis[2] * seed[1];
  const uy = axis[2] * seed[0] - axis[0] * seed[2];
  const uz = axis[0] * seed[1] - axis[1] * seed[0];
  const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
  const u: Vec3 = [ux / uLen, uy / uLen, uz / uLen];
  const v: Vec3 = [
    axis[1] * u[2] - axis[2] * u[1],
    axis[2] * u[0] - axis[0] * u[2],
    axis[0] * u[1] - axis[1] * u[0],
  ];
  const radius = diameterMm / 2;

  // 2 * segments vertices (one ring per end). Vertex layout:
  //   ring 0 (i ∈ [0, segments)):    ring around `fromWorld`
  //   ring 1 (i ∈ [segments, 2N)):   ring around `toWorld`
  const vertCount = segments * 2;
  const vertices = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  for (let i = 0; i < segments; i++) {
    const theta = (i * 2 * Math.PI) / segments;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const nx = u[0] * cosT + v[0] * sinT;
    const ny = u[1] * cosT + v[1] * sinT;
    const nz = u[2] * cosT + v[2] * sinT;
    // bottom ring (around `fromWorld`)
    vertices[i * 3 + 0] = fromWorld[0] + nx * radius;
    vertices[i * 3 + 1] = fromWorld[1] + ny * radius;
    vertices[i * 3 + 2] = fromWorld[2] + nz * radius;
    normals[i * 3 + 0] = nx;
    normals[i * 3 + 1] = ny;
    normals[i * 3 + 2] = nz;
    // top ring (around `toWorld`)
    const ti = (segments + i) * 3;
    vertices[ti + 0] = toWorld[0] + nx * radius;
    vertices[ti + 1] = toWorld[1] + ny * radius;
    vertices[ti + 2] = toWorld[2] + nz * radius;
    normals[ti + 0] = nx;
    normals[ti + 1] = ny;
    normals[ti + 2] = nz;
  }
  // Two triangles per side quad.
  const indices = new Uint32Array(segments * 6);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const a = i;
    const b = next;
    const c = segments + i;
    const d = segments + next;
    indices[i * 6 + 0] = a;
    indices[i * 6 + 1] = c;
    indices[i * 6 + 2] = b;
    indices[i * 6 + 3] = b;
    indices[i * 6 + 4] = c;
    indices[i * 6 + 5] = d;
  }
  return {
    vertices,
    indices,
    normals,
    faceId: 0,
  };
}

/**
 * P10 — bake a TUBE around the helix polyline produced by
 * `helixPolyline(...)`. Same WORLD-FRAME emission pattern as
 * `buildCylinderFaceWorld` so the renderer hangs the coil geometry off
 * an ordinary feature group, no special path.
 *
 * Tube construction:
 *   1. Sample the helix polyline (`turns * 16 + 1` points).
 *   2. For each interior point, compute the tangent (forward difference
 *      with central averaging) and an orthonormal twist-frame basis
 *      (u, v) ⊥ tangent. The first ring uses worldZ × tangent (or
 *      worldX as fallback); each subsequent ring's u is parallel-
 *      transported along the polyline to avoid twist artifacts on
 *      curved sweeps. This is the same parallel-transport pattern
 *      `THREE.TubeGeometry` uses internally.
 *   3. Emit `radialSegments` vertices per ring; connect successive
 *      rings with two triangles per radial quad.
 *
 * `wireDiameterMm` is the WIRE diameter (the tube sweep radius is half).
 */
function buildHelixTubeMesh(
  centerline: readonly Vec3[],
  coilTurns: number,
  coilDiameterMm: number,
  wireDiameterMm: number,
  radialSegments = 8,
): FaceGeometry | null {
  if (wireDiameterMm <= 0 || coilDiameterMm <= 0 || coilTurns < 1) return null;
  // P11 Slice 3: spiral along the wrap-routed centerline (`[from, …wraps,
  // to]`). A 2-point centerline is byte-identical to the old straight
  // helixPolyline(from, to, …).
  const polyline = helixPolylineRouted(centerline, coilTurns, coilDiameterMm);
  if (polyline.length < 2) return null;
  const ringCount = polyline.length;
  const tubeR = wireDiameterMm * 0.5;

  // Per-ring tangents (central differences interior; one-sided at ends).
  const tangents: Vec3[] = new Array(ringCount);
  for (let i = 0; i < ringCount; i++) {
    const prev = polyline[Math.max(0, i - 1)];
    const next = polyline[Math.min(ringCount - 1, i + 1)];
    let tx = next[0] - prev[0];
    let ty = next[1] - prev[1];
    let tz = next[2] - prev[2];
    const len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
    tx /= len; ty /= len; tz /= len;
    tangents[i] = [tx, ty, tz];
  }

  // Parallel-transport frame: pick an initial up vector ⊥ tangents[0],
  // then rotate it forward at each step to stay perpendicular.
  const seed: Vec3 = Math.abs(tangents[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  // initial u = normalize(seed × tangent[0])
  let ux = seed[1] * tangents[0][2] - seed[2] * tangents[0][1];
  let uy = seed[2] * tangents[0][0] - seed[0] * tangents[0][2];
  let uz = seed[0] * tangents[0][1] - seed[1] * tangents[0][0];
  const uLen0 = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
  ux /= uLen0; uy /= uLen0; uz /= uLen0;
  // v = tangent × u
  let vx = tangents[0][1] * uz - tangents[0][2] * uy;
  let vy = tangents[0][2] * ux - tangents[0][0] * uz;
  let vz = tangents[0][0] * uy - tangents[0][1] * ux;

  const vertCount = ringCount * radialSegments;
  const vertices = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);

  for (let i = 0; i < ringCount; i++) {
    const center = polyline[i];
    if (i > 0) {
      // Parallel-transport u, v to stay ⊥ tangent[i]: subtract the
      // component along the new tangent, renormalize, then rebuild v.
      const tDot = ux * tangents[i][0] + uy * tangents[i][1] + uz * tangents[i][2];
      ux -= tangents[i][0] * tDot;
      uy -= tangents[i][1] * tDot;
      uz -= tangents[i][2] * tDot;
      const l = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
      ux /= l; uy /= l; uz /= l;
      vx = tangents[i][1] * uz - tangents[i][2] * uy;
      vy = tangents[i][2] * ux - tangents[i][0] * uz;
      vz = tangents[i][0] * uy - tangents[i][1] * ux;
    }
    for (let s = 0; s < radialSegments; s++) {
      const theta = (s / radialSegments) * 2 * Math.PI;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const nx = ux * cosT + vx * sinT;
      const ny = uy * cosT + vy * sinT;
      const nz = uz * cosT + vz * sinT;
      const vi = (i * radialSegments + s) * 3;
      vertices[vi + 0] = center[0] + nx * tubeR;
      vertices[vi + 1] = center[1] + ny * tubeR;
      vertices[vi + 2] = center[2] + nz * tubeR;
      normals[vi + 0] = nx;
      normals[vi + 1] = ny;
      normals[vi + 2] = nz;
    }
  }

  // Two triangles per (ring i → ring i+1, radial s → s+1) quad.
  const quadCount = (ringCount - 1) * radialSegments;
  const indices = new Uint32Array(quadCount * 6);
  let idx = 0;
  for (let i = 0; i < ringCount - 1; i++) {
    for (let s = 0; s < radialSegments; s++) {
      const sNext = (s + 1) % radialSegments;
      const a = i * radialSegments + s;
      const b = i * radialSegments + sNext;
      const c = (i + 1) * radialSegments + s;
      const d = (i + 1) * radialSegments + sNext;
      indices[idx++] = a;
      indices[idx++] = c;
      indices[idx++] = b;
      indices[idx++] = b;
      indices[idx++] = c;
      indices[idx++] = d;
    }
  }
  return {
    vertices,
    indices,
    normals,
    faceId: 0,
  };
}

/**
 * P7 — read the Assembly's declared tendons (if any) and pack them into
 * synthetic FeatureMesh records the renderer can hang cylinder geometry
 * off. World-frame triangle mesh is baked HERE so the browser renderer
 * draws each cylinder as a normal feature group (no special path) and
 * the centroid-shift recentering composes onto it identically to the
 * SceneBackend part fan-outs.
 *
 * Skips silently when:
 *   - The SceneBackend's `assemblyName` doesn't resolve to an Assembly
 *     in `session.assemblies` (e.g. the lowerer ran without a
 *     captureSession hook, or the assembly was renamed mid-flight).
 *   - A tendon endpoint references a connector whose origin is a
 *     `topology` query rather than a vec3. Topology origins resolve on
 *     the LOWERED backend (a future slice can plumb them; for v1 of the
 *     visual emit we accept the vec3-fast-path and emit a console
 *     warning so authors notice). Per-endpoint validity is enforced by
 *     `Assembly.resolveTendonEndpoint` at capture time.
 *   - Both endpoints resolve to the same world point (degenerate
 *     cylinder; capture validation already enforces same-body-endpoints
 *     rejection but FK could still collapse the endpoints under poses).
 */
function collectTendonMeshes(
  sceneShape: unknown,
  sceneFeatureId: FeatureId,
  assemblies: ReadonlyMap<string, unknown> | undefined,
): FeatureMesh[] {
  if (assemblies === undefined) return [];
  const scene = sceneShape as {
    assemblyName?: string;
    parts?: readonly { readonly name: string; readonly worldTransform: { toMat4(): readonly number[] } }[];
  };
  const assemblyName = scene.assemblyName;
  if (typeof assemblyName !== 'string' || assemblyName.length === 0) return [];
  const arm = assemblies.get(assemblyName);
  if (!isAssemblyLikeForTendons(arm)) return [];
  const tendons = arm.__tendons();
  if (tendons.length === 0) return [];

  // (partName.connectorName) → vec3 origin lookup.
  const originByRef = new Map<string, Vec3>();
  // (partName, wrapName) → part-local wrap origin lookup (P11 Slice 3).
  const wrapOriginByRef = new Map<string, Vec3>();
  for (const part of arm.__parts()) {
    for (const conn of part.mateConnectors) {
      if (conn.origin.kind === 'vec3') {
        originByRef.set(`${part.name}.${conn.name}`, conn.origin.value);
      }
    }
    for (const wg of part.wrapGeoms ?? []) {
      wrapOriginByRef.set(`${part.name}.${wg.name}`, wg.origin);
    }
  }

  // partName → world transform (column-major Mat4) lookup, derived from
  // the SceneBackend's already-resolved per-part transforms.
  const transformByPart = new Map<string, readonly number[]>();
  for (const part of scene.parts ?? []) {
    transformByPart.set(part.name, part.worldTransform.toMat4());
  }

  const meshes: FeatureMesh[] = [];
  for (const t of tendons) {
    const fromOrigin = originByRef.get(t.from);
    const toOrigin = originByRef.get(t.to);
    if (fromOrigin === undefined || toOrigin === undefined) {
      console.warn(
        `meshFeaturesPerFeature: tendon '${t.name}' has a topology-origin connector; visual cylinder skipped (vec3 origins only in v1).`,
      );
      continue;
    }
    const [fromPartName] = splitConnectorRef(t.from);
    const [toPartName] = splitConnectorRef(t.to);
    if (fromPartName === undefined || toPartName === undefined) continue;
    const fromT = transformByPart.get(fromPartName);
    const toT = transformByPart.get(toPartName);
    if (fromT === undefined || toT === undefined) continue;
    const fromWorld = applyMat4ToPoint(fromT, fromOrigin);
    const toWorld = applyMat4ToPoint(toT, toOrigin);
    // P11 Slice 3: routed centerline — from-anchor, each wrap-geom origin
    // in world coords (skip ones whose part/origin can't be resolved), then
    // the to-anchor. With no wrapGeoms this is just [from, to], so straight
    // tendons render identically to the pre-Slice-3 path.
    const centerline: Vec3[] = [fromWorld];
    for (const w of t.wrapGeoms ?? []) {
      const wLocal = wrapOriginByRef.get(`${w.partName}.${w.wrapName}`);
      const wT = transformByPart.get(w.partName);
      if (wLocal !== undefined && wT !== undefined) {
        centerline.push(applyMat4ToPoint(wT, wLocal));
      }
    }
    centerline.push(toWorld);
    // P10: coil tendons sweep an 8-facet tube along the helix polyline;
    // line tendons fall through to the existing PR #368 cylinder path.
    const style = t.visualStyle ?? 'line';
    let face: FaceGeometry | null;
    if (style === 'coil') {
      const turns = t.coilTurns ?? 10;
      const coilDiameter = t.coilDiameterMm ?? 7;
      face = buildHelixTubeMesh(centerline, turns, coilDiameter, t.visualDiameterMm);
    } else {
      face = buildCylinderFaceWorld(fromWorld, toWorld, t.visualDiameterMm);
    }
    if (face === null) continue;
    const tendonId = `${sceneFeatureId}__tendon__${t.name}`;
    // Dark metallic PBR — matches Studio's `TendonRenderer.tsx`.
    const tendonMaterial: PBRMaterial = {
      baseColor: '#2a2e36',
      metalness: 0.85,
      roughness: 0.4,
    };
    meshes.push({
      featureId: tendonId,
      // Reuse the SceneBackend's feature-kind so the renderer's existing
      // construction-closure / tail-feature filters treat this group the
      // same way they treat normal assembly-fanout part groups.
      featureKind: 'solvedAssembly',
      predecessors: [sceneFeatureId],
      faces: [face],
      assemblyFeatureId: sceneFeatureId,
      assemblyPartName: `__tendon__${t.name}`,
      displayName: `tendon:${t.name}`,
      filterNames: uniqueStrings([
        tendonId,
        t.name,
        `tendon:${t.name}`,
        'tendon',
      ]),
      material: tendonMaterial,
    });
  }
  return meshes;
}

function splitConnectorRef(ref: string): [string | undefined, string | undefined] {
  const dot = ref.indexOf('.');
  if (dot <= 0 || dot === ref.length - 1) return [undefined, undefined];
  return [ref.slice(0, dot), ref.slice(dot + 1)];
}

function meshIdentityFields(args: {
  featureId: FeatureId;
  featureKind: FeatureKind;
  sourceMetadataName?: string;
  assemblyFeatureId?: FeatureId;
  assemblyPartName?: string;
}): Pick<FeatureMesh, 'displayName' | 'filterNames' | 'sourceMetadataName'> {
  const filterNames = uniqueStrings([
    args.featureId,
    args.featureKind,
    args.assemblyFeatureId,
    args.assemblyPartName,
    args.sourceMetadataName,
  ]);
  return {
    displayName: args.assemblyPartName ?? args.sourceMetadataName ?? args.featureId,
    filterNames,
    ...(args.sourceMetadataName !== undefined ? { sourceMetadataName: args.sourceMetadataName } : {}),
  };
}

export async function meshFeaturesPerFeature(
  records: readonly FeatureRecord[],
  paramTable?: import('../../shared/runtime/paramTable').ParamTable,
  /** v0.5: when records contain `importedStep` features, pass the
   *  originating session so the lowerer can find the pre-imported
   *  OcctBackend instances. Optional — scripts without `lib.fromSTEP`
   *  work unchanged.
   *  W1.3: also threads through `getSurfaceRecord` for NURBS surface
   *  resolution. */
  session?: {
    importedGeometry: Map<FeatureId, ShapeBackend>;
    getSurfaceRecord?: (
      id: import('../../shared/intent/surfaceRecord').SurfaceId,
    ) => import('../../shared/intent/surfaceRecord').SurfaceRecord | undefined;
    /** Per-feature triangle mesh cache. When a featureId is present here AND
     *  in `seedShapes`, the cached `FeatureMesh` is re-emitted directly,
     *  skipping the expensive `meshShape()` call. Populated by this function
     *  on the fresh pass and consumed on subsequent passes after a
     *  `params.update`'s first-affected scan keeps upstream shapes cached. */
    cachedFeatureMeshes?: Map<FeatureId, unknown>;
    /** Per-assembly-part triangle mesh cache. Outer key = assembly featureId
     *  (e.g. `solvedAssembly_1`); inner key = part name. Reused when the
     *  assembly is re-lowered with the same per-part LOCAL shapes (typical
     *  for pose-only `params.update`): triangle data is reused, only the
     *  freshly-solved `worldTransform` is refreshed. */
    cachedAssemblyPartMeshes?: Map<FeatureId, Map<string, unknown>>;
    /** Pre-lowered shapes from the previous build (populated by `buildModel`
     *  and `params.update`'s `populateCache`). Used to derive a `seedShapes`
     *  set for `engine.run` so unchanged records skip re-lowering. The seed
     *  set covers (a) construction-closure records whose meshes only emit
     *  via the assembly fan-out and (b) non-assembly records whose cached
     *  `FeatureMesh` can be re-emitted directly. */
    cachedShapes?: Map<FeatureId, ShapeBackend>;
    /** P7: live `Assembly` instances keyed by assembly name. Stored as
     *  `unknown` on CaptureSession to avoid a TS cycle with the assembly
     *  module; this hook lets the SceneBackend fan-out look up the
     *  matching Assembly handle and emit one synthetic tendon
     *  FeatureMesh per declared `arm.tendon(...)` record so the
     *  rendered scene visibly shows the closed-loop balance springs.
     *  Optional — scripts without `arm.tendon(...)` (or that don't
     *  expose an assemblies map) render unchanged. */
    assemblies?: ReadonlyMap<string, unknown>;
  },
): Promise<MeshFeaturesResult> {
  await initOcct();
  const lowerer = new OcctLowerer();
  if (session) {
    lowerer.importedGeometry = session.importedGeometry;
    if (session.getSurfaceRecord) {
      lowerer.getSurfaceRecord = session.getSurfaceRecord.bind(session);
    }
  }
  const engine = new RecomputeEngine(lowerer);
  const features: FeatureMesh[] = [];
  const failedFeatureIds: FeatureId[] = [];
  const recordById = new Map<FeatureId, FeatureRecord>(records.map((r) => [r.id, r]));
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  // Lookup table for record metadata.color so we can attach it onto each
  // FeatureMesh when feature.compiled fires. Renderer resolves via ROLE_PALETTE.
  const colorByFeatureId = new Map<FeatureId, string>();
  // Lookup table for full PBR material derived from record metadata.
  const materialByFeatureId = new Map<FeatureId, PBRMaterial>();
  // Lookup table for per-face PBR overrides (label → PBR). Resolution into
  // face-index keys happens at feature.compiled time when we hold the OCCT
  // shape.
  const materialByLabelByFeatureId = new Map<FeatureId, Record<string, PBRMaterial>>();
  // Recordbook for diagnostics — surface unresolved labels as warnings.
  const warnings: Array<{
    code: 'feature.material.face-label-no-match';
    featureId: FeatureId;
    label: string;
    detail: string;
  }> = [];
  for (const r of records) {
    const color = (r.metadata as { color?: unknown } | undefined)?.color;
    if (typeof color === 'string') colorByFeatureId.set(r.id, color);
    const pbr = pbrFromMetadata(r.metadata as Record<string, unknown> | undefined);
    if (pbr !== undefined) materialByFeatureId.set(r.id, pbr);
    const perFace = (r.metadata as { materialByLabel?: Record<string, PBRMaterial> } | undefined)
      ?.materialByLabel;
    if (perFace !== undefined && Object.keys(perFace).length > 0) {
      materialByLabelByFeatureId.set(r.id, perFace);
    }
  }

  // Emit virtual records (referenceImage, renderEnvironment, etc.) directly —
  // they produce no OCCT geometry, but the renderer needs their payload to
  // materialize overlays / IBL.
  for (const r of records) {
    if (r.metadata?.virtual === true) {
      const refImg = r.kind === 'referenceImage'
        ? (r.metadata as unknown as ReferenceImageMetadata)
        : undefined;
      const renderEnv = r.kind === 'renderEnvironment'
        ? (r.metadata as unknown as RenderEnvironmentMetadata)
        : undefined;
      const cameraTgt = r.kind === 'cameraTarget'
        ? (r.metadata as unknown as CameraTargetMetadata)
        : undefined;
      features.push({
        featureId: r.id,
        featureKind: r.kind,
        predecessors: [],
        faces: [],
        virtual: true,
        ...meshIdentityFields({
          featureId: r.id,
          featureKind: r.kind,
          sourceMetadataName: metadataNameOf(r),
        }),
        ...(refImg !== undefined ? { referenceImage: refImg } : {}),
        ...(renderEnv !== undefined ? { renderEnvironment: renderEnv } : {}),
        ...(cameraTgt !== undefined ? { cameraTarget: cameraTgt } : {}),
      });
    }
  }

  // Pre-compute the construction-input closure (records whose meshes are
  // subsumed by the SceneBackend fan-out). Empty set when no assemblyPart
  // records exist, so single-shape scripts are unaffected.
  const constructionClosure = computeConstructionClosure(records);

  const cachedFeatureMeshes = session?.cachedFeatureMeshes as
    | Map<FeatureId, FeatureMesh>
    | undefined;
  const cachedAssemblyPartMeshes = session?.cachedAssemblyPartMeshes as
    | Map<FeatureId, Map<string, { faces: FaceGeometry[]; volume?: number; edges?: Float32Array }>>
    | undefined;
  const cachedShapesIn = session?.cachedShapes;
  const assembliesIn = session?.assemblies;

  // Derive the seedShapes set for `engine.run`. A record can be safely
  // skipped from re-lowering when its cached lowered shape is still in
  // `session.cachedShapes` AND one of:
  //   (a) the record is in the construction closure (its mesh emits only via
  //       the downstream assembly fan-out — its own `feature.compiled` event
  //       is filtered out below regardless), OR
  //   (b) we have a cached `FeatureMesh` for it (we re-emit the cached mesh
  //       directly after `engine.run` finishes).
  // Records the engine MUST re-lower (the firstAffected and downstream of an
  // edited param) are absent from `cachedShapes` after `populateCache`'s
  // updater runs — `params.update`'s populate path overwrites entries with the
  // freshly-lowered shapes, but invalidates the matching mesh cache entries.
  const seedShapes = cachedShapesIn !== undefined
    ? (() => {
        const seed = new Map<FeatureId, ShapeBackend>();
        for (const r of records) {
          const cached = cachedShapesIn.get(r.id);
          if (!cached) continue;
          if (constructionClosure.has(r.id) || cachedFeatureMeshes?.has(r.id)) {
            seed.set(r.id, cached);
          }
        }
        return seed;
      })()
    : undefined;

  await engine.run(records, {
    paramTable,
    ...(seedShapes !== undefined && seedShapes.size > 0 ? { seedShapes } : {}),
    onEvent: (event) => {
      if (event.kind === 'feature.failed') {
        failedFeatureIds.push(event.featureId);
        return;
      }
      if (event.kind !== 'feature.compiled') return;

      // Construction-input closure: this record was an intermediate input
      // to an assemblyPart's source shape. Its geometry is already presented
      // (with role color and viewport transform) via the SceneBackend
      // fan-out below. Emitting it here would re-render it at LOCAL frame
      // stacked at origin. Note: the SceneBackend feature itself
      // (solvedAssembly / assemblyModel / assemblyExport) is the consumer,
      // not a construction input — it's not in the closure.
      if (constructionClosure.has(event.featureId)) {
        return;
      }

      // SceneBackend (assembly multi-body) → fan out one FeatureMesh per
      // assembly part, with composite featureId, the assembly feature as
      // the sole predecessor, per-part color, and a viewport transform.
      // Keep vertices in each part's local frame so Studio can pose parts
      // by changing group matrices instead of remeshing on every joint tick.
      if (isSceneBackend(event.shape)) {
        let partCache = cachedAssemblyPartMeshes?.get(event.featureId);
        for (const part of event.shape.parts) {
          // Pose-cache fast path: when the assembly is being re-lowered for a
          // pose-only edit, the per-part LOCAL shape is unchanged (same OCCT
          // backend instance is reused via the engine's seedShapes seed) and
          // only `part.worldTransform` has refreshed. Reuse cached triangle
          // data so we skip the expensive `meshShape()` call per part.
          const cachedPart = partCache?.get(part.name);
          let faces: FaceGeometry[];
          let volume: number | undefined;
          let edges: Float32Array | undefined;
          if (cachedPart) {
            faces = cachedPart.faces;
            volume = cachedPart.volume;
            edges = cachedPart.edges;
          } else {
            const meshed = meshShape(extractRawShape(part.shape));
            if (!meshed) {
              // Per-part shape failed to mesh; skip silently — the lowerer
              // already populated the part shape, and the SceneBackend itself
              // is not a single-shape unit so we don't fail the whole assembly.
              continue;
            }
            faces = meshed.faces;
            volume = meshed.volume;
            edges = meshed.edges;
            if (cachedAssemblyPartMeshes !== undefined) {
              if (!partCache) {
                partCache = new Map();
                cachedAssemblyPartMeshes.set(event.featureId, partCache);
              }
              partCache.set(part.name, { faces, ...(volume !== undefined ? { volume } : {}), ...(edges ? { edges } : {}) });
            }
          }
          const local: FeatureMesh = {
            featureId: `${event.featureId}__${part.name}`,
            featureKind: event.featureKind,
            predecessors: [event.featureId],
            // op intentionally omitted (no boolean op for assembly parts)
            faces,
            ...(volume !== undefined ? { volume } : {}),
            ...(edges ? { edges } : {}),
          };
          if (!cachedPart) attachPlanarUVs(local.faces);
          features.push({
            ...local,
            assemblyFeatureId: event.featureId,
            assemblyPartName: part.name,
            transform: part.worldTransform.toMat4(),
            ...meshIdentityFields({
              featureId: local.featureId,
              featureKind: local.featureKind,
              assemblyFeatureId: event.featureId,
              assemblyPartName: part.name,
              sourceMetadataName: metadataNameOf(recordById.get(event.featureId)),
            }),
            ...(part.color !== undefined ? { color: part.color } : {}),
            ...(part.material !== undefined ? { material: part.material } : {}),
          });
          // Aggregate bounds from FK-transformed vertices while keeping the
          // emitted mesh local for viewport-side transforms.
          const transformed = transformFeatureMesh(local, part.worldTransform);
          for (const f of transformed.faces) {
            for (let i = 0; i < f.vertices.length; i += 3) {
              const x = f.vertices[i], y = f.vertices[i + 1], z = f.vertices[i + 2];
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
              if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
            }
          }
        }
        // P7 — emit one synthetic tendon FeatureMesh per declared
        // `arm.tendon(...)` record on the owning Assembly. The cylinder
        // geometry is baked in WORLD frame here so it lands as a normal
        // feature group in the renderer (no special path needed) and the
        // centroid-recentre loop composes onto it identically to part
        // groups. Cylinder span uses each owner part's `worldTransform`
        // sourced directly off the SceneBackend.
        const tendonMeshes = collectTendonMeshes(event.shape, event.featureId, assembliesIn);
        for (const tm of tendonMeshes) {
          features.push(tm);
          for (const f of tm.faces) {
            for (let i = 0; i < f.vertices.length; i += 3) {
              const x = f.vertices[i], y = f.vertices[i + 1], z = f.vertices[i + 2];
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
              if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
            }
          }
        }
        return;
      }

      const meshed = meshShape(extractRawShape(event.shape));
      if (!meshed) {
        if (event.featureKind === 'sketch') {
          return;
        }
        // Compiled but un-meshable (e.g., empty face iterable, all faces failed
        // to mesh). Surface as a failure so captureDemo aborts instead of
        // silently producing a scene with a missing feature group.
        console.warn(`meshFeaturesPerFeature: feature '${event.featureId}' compiled but produced no mesh`);
        failedFeatureIds.push(event.featureId);
        return;
      }

      const color = colorByFeatureId.get(event.featureId);
      const material = materialByFeatureId.get(event.featureId);

      // Per-face material resolution. For each label in materialByLabel,
      // resolve label → Face via the same machinery the edge-feature
      // lowerers use (resolveFaceLabelToFace), hash the matched face, then
      // walk `shape.faces` (the iteration source for meshShape's faceId
      // integer) to find the index whose hash matches. Attach the PBR to
      // that integer index. Unresolved labels surface a soft warning;
      // unmatched faces fall back to the shape-level `material`.
      let materialByFaceId: Record<number, PBRMaterial> | undefined;
      const perFaceMap = materialByLabelByFeatureId.get(event.featureId);
      if (perFaceMap !== undefined && event.shape instanceof OcctBackend) {
        const base = event.shape;
        // Walk shape.faces ONCE and hash every face so resolution is O(F + L)
        // not O(F * L). The replicad shape.faces iteration order matches
        // meshShape's faceId assignment (see meshing.ts:meshShape).
        const replicadFaces = (base.getReplicadShape() as unknown as { faces: unknown[] }).faces;
        const faceIdByHash = new Map<string, number>();
        replicadFaces.forEach((f, idx) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            faceIdByHash.set(faceHashOf(f as any), idx);
          } catch {
            // skip un-hashable faces; they simply won't get per-face overrides
          }
        });

        const record = records.find(r => r.id === event.featureId);
        if (record !== undefined) {
          for (const [label, pbr] of Object.entries(perFaceMap)) {
            const resolved = resolveFaceLabelToFace(record, base, label, records);
            if ('error' in resolved) {
              // Resolver collisions / canonical-not-applicable etc. — surface as
              // soft no-match warning so the build continues. The error fields
              // (code, severity 'error') are owned by the resolver; we lift
              // only the label so the agent knows which call failed.
              warnings.push({
                code: 'feature.material.face-label-no-match',
                featureId: event.featureId,
                label,
                detail: resolved.error.message,
              });
              continue;
            }
            let hash: string;
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              hash = faceHashOf(resolved.face as any);
            } catch {
              warnings.push({
                code: 'feature.material.face-label-no-match',
                featureId: event.featureId,
                label,
                detail: `Resolved face for '${label}' could not be hashed.`,
              });
              continue;
            }
            const idx = faceIdByHash.get(hash);
            if (idx === undefined) {
              warnings.push({
                code: 'feature.material.face-label-no-match',
                featureId: event.featureId,
                label,
                detail: `Resolved face hash '${hash}' for label '${label}' not present in the meshed face set.`,
              });
              continue;
            }
            if (materialByFaceId === undefined) materialByFaceId = {};
            materialByFaceId[idx] = pbr;
          }
        }
      }

      attachPlanarUVs(meshed.faces);
      const emitted: FeatureMesh = {
        featureId: event.featureId,
        featureKind: event.featureKind,
        predecessors: event.predecessors,
        op: event.op,
        faces: meshed.faces,
        volume: meshed.volume,
        edges: meshed.edges,
        ...meshIdentityFields({
          featureId: event.featureId,
          featureKind: event.featureKind,
          sourceMetadataName: metadataNameOf(recordById.get(event.featureId)),
        }),
        ...(color !== undefined ? { color } : {}),
        ...(material !== undefined ? { material } : {}),
        ...(materialByFaceId !== undefined ? { materialByFaceId } : {}),
      };
      features.push(emitted);
      // Populate per-feature mesh cache so a subsequent `params.update` whose
      // first-affected scan keeps this record's lowered shape can re-emit the
      // cached mesh directly instead of calling `meshShape` again.
      cachedFeatureMeshes?.set(event.featureId, emitted);

      // Aggregate bounds from this feature's vertices
      for (const f of meshed.faces) {
        for (let i = 0; i < f.vertices.length; i += 3) {
          const x = f.vertices[i], y = f.vertices[i + 1], z = f.vertices[i + 2];
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
      }
    },
  });

  // Records whose lowered shape was passed in `seedShapes` are skipped by the
  // recompute engine — `feature.compiled` is NOT emitted for them, so the
  // onEvent path above never runs. Re-emit cached `FeatureMesh` entries for
  // non-construction-closure records here so the response still carries
  // those records' meshes. Construction-closure records emit only via the
  // assembly fan-out, so they don't need a re-emit here.
  if (seedShapes !== undefined && seedShapes.size > 0 && cachedFeatureMeshes) {
    const emittedIds = new Set(features.map((f) => f.featureId));
    for (const r of records) {
      if (!seedShapes.has(r.id)) continue;
      if (emittedIds.has(r.id)) continue;
      if (constructionClosure.has(r.id)) continue;
      const cached = cachedFeatureMeshes.get(r.id);
      if (!cached) continue;
      const mesh = cached as FeatureMesh;
      features.push(mesh);
      for (const f of mesh.faces) {
        for (let i = 0; i < f.vertices.length; i += 3) {
          const x = f.vertices[i], y = f.vertices[i + 1], z = f.vertices[i + 2];
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
      }
    }
  }

  const bounds: Bounds = {
    min: features.length > 0 ? [minX, minY, minZ] : [0, 0, 0],
    max: features.length > 0 ? [maxX, maxY, maxZ] : [0, 0, 0],
  };

  const materialShadowingWarnings = detectMaterialShadowing(
    features,
    materialByFeatureId,
  );
  for (const w of materialShadowingWarnings) {
    console.warn(`meshFeaturesPerFeature: material shadowing — ${w.message}`);
  }

  return {
    features,
    bounds,
    failedFeatureIds,
    materialShadowingWarnings,
    ...(warnings.length > 0 ? { perFaceMaterialWarnings: warnings } : {}),
  };
}

/**
 * Walk the post-mesh DAG forward from each material-bearing leaf. Emit a
 * warning for every (leaf, shadowing-boolean) pair where the leaf is reachable
 * via a chain of union/intersect predecessors from a downstream record that
 * also carries its own material. The leaf's material survives only on the
 * intermediate group during the build animation; the post-fuse silhouette
 * carries the head record's material.
 *
 * Walk semantics:
 *   - Visit each leaf with a material exactly once.
 *   - Reverse-adjacency lookup is built from `feature.predecessors`.
 *   - We follow boolean fuse-style edges only (op === 'union' | 'intersect').
 *     subtract edges represent cutters that DON'T enter the post-fuse mesh,
 *     so a leaf consumed only as a `subtract` cutter never produces a
 *     shadowing warning.
 *   - The first material-bearing descendant on each forward path is the
 *     "shadowing" record reported.
 */
function detectMaterialShadowing(
  features: readonly FeatureMesh[],
  materialByFeatureId: ReadonlyMap<FeatureId, PBRMaterial>,
): MaterialShadowingWarning[] {
  const featureById = new Map<FeatureId, FeatureMesh>();
  for (const f of features) featureById.set(f.featureId, f);

  // Reverse adjacency for fuse-style edges only. A leaf at `id` flows into
  // `descendantsByPredecessor.get(id)` when those descendants list it as a
  // predecessor AND the descendant's op is union/intersect (or no-op, for
  // non-boolean records that just consume the shape — modifiers/transforms
  // preserve material reachability).
  const descendantsByPredecessor = new Map<FeatureId, FeatureId[]>();
  for (const f of features) {
    if (f.virtual) continue;
    // Subtract booleans don't carry the predecessor's volume into the
    // post-fuse mesh — the cutter is consumed. Skip those edges so a
    // hole-cutter with .material() doesn't spuriously warn.
    if (f.op === 'subtract') continue;
    for (const predId of f.predecessors) {
      const list = descendantsByPredecessor.get(predId);
      if (list) list.push(f.featureId);
      else descendantsByPredecessor.set(predId, [f.featureId]);
    }
  }

  const out: MaterialShadowingWarning[] = [];
  for (const leaf of features) {
    if (leaf.virtual) continue;
    if (!materialByFeatureId.has(leaf.featureId)) continue;

    // BFS forward; stop at the first material-bearing descendant on each
    // branch. We only need one shadower per leaf for the diagnostic; if
    // there's a chain (.union().union().union()), the FIRST one with its
    // own material is the load-bearing one.
    const visited = new Set<FeatureId>([leaf.featureId]);
    const queue: FeatureId[] = [];
    const seedDescendants = descendantsByPredecessor.get(leaf.featureId);
    if (seedDescendants) queue.push(...seedDescendants);

    let shadower: FeatureMesh | undefined;
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      if (materialByFeatureId.has(id)) {
        shadower = featureById.get(id);
        break;
      }
      const next = descendantsByPredecessor.get(id);
      if (next) queue.push(...next);
    }

    if (shadower) {
      out.push({
        leafFeatureId: leaf.featureId,
        leafFeatureKind: leaf.featureKind,
        shadowingFeatureId: shadower.featureId,
        shadowingFeatureKind: shadower.featureKind,
        message:
          `leaf '${leaf.featureId}' (${leaf.featureKind}) has its own material but is unioned into ` +
          `'${shadower.featureId}' (${shadower.featureKind}) which also has its own material. ` +
          `The leaf material is visible during the build animation only; the static render ` +
          `(kernelcad render, post-rotate capture-demo) shows the head material on the fused silhouette. ` +
          `To preserve per-leaf material in the static render, split the construction so the leaf is not ` +
          `unioned into a material-bearing parent, or author the leaf as a separate assemblyPart.`,
      });
    }
  }

  return out;
}
