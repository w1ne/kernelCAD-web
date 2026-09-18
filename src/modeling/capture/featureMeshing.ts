// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureMeshing.ts
import type { FeatureId, FeatureKind } from '../../shared/intent/types';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FaceGeometry } from '../../shared/worker/workerTypes';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { PBRMaterial } from '../../shared/intent/material';
import type { ReferenceImageMetadata } from '../../shared/intent/referenceImageRecord';
import type { RenderEnvironmentMetadata } from '../../shared/intent/renderEnvironmentRecord';
import type { CameraTargetMetadata } from '../../shared/intent/cameraTargetRecord';
import type { Vec3 } from '../../shared/intent/types';
import { OcctLowerer } from '../backends/occt/occtLowerer';
import type { FeatureEvent } from '../compute/featureEvents';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { meshShape } from '../../kernel/backends/occt/meshing';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { generatePlanarUVs } from './planarUv';
import { helixPolylineRouted } from '../mates/helixPolyline';
import {
  accumulateMeshBounds,
  buildMeshBounds,
  collectFeatureStyling,
  collectShadowingWarnings,
  computeConstructionClosure,
  deriveSeedShapes,
  emitSceneBackendFanout,
  emitVirtualFeatureRecords,
  meshIdentityFields,
  metadataNameOf,
  reEmitSeededFeatureMeshes,
  resolvePerFaceMaterialOverrides,
  splitConnectorRef,
  uniqueStrings,
  type MeshBoundsAccumulator,
} from './featureMeshingPhases';

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

/** Shape backends authored by remote catalog code can originate from a
 * different module graph, making an `instanceof OcctBackend` check unsafe.
 * The mesher only needs this public capability, so accept any backend that
 * provides it rather than coupling rendering to one constructor identity. */
interface ReplicadShapeProvider {
  getReplicadShape(): unknown;
}

function isReplicadShapeProvider(backend: ShapeBackend): backend is ShapeBackend & ReplicadShapeProvider {
  return typeof (backend as Partial<ReplicadShapeProvider>).getReplicadShape === 'function';
}

/** Extract the raw replicad shape so meshShape() can walk .faces / .meshEdges. */
function extractRawShape(backend: ShapeBackend): unknown {
  if (isReplicadShapeProvider(backend)) {
    return backend.getReplicadShape();
  }
  throw new Error(
    `meshFeaturesPerFeature: unsupported backend target '${backend.target}' — missing getReplicadShape()`
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

/** Which display attribute a shadowing warning is about. `.material()` and
 *  `.color()` are attributed by the SAME record-metadata mechanism and are
 *  therefore shadowed by the same DAG rule — one detector serves both. */
export type ShadowedAttribute = 'material' | 'color';

/** Diagnostic emitted when a leaf record with its own explicit material/color
 *  is consumed by a downstream boolean.fuse (union/intersect) whose head record
 *  also has its own material/color. The kernel's boolean operation produces a
 *  single post-fuse mesh whose faces inherit the head record's attribution —
 *  the leaf's is therefore invisible on the static silhouette (post-fuse render
 *  in `kernelcad render` and after the build animation settles in
 *  `npm run capture-demo`). The leaf attribution IS visible during the staged
 *  build animation while predecessor groups are still fading.
 *
 *  Authors who want a multi-material/multi-color static render today must
 *  either:
 *    (a) split the construction so the attributed leaf is not unioned
 *        into a parent that also carries its own attribution, OR
 *    (b) author the leaf as a separate `assemblyPart` (assembly fan-out path
 *        preserves per-part attribution in the static render).
 *
 *  Tracked as a follow-up code fix in
 *  `docs/specs/per-leaf-material-survives-static-render.md`. */
export interface AttributeShadowingWarning {
  /** Which attribute was shadowed. Lets a single consumer render both. */
  attribute: ShadowedAttribute;
  leafFeatureId: FeatureId;
  leafFeatureKind: FeatureKind;
  shadowingFeatureId: FeatureId;
  shadowingFeatureKind: FeatureKind;
  message: string;
}

/** Back-compat alias: the material flavour of `AttributeShadowingWarning`. */
export type MaterialShadowingWarning = AttributeShadowingWarning;

export interface MeshFeaturesResult {
  features: FeatureMesh[];
  bounds: Bounds;
  failedFeatureIds: FeatureId[];  // empty array if no failures
  /** Soft warnings collected during per-face material label resolution.
   *  Optional — absent when no labels were referenced. */
  perFaceMaterialWarnings?: PerFaceMaterialWarning[];
  /** Multi-material diagnostic. See `AttributeShadowingWarning` for context. */
  materialShadowingWarnings: AttributeShadowingWarning[];
  /** Multi-color diagnostic — same DAG rule as `materialShadowingWarnings`,
   *  applied to `metadata.color`. This is the answer to "`.color()` after a
   *  boolean is silent": it is NOT a no-op on the per-feature meshing path,
   *  but a leaf color IS discarded when the fuse head recolors the result. */
  colorShadowingWarnings: AttributeShadowingWarning[];
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

/**
 * The features that ARE the result: those no other feature consumes.
 *
 * `meshFeaturesPerFeature` returns a mesh for every node in the intent DAG,
 * intermediates included — `box(…).shell(…).fillet(…)` yields box_1, shell_1
 * AND fillet_1. A viewer that draws all of them stacks the original box on top
 * of the finished body, and the model stops responding to edits while still
 * looking plausible. Drawing only the terminal features is what "render the
 * model" means.
 *
 * It is a set, not "the last record": a solved assembly terminates in one
 * feature per part.
 */
export function selectTerminalFeatures(
  features: readonly FeatureMesh[],
): FeatureMesh[] {
  const consumed = new Set<FeatureId>();
  for (const feature of features) {
    for (const predecessor of feature.predecessors) consumed.add(predecessor);
  }
  return features.filter((feature) => !consumed.has(feature.featureId));
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
    /** Streaming hook: fired as each FeatureMesh is produced during the
     *  interleaved lower+mesh pass, so a caller can flush it progressively
     *  instead of waiting for the whole build. Optional — non-streaming callers
     *  omit it and the emitted set / return value are byte-identical. */
    onFeature?: (mesh: FeatureMesh) => void;
    /** Extra world-space translations keyed by assembly part name, composed
     *  onto each part's solved worldTransform (exploded views). */
    explodeOffsets?: ReadonlyMap<string, readonly [number, number, number]>;
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
  // Collect every produced FeatureMesh, and — when a streaming caller passed
  // `session.onFeature` — flush it immediately so the viewport can paint parts
  // as they finish instead of waiting for the whole build.
  const emitFeature = (mesh: FeatureMesh): void => {
    features.push(mesh);
    session?.onFeature?.(mesh);
  };
  const failedFeatureIds: FeatureId[] = [];
  const recordById = new Map<FeatureId, FeatureRecord>(records.map((r) => [r.id, r]));
  const meshBounds: MeshBoundsAccumulator = {
    minX: Infinity, minY: Infinity, minZ: Infinity,
    maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity,
  };

  // Lookup table for record metadata.color so we can attach it onto each
  // FeatureMesh when feature.compiled fires. Renderer resolves via ROLE_PALETTE.
  // Lookup tables also cover full PBR material derived from record metadata;
  // materials the author wrote EXPLICITLY via `.material({...})` (distinct from
  // `materialByFeatureId`, which also contains materials *promoted* from
  // `metadata.color` by `pbrFromMetadata` — shadowing diagnostics must use the
  // explicit map: otherwise a pure-`.color()` script is reported as "material
  // shadowing" and told to fix a `.material()` call it never made); and
  // per-face PBR overrides (label → PBR), resolved into face-index keys at
  // feature.compiled time when we hold the OCCT shape.
  const {
    colorByFeatureId,
    materialByFeatureId,
    explicitMaterialByFeatureId,
    materialByLabelByFeatureId,
  } = collectFeatureStyling(records);
  // Recordbook for diagnostics — surface unresolved labels as warnings.
  const warnings: Array<{
    code: 'feature.material.face-label-no-match';
    featureId: FeatureId;
    label: string;
    detail: string;
  }> = [];

  // Emit virtual records (referenceImage, renderEnvironment, etc.) directly —
  // they produce no OCCT geometry, but the renderer needs their payload to
  // materialize overlays / IBL.
  emitVirtualFeatureRecords(records, emitFeature);

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

  // Derive the seedShapes set for `engine.run`: records with a cached lowered
  // shape that are either part of the construction closure or have a cached
  // `FeatureMesh` to re-emit after `engine.run` finishes.
  const seedShapes = deriveSeedShapes(
    records,
    constructionClosure,
    cachedShapesIn,
    cachedFeatureMeshes,
  );

  await engine.run(records, {
    paramTable,
    ...(seedShapes !== undefined && seedShapes.size > 0 ? { seedShapes } : {}),
    onEvent: (event) => handleMeshFeatureEvent(event, {
      emitFeature,
      meshBounds,
      failedFeatureIds,
      constructionClosure,
      cachedAssemblyPartMeshes,
      explodeOffsets: session?.explodeOffsets,
      assembliesIn,
      recordById,
      colorByFeatureId,
      materialByFeatureId,
      materialByLabelByFeatureId,
      warnings,
      records,
      cachedFeatureMeshes,
    }),
  });

  reEmitSeededFeatureMeshes(
    records,
    seedShapes,
    cachedFeatureMeshes,
    constructionClosure,
    features,
    emitFeature,
    meshBounds,
  );

  const bounds = buildMeshBounds(features, meshBounds);

  const { materialShadowingWarnings, colorShadowingWarnings } = collectShadowingWarnings(
    features,
    explicitMaterialByFeatureId,
    colorByFeatureId,
  );
  for (const w of materialShadowingWarnings) {
    console.warn(`meshFeaturesPerFeature: material shadowing — ${w.message}`);
  }
  for (const w of colorShadowingWarnings) {
    console.warn(`meshFeaturesPerFeature: color shadowing — ${w.message}`);
  }

  return {
    features,
    bounds,
    failedFeatureIds,
    materialShadowingWarnings,
    colorShadowingWarnings,
    ...(warnings.length > 0 ? { perFaceMaterialWarnings: warnings } : {}),
  };
}

/**
 * Per-event handler for the interleaved lower+mesh pass. Extracted verbatim
 * from `meshFeaturesPerFeature`'s `onEvent` closure; free variables are
 * threaded through `ctx`.
 */
interface MeshFeatureEventContext {
  readonly emitFeature: (mesh: FeatureMesh) => void;
  readonly meshBounds: MeshBoundsAccumulator;
  readonly failedFeatureIds: FeatureId[];
  readonly constructionClosure: ReadonlySet<FeatureId>;
  readonly cachedAssemblyPartMeshes?: Map<FeatureId, Map<string, { faces: FaceGeometry[]; volume?: number; edges?: Float32Array }>>;
  readonly explodeOffsets?: ReadonlyMap<string, readonly [number, number, number]>;
  readonly assembliesIn?: ReadonlyMap<string, unknown>;
  readonly recordById: ReadonlyMap<FeatureId, FeatureRecord>;
  readonly colorByFeatureId: ReadonlyMap<FeatureId, string>;
  readonly materialByFeatureId: ReadonlyMap<FeatureId, PBRMaterial>;
  readonly materialByLabelByFeatureId: ReadonlyMap<FeatureId, Record<string, PBRMaterial>>;
  readonly warnings: PerFaceMaterialWarning[];
  readonly records: readonly FeatureRecord[];
  readonly cachedFeatureMeshes?: Map<FeatureId, FeatureMesh>;
}

function handleMeshFeatureEvent(event: FeatureEvent, ctx: MeshFeatureEventContext): void {
  if (event.kind === 'feature.failed') {
    ctx.failedFeatureIds.push(event.featureId);
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
  if (ctx.constructionClosure.has(event.featureId)) {
    return;
  }

  // SceneBackend (assembly multi-body) → fan out one FeatureMesh per
  // assembly part, with composite featureId, the assembly feature as
  // the sole predecessor, per-part color, and a viewport transform.
  // Keep vertices in each part's local frame so Studio can pose parts
  // by changing group matrices instead of remeshing on every joint tick.
  if (isSceneBackend(event.shape)) {
    emitSceneBackendFanout(event.featureId, event.featureKind, event.shape, {
      emitFeature: ctx.emitFeature,
      bounds: ctx.meshBounds,
      failedFeatureIds: ctx.failedFeatureIds,
      cachedAssemblyPartMeshes: ctx.cachedAssemblyPartMeshes,
      explodeOffsets: ctx.explodeOffsets,
      assembliesIn: ctx.assembliesIn,
      recordById: ctx.recordById,
      attachPlanarUVs,
      extractRawShape,
      meshIdentityFields,
      metadataNameOf,
      collectTendonMeshes,
    });
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
    ctx.failedFeatureIds.push(event.featureId);
    return;
  }

  const color = ctx.colorByFeatureId.get(event.featureId);
  const material = ctx.materialByFeatureId.get(event.featureId);

  // Per-face material resolution. For each label in materialByLabel,
  // resolve label → Face via the same machinery the edge-feature
  // lowerers use (resolveFaceLabelToFace), hash the matched face, then
  // walk `shape.faces` (the iteration source for meshShape's faceId
  // integer) to find the index whose hash matches. Attach the PBR to
  // that integer index. Unresolved labels surface a soft warning;
  // unmatched faces fall back to the shape-level `material`.
  let materialByFaceId: Record<number, PBRMaterial> | undefined;
  const perFaceMap = ctx.materialByLabelByFeatureId.get(event.featureId);
  if (perFaceMap !== undefined && event.shape instanceof OcctBackend) {
    materialByFaceId = resolvePerFaceMaterialOverrides(
      event.featureId,
      event.shape,
      perFaceMap,
      ctx.records,
      ctx.warnings,
    );
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
      sourceMetadataName: metadataNameOf(ctx.recordById.get(event.featureId)),
    }),
    ...(color !== undefined ? { color } : {}),
    ...(material !== undefined ? { material } : {}),
    ...(materialByFaceId !== undefined ? { materialByFaceId } : {}),
  };
  ctx.emitFeature(emitted);
  // Populate per-feature mesh cache so a subsequent `params.update` whose
  // first-affected scan keeps this record's lowered shape can re-emit the
  // cached mesh directly instead of calling `meshShape` again.
  ctx.cachedFeatureMeshes?.set(event.featureId, emitted);

  // Aggregate bounds from this feature's vertices
  accumulateMeshBounds(ctx.meshBounds, meshed.faces);
}

