import * as replicad from 'replicad';
import opencascade from 'replicad-opencascadejs';
import type { ShapeBackend, BackendTarget } from '../backend';
import type { Vec3 } from '../../intent/types';
import type { RuntimeMesh } from '../runtimeMesh';

let initialized = false;

/**
 * Initialize OpenCascade WASM and bind it to Replicad.
 *
 * Idempotent — safe to call multiple times. Must be awaited before any
 * `OcctBackend` static factory or method that constructs/measures shapes.
 *
 * Uses the same factory-style import as `HeadlessKernel` so it works in both
 * Node (vitest) and bundler (vite) contexts. Browser builds can pre-resolve
 * the WASM URL via Vite's `?url` syntax in their own init shim.
 */
export async function initOcct(): Promise<void> {
  if (initialized) return;
  let OC: unknown;
  if (typeof opencascade === 'function') {
    OC = await (opencascade as unknown as () => Promise<unknown>)();
  } else if (
    opencascade &&
    typeof (opencascade as { default?: () => Promise<unknown> }).default === 'function'
  ) {
    OC = await (opencascade as { default: () => Promise<unknown> }).default();
  } else {
    throw new Error('Could not find opencascade factory function');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replicad.setOC(OC as any);
  initialized = true;
}

type ReplicadShape3D = replicad.Shape3D;

/**
 * `ShapeBackend` implementation backed by Replicad / OpenCascade.
 *
 * Wraps a `replicad.Shape3D` and exposes the canonical kernelCAD operations
 * (transforms, booleans, measurements, exports). Static factories
 * (`box`, `cylinder`, `sphere`, plus extrude/revolve helpers) build new
 * shapes; instance methods are immutable — every transform/boolean returns
 * a new `OcctBackend` wrapping a fresh OCCT shape.
 *
 * NOTE: synchronous `exportSTL` / `exportSTEP` throw, because Replicad's
 * blob exporters are async. Use `exportSTLAsync` / `exportSTEPAsync` from
 * code that can await.
 */
export class OcctBackend implements ShapeBackend {
  readonly target: BackendTarget = 'export-occt';
  // erasableSyntaxOnly forbids constructor parameter properties — declare explicitly.
  private shape: ReplicadShape3D;

  constructor(shape: ReplicadShape3D) {
    this.shape = shape;
  }

  static box(x: number, y: number, z: number, centered = false): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    // `replicad.makeBaseBox` returns a box centered in X and Y, anchored at Z=0.
    // Normalize to two well-known anchorings:
    //   - centered=false (default): box spans [0, x] x [0, y] x [0, z] (anchored at origin corner)
    //   - centered=true:            box spans [-x/2, x/2] x [-y/2, y/2] x [-z/2, z/2]
    const b = replicad.makeBaseBox(x, y, z) as ReplicadShape3D;
    const placed = centered
      ? (b.translate(0, 0, -z / 2) as ReplicadShape3D)
      : (b.translate(x / 2, y / 2, 0) as ReplicadShape3D);
    return new OcctBackend(placed);
  }

  static cylinder(h: number, r: number): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    return new OcctBackend(replicad.makeCylinder(r, h) as ReplicadShape3D);
  }

  static sphere(r: number): OcctBackend {
    if (!initialized) throw new Error('OCCT not initialized — call initOcct() first');
    return new OcctBackend(replicad.makeSphere(r) as ReplicadShape3D);
  }

  translate(x: number, y: number, z: number): OcctBackend {
    return new OcctBackend(this.shape.translate(x, y, z) as ReplicadShape3D);
  }

  rotate(axis: Vec3, degrees: number, pivot: Vec3 = [0, 0, 0]): OcctBackend {
    return new OcctBackend(this.shape.rotate(degrees, pivot, axis) as ReplicadShape3D);
  }

  scale(s: number | Vec3): OcctBackend {
    // Replicad's Shape.scale is uniform; collapse Vec3 to its first component.
    const factor = typeof s === 'number' ? s : s[0];
    return new OcctBackend(this.shape.scale(factor) as ReplicadShape3D);
  }

  mirror(normal: Vec3): OcctBackend {
    return new OcctBackend(
      this.shape.mirror(normal as [number, number, number], [0, 0, 0]) as ReplicadShape3D,
    );
  }

  union(other: ShapeBackend): OcctBackend {
    const o = (other as OcctBackend).shape;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new OcctBackend((this.shape as any).fuse(o) as ReplicadShape3D);
  }

  subtract(other: ShapeBackend): OcctBackend {
    const o = (other as OcctBackend).shape;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new OcctBackend((this.shape as any).cut(o) as ReplicadShape3D);
  }

  intersect(other: ShapeBackend): OcctBackend {
    const o = (other as OcctBackend).shape;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new OcctBackend((this.shape as any).intersect(o) as ReplicadShape3D);
  }

  splitByPlane(_normal: Vec3, _offset: number): [ShapeBackend, ShapeBackend] {
    throw new Error('splitByPlane not implemented in v0.1');
  }

  boundingBox(): { min: Vec3; max: Vec3 } {
    const bb = this.shape.boundingBox;
    const [minP, maxP] = bb.bounds;
    // OCCT's Bnd_Box inflates bounds by a tolerance gap; remove it so that
    // exact-axis-aligned primitives report integral coordinates.
    const wrapped = (bb as unknown as { wrapped?: { GetGap?: () => number } }).wrapped;
    const gap =
      wrapped && typeof wrapped.GetGap === 'function' ? wrapped.GetGap() : 0;
    return {
      min: [minP[0] + gap, minP[1] + gap, minP[2] + gap] as Vec3,
      max: [maxP[0] - gap, maxP[1] - gap, maxP[2] - gap] as Vec3,
    };
  }

  volume(): number {
    return Math.abs(replicad.measureVolume(this.shape));
  }

  surfaceArea(): number {
    return replicad.measureArea(this.shape);
  }

  isEmpty(): boolean {
    return this.shape.faces.length === 0;
  }

  getMesh(): RuntimeMesh {
    const meshed = this.shape.mesh({ tolerance: 0.05, angularTolerance: 0.3 });
    const positions = new Float32Array(meshed.vertices);
    const normalsSrc = meshed.normals ?? new Array(meshed.vertices.length).fill(0);
    return {
      positions,
      normals: new Float32Array(normalsSrc),
      indices: new Uint32Array(meshed.triangles),
    };
  }

  exportSTL(): Uint8Array {
    throw new Error(
      'OcctBackend.exportSTL is synchronous-incompatible — Replicad returns a Blob; use exportSTLAsync()',
    );
  }

  async exportSTLAsync(): Promise<Uint8Array> {
    const blob = this.shape.blobSTL();
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }

  exportSTEP(): Uint8Array {
    throw new Error(
      'OcctBackend.exportSTEP is synchronous-incompatible — Replicad returns a Blob; use exportSTEPAsync()',
    );
  }

  async exportSTEPAsync(): Promise<Uint8Array> {
    const blob = this.shape.blobSTEP();
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }

  dispose(): void {
    const maybeDelete = (this.shape as { delete?: () => void }).delete;
    if (typeof maybeDelete === 'function') {
      maybeDelete.call(this.shape);
    }
  }
}
