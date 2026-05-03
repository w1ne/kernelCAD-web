/**
 * Browser-side compatibility shim for the kernelCAD v0.1 script API.
 *
 * The v0.1 kernel (`src/modules/api.ts`, `src/script-runtime/*`) executes
 * `.kcad.ts` scripts in a Node `vm` context that doesn't exist in browsers.
 * Until v0.5 lands a real browser-side script-runtime, the deployed web demo
 * needs to evaluate the v0.1 starter script (and any v0.1-style code the
 * user writes) inside the existing Replicad worker.
 *
 * This module wires a minimal `param` / `box` / `cylinder` / `sphere` global
 * surface — backed directly by Replicad — that returns shapes whose
 * `.subtract()` / `.union()` / `.intersect()` / `.translate()` / `.fillet()` /
 * `.chamfer()` methods match the v0.1 `Shape` proxy in `src/capture/proxy.ts`.
 * The Replicad shape underneath still exposes `blobSTL()` / `blobSTEP()` for
 * the export path, so the existing `EXPORT_STL` / `EXPORT_STEP` worker
 * handlers keep working.
 *
 * Anchoring matches `src/backends/occt/occtBackend.ts`:
 *   - `box(w, h, t)` corner-anchored at the origin (spans [0,w]×[0,h]×[0,t]).
 *   - `cylinder(h, r)` axis along Z, base at z=0.
 *   - `sphere(r)` centered at the origin.
 *
 * fillet/chamfer canonical face refs (v0.21.1):
 *   - `{ face: 'top'|'bottom'|'left'|'right'|'front'|'back' }` is lowered to
 *     a Replicad EdgeFinder via axis-aligned bbox lookup.
 *   - Rotated shapes throw a clear deferred-feature error.
 */

type ReplicadLike = {
  makeBaseBox: (x: number, y: number, z: number) => unknown;
  makeCylinder: (r: number, h: number) => unknown;
  makeSphere: (r: number) => unknown;
};

type RawShape = {
  translate: (x: number, y: number, z: number) => RawShape;
  rotate?: (angle: number, pivot: [number, number, number], axis: [number, number, number]) => RawShape;
  fuse: (other: RawShape) => RawShape;
  cut: (other: RawShape) => RawShape;
  intersect: (other: RawShape) => RawShape;
};

interface WrapMeta {
  rotated: boolean;
}

/** Plane and offset for a canonical face name resolved against a bounding box. */
interface PlaneSpec {
  plane: 'XY' | 'XZ' | 'YZ';
  distance: number;
}

/**
 * Map a canonical face name to a plane identifier and distance.
 * Returns null if `name` is not a known canonical face name.
 */
function canonicalFaceNameToPlane(
  name: string,
  bbox: { min: [number, number, number]; max: [number, number, number] },
): PlaneSpec | null {
  switch (name) {
    case 'top':    return { plane: 'XY', distance: bbox.max[2] };
    case 'bottom': return { plane: 'XY', distance: bbox.min[2] };
    case 'back':   return { plane: 'XZ', distance: bbox.max[1] };
    case 'front':  return { plane: 'XZ', distance: bbox.min[1] };
    case 'right':  return { plane: 'YZ', distance: bbox.max[0] };
    case 'left':   return { plane: 'YZ', distance: bbox.min[0] };
    default:       return null;
  }
}

/**
 * Extract axis-aligned bounding box from a Replicad Shape3D.
 * Uses `shape.boundingBox.bounds` which returns `[SimplePoint, SimplePoint]`.
 */
function bboxOf(shape: unknown): { min: [number, number, number]; max: [number, number, number] } {
  const r = shape as {
    boundingBox?: {
      bounds?: [[number, number, number], [number, number, number]];
      min?: number[];
      max?: number[];
    };
    faces?: ArrayLike<unknown>;
  };

  // Primary path: Replicad Shape3D.boundingBox.bounds → [SimplePoint, SimplePoint]
  if (r.boundingBox && Array.isArray(r.boundingBox.bounds)) {
    const b = r.boundingBox.bounds as [[number, number, number], [number, number, number]];
    return { min: [b[0][0], b[0][1], b[0][2]], max: [b[1][0], b[1][1], b[1][2]] };
  }

  // Secondary path: some shapes expose .min/.max directly
  if (r.boundingBox && Array.isArray(r.boundingBox.min) && Array.isArray(r.boundingBox.max)) {
    return {
      min: [r.boundingBox.min[0]!, r.boundingBox.min[1]!, r.boundingBox.min[2]!],
      max: [r.boundingBox.max[0]!, r.boundingBox.max[1]!, r.boundingBox.max[2]!],
    };
  }

  // Fallback: walk face mesh vertices
  const faces = r.faces;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  if (faces) {
    for (const f of Array.from(faces)) {
      const mesh = (f as { mesh?: (opts: object) => { vertices?: number[] } }).mesh?.({
        tolerance: 0.5,
        angularTolerance: 30,
      });
      const verts = mesh?.vertices;
      if (!verts) continue;
      for (let i = 0; i < verts.length; i += 3) {
        if (verts[i] < minX) minX = verts[i];
        if (verts[i] > maxX) maxX = verts[i];
        if (verts[i + 1] < minY) minY = verts[i + 1];
        if (verts[i + 1] > maxY) maxY = verts[i + 1];
        if (verts[i + 2] < minZ) minZ = verts[i + 2];
        if (verts[i + 2] > maxZ) maxZ = verts[i + 2];
      }
    }
  }
  if (minX === Infinity) {
    throw new Error(
      'v01 shim: cannot compute bounding box for shape — neither boundingBox nor face mesh is available. ' +
      'This typically means the shape is degenerate or uses an unsupported Replicad type.'
    );
  }
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

/**
 * Lower a canonical face filter object `{ face: 'top' | ... }` to a Replicad
 * EdgeFinder function `(e: EdgeFinder) => EdgeFinder` suitable for passing to
 * `shape.fillet(r, finder)` / `shape.chamfer(d, finder)`.
 *
 * Returns `null` if `filter` is not a canonical face ref (pass-through).
 * Throws a clear deferred-feature error if `meta.rotated` is true.
 */
function canonicalFaceFilterToFinder(
  shape: unknown,
  filter: unknown,
  meta: WrapMeta,
): ((e: unknown) => unknown) | null {
  if (!filter || typeof filter !== 'object') return null;
  const name = (filter as { face?: unknown }).face;
  if (typeof name !== 'string') return null;

  // Check whether `name` is a known canonical face name (quick pre-check with dummy bbox).
  const precheck = canonicalFaceNameToPlane(name, { min: [0, 0, 0], max: [0, 0, 0] });
  if (!precheck) {
    // Not a canonical face name — pass through unchanged.
    return null;
  }

  if (meta.rotated) {
    throw new Error(
      `v01 shim: canonical face refs (e.g. { face: '${name}' }) on rotated shapes are not supported ` +
      `in the browser worker yet — canonical face refs require axis-aligned geometry; rotated shapes ` +
      `need the Node kernel for full face tracking. Tracking deferred (v0.21.x follow-up).`,
    );
  }

  const bbox = bboxOf(shape);
  const resolved = canonicalFaceNameToPlane(name, bbox)!;
  const { plane, distance } = resolved;

  // Return a filter function: (e: EdgeFinder) => EdgeFinder
  return (e: unknown) => {
    return (e as { inPlane: (p: string, d: number) => unknown }).inPlane(plane, distance);
  };
}

/**
 * Wrap a Replicad shape in a Proxy that adds v0.1's `subtract` / `union`
 * names (mapped to `cut` / `fuse`), redirects `translate` so it returns
 * a wrapped shape, intercepts `fillet`/`chamfer` to lower canonical face refs,
 * and forwards everything else (notably `blobSTL`, `blobSTEP`, `mesh`,
 * `faces`) to the underlying shape unchanged.
 *
 * The `meta` argument tracks rotation state through transforms and booleans:
 *   - `rotate` always sets `rotated: true`.
 *   - `translate` preserves the current `rotated` state.
 *   - `subtract`/`union`/`intersect`: if any operand is rotated, result is rotated.
 */
function wrap(raw: unknown, meta: WrapMeta = { rotated: false }): unknown {
  const target = raw as RawShape;
  return new Proxy(target, {
    get(t, prop, receiver) {
      if (prop === 'subtract') {
        return (...others: unknown[]) => {
          let out: unknown = t;
          let nestedRotated = meta.rotated;
          for (const o of others) {
            const cut = (out as RawShape).cut.bind(out);
            if (
              typeof o === 'object' &&
              o !== null &&
              (o as { __v01Meta__?: WrapMeta }).__v01Meta__?.rotated
            ) {
              nestedRotated = true;
            }
            out = cut(unwrap(o) as RawShape);
          }
          return wrap(out, { rotated: nestedRotated });
        };
      }
      if (prop === 'union') {
        return (...others: unknown[]) => {
          let out: unknown = t;
          let nestedRotated = meta.rotated;
          for (const o of others) {
            const fuse = (out as RawShape).fuse.bind(out);
            if (
              typeof o === 'object' &&
              o !== null &&
              (o as { __v01Meta__?: WrapMeta }).__v01Meta__?.rotated
            ) {
              nestedRotated = true;
            }
            out = fuse(unwrap(o) as RawShape);
          }
          return wrap(out, { rotated: nestedRotated });
        };
      }
      if (prop === 'intersect') {
        return (...others: unknown[]) => {
          let out: unknown = t;
          let nestedRotated = meta.rotated;
          for (const o of others) {
            const intersect = (out as RawShape).intersect.bind(out);
            if (
              typeof o === 'object' &&
              o !== null &&
              (o as { __v01Meta__?: WrapMeta }).__v01Meta__?.rotated
            ) {
              nestedRotated = true;
            }
            out = intersect(unwrap(o) as RawShape);
          }
          return wrap(out, { rotated: nestedRotated });
        };
      }
      if (prop === 'translate') {
        return (x: number, y: number, z: number) => wrap(t.translate(x, y, z), meta);
      }
      if (prop === 'rotate' && typeof t.rotate === 'function') {
        return (axis: [number, number, number], degrees: number, pivot: [number, number, number] = [0, 0, 0]) =>
          wrap((t.rotate as NonNullable<RawShape['rotate']>)(degrees, pivot, axis), { rotated: true });
      }
      if (prop === 'fillet' || prop === 'chamfer') {
        const op = prop;
        return (size: number, filter?: unknown) => {
          const finder = canonicalFaceFilterToFinder(t, filter, meta);
          const native = (t as Record<string, unknown>)[op] as (...args: unknown[]) => unknown;
          // If we resolved a canonical face ref → pass the EdgeFinder function.
          // Otherwise pass the original filter through (could be an EdgeFinder function,
          // a RadiusConfig object, or undefined).
          const effectiveFilter = finder ?? filter;
          return wrap(native.call(t, size, effectiveFilter), meta);
        };
      }
      // unwrap() sentinel — used internally to recover the raw shape from a proxy.
      if (prop === '__v01Raw__') {
        return t;
      }
      // meta sentinel — used to propagate rotation state through booleans.
      if (prop === '__v01Meta__') {
        return meta;
      }
      const value = Reflect.get(t, prop, receiver);
      // Bind methods so callers don't see the proxy as `this`.
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(t) : value;
    },
  });
}

function unwrap(maybeProxy: unknown): unknown {
  if (maybeProxy && typeof maybeProxy === 'object') {
    const raw = (maybeProxy as Record<string, unknown>).__v01Raw__;
    if (raw !== undefined) return raw;
  }
  return maybeProxy;
}

export interface V01ApiGlobals {
  param: (name: string, value: number | string, opts?: unknown) => number;
  box: (x: number, y: number, z: number, centered?: boolean) => unknown;
  cylinder: (h: number, r: number) => unknown;
  sphere: (r: number) => unknown;
}

/**
 * Build the v0.1 API globals that get injected into user scripts. The
 * `param` shim is a no-op in the browser (no UI to render the form yet) —
 * it just returns the default value. v0.5 will wire it through
 * `ParamRegistry`. Numeric defaults are returned as-is; string expressions
 * are evaluated as JS `Number(expr)` since v0.1 uses `String(n)` literals.
 */
export function createV01ApiGlobals(replicad: ReplicadLike): V01ApiGlobals {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    param(_name, value, _opts) {
      if (typeof value === 'number') return value;
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    },
    box(x, y, z, centered = false) {
      const b = replicad.makeBaseBox(x, y, z) as RawShape;
      // Match OcctBackend.box: makeBaseBox is centered in X/Y, anchored at z=0.
      const placed = centered ? b.translate(0, 0, -z / 2) : b.translate(x / 2, y / 2, 0);
      return wrap(placed);
    },
    cylinder(h, r) {
      return wrap(replicad.makeCylinder(r, h));
    },
    sphere(r) {
      return wrap(replicad.makeSphere(r));
    },
  };
}

/** Recover the underlying Replicad shape from a wrapped v0.1 shape. */
export function unwrapV01Shape(maybeProxy: unknown): unknown {
  return unwrap(maybeProxy);
}
