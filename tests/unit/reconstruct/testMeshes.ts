// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/reconstruct/testMeshes.ts
//
// Deterministic triangle soups for exercising the reconstruction pipeline
// without OCCT: an axis-aligned box and a smooth, organic blob that no plane or
// cylinder describes. Also a seeded vertex jitter that moves shared corners
// together (so a jittered mesh stays watertight, like a real scan).

import type { TriangleSoup } from '../../../src/agent/reconstruct/meshIO';

export function boxSoup(sx: number, sy: number, sz: number, origin: [number, number, number] = [0, 0, 0]): TriangleSoup {
  const [ox, oy, oz] = origin;
  const p = (x: number, y: number, z: number) => [ox + x * sx, oy + y * sy, oz + z * sz];
  const quads: number[][][] = [
    [p(0, 0, 0), p(0, 1, 0), p(1, 1, 0), p(1, 0, 0)], // bottom (−z)
    [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)], // top (+z)
    [p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)], // −y
    [p(0, 1, 0), p(0, 1, 1), p(1, 1, 1), p(1, 1, 0)], // +y
    [p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)], // −x
    [p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)], // +x
  ];
  const out: number[] = [];
  for (const [a, b, c, d] of quads) out.push(...a, ...b, ...c, ...a, ...c, ...d);
  return { positions: Float64Array.from(out), format: 'stl', unitDeclared: false };
}

/** A lumpy closed surface: radius varies smoothly with both angles. */
export function blobSoup(nu = 48, nv = 24): TriangleSoup {
  const P = (i: number, j: number) => {
    const th = (i / nu) * 2 * Math.PI;
    const ph = (j / nv) * Math.PI;
    const r = 20 + 3 * Math.sin(3 * th) * Math.sin(ph) ** 2 + 2 * Math.cos(2 * ph);
    return [r * Math.sin(ph) * Math.cos(th), 0.8 * r * Math.sin(ph) * Math.sin(th), 1.2 * r * Math.cos(ph)];
  };
  const out: number[] = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      if (j !== 0) out.push(...a, ...d, ...b);
      if (j !== nv - 1) out.push(...b, ...d, ...c);
    }
  }
  return { positions: Float64Array.from(out), format: 'stl', unitDeclared: false };
}

/** Uniform ±amplitude noise per distinct vertex position, from a fixed seed. */
export function jitterSoup(soup: TriangleSoup, amplitude: number, seed = 7): TriangleSoup {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const offsets = new Map<string, [number, number, number]>();
  const out = new Float64Array(soup.positions.length);
  for (let i = 0; i < soup.positions.length; i += 3) {
    const key = `${soup.positions[i].toFixed(5)},${soup.positions[i + 1].toFixed(5)},${soup.positions[i + 2].toFixed(5)}`;
    let d = offsets.get(key);
    if (!d) {
      d = [(rand() * 2 - 1) * amplitude, (rand() * 2 - 1) * amplitude, (rand() * 2 - 1) * amplitude];
      offsets.set(key, d);
    }
    out[i] = soup.positions[i] + d[0];
    out[i + 1] = soup.positions[i + 1] + d[1];
    out[i + 2] = soup.positions[i + 2] + d[2];
  }
  return { ...soup, positions: out };
}
