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
 * `.subtract()` / `.union()` / `.intersect()` / `.translate()` methods match
 * the v0.1 `Shape` proxy in `src/capture/proxy.ts`. The Replicad shape
 * underneath still exposes `blobSTL()` / `blobSTEP()` for the export path,
 * so the existing `EXPORT_STL` / `EXPORT_STEP` worker handlers keep working.
 *
 * Anchoring matches `src/backends/occt/occtBackend.ts`:
 *   - `box(w, h, t)` corner-anchored at the origin (spans [0,w]×[0,h]×[0,t]).
 *   - `cylinder(h, r)` axis along Z, base at z=0.
 *   - `sphere(r)` centered at the origin.
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

/**
 * Wrap a Replicad shape in a Proxy that adds v0.1's `subtract` / `union`
 * names (mapped to `cut` / `fuse`), redirects `translate` so it returns
 * a wrapped shape, and forwards everything else (notably `blobSTL`,
 * `blobSTEP`, `mesh`, `faces`) to the underlying shape unchanged.
 */
function wrap(raw: unknown): unknown {
  const target = raw as RawShape;
  return new Proxy(target, {
    get(t, prop, receiver) {
      if (prop === 'subtract') {
        return (...others: unknown[]) => {
          let out: unknown = t;
          for (const o of others) {
            const cut = (out as RawShape).cut.bind(out);
            out = cut(unwrap(o) as RawShape);
          }
          return wrap(out);
        };
      }
      if (prop === 'union') {
        return (...others: unknown[]) => {
          let out: unknown = t;
          for (const o of others) {
            const fuse = (out as RawShape).fuse.bind(out);
            out = fuse(unwrap(o) as RawShape);
          }
          return wrap(out);
        };
      }
      if (prop === 'intersect') {
        return (...others: unknown[]) => {
          let out: unknown = t;
          for (const o of others) {
            const intersect = (out as RawShape).intersect.bind(out);
            out = intersect(unwrap(o) as RawShape);
          }
          return wrap(out);
        };
      }
      if (prop === 'translate') {
        return (x: number, y: number, z: number) => wrap(t.translate(x, y, z));
      }
      if (prop === 'rotate' && typeof t.rotate === 'function') {
        return (axis: [number, number, number], degrees: number, pivot: [number, number, number] = [0, 0, 0]) =>
          wrap((t.rotate as NonNullable<RawShape['rotate']>)(degrees, pivot, axis));
      }
      // unwrap() sentinel — used internally to recover the raw shape from a proxy.
      if (prop === '__v01Raw__') {
        return t;
      }
      const value = Reflect.get(t, prop, receiver);
      // Bind methods so callers don't see the proxy as `this`.
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(t) : value;
    },
  });
}

function unwrap(maybeProxy: unknown): unknown {
  if (maybeProxy && typeof maybeProxy === 'object' && '__v01Raw__' in (maybeProxy as Record<string, unknown>)) {
    return (maybeProxy as Record<string, unknown>).__v01Raw__;
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
