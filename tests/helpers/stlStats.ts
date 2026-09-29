// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Parse a binary STL: connected components (over shared vertex positions),
 *  enclosed volume (divergence theorem) and bounding box. */
export interface StlStats {
  components: number;
  volume: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

export function stlStats(bytes: Uint8Array): StlStats {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = view.getUint32(80, true);
  const ids = new Map<string, number>();
  const parent: number[] = [];
  const find = (a: number): number => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  const vid = (x: number, y: number, z: number): number => {
    const key = `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = parent.length;
      parent.push(id);
      ids.set(key, id);
    }
    return id;
  };
  let volume = 0;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let t = 0; t < n; t += 1) {
    const o = 84 + t * 50 + 12;
    const p = [0, 1, 2].map((k) => [0, 1, 2].map((c) => view.getFloat32(o + k * 12 + c * 4, true)));
    for (const q of p) {
      for (let k = 0; k < 3; k += 1) {
        min[k] = Math.min(min[k], q[k]);
        max[k] = Math.max(max[k], q[k]);
      }
    }
    const [a, b, c] = p;
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    const [ia, ib, ic] = p.map(([x, y, z]) => vid(x, y, z));
    parent[find(ib)] = find(ia);
    parent[find(ic)] = find(ia);
  }
  const roots = new Set(parent.map((_, i) => find(i)));
  return { components: roots.size, volume: Math.abs(volume), bbox: { min, max } };
}
