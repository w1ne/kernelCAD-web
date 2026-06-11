// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Perspective-fit math shared by the demo player's engineering-view camera
// (fitCameraToBounds / setRenderView) and arbitrary-pose camera
// (setRenderPose). Computes the camera distance at which all eight bounds
// corners fit inside the frustum with a margin — compensating per-corner
// depth (near corners subtend a larger angle) and an output crop aspect
// that differs from the canvas aspect.

export interface FitBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface FitDistanceInput {
  bounds: FitBounds;
  /** Camera look-at target (world). */
  target: [number, number, number];
  /** Unit vector from target TOWARD the camera. */
  camDir: [number, number, number];
  /** World up for the screen basis. Pass [0, 1, 0] when camDir ∥ ±Z
   *  (top view); default [0, 0, 1] (kernelCAD is Z-up). */
  worldUp?: [number, number, number];
  fovYDeg: number;
  /** camera.aspect of the render canvas. */
  canvasAspect: number;
  /** Aspect of the centered region cropped out of the canvas for the
   *  output tile. Defaults to canvasAspect (no crop). */
  outputAspect?: number;
  /** Fill margin: 1.05 leaves ~5% air on the binding axis. */
  margin?: number;
}

export function fitDistanceForBounds(input: FitDistanceInput): number {
  const { bounds, target, camDir } = input;
  const worldUp = input.worldUp ?? ([0, 0, 1] as [number, number, number]);
  const margin = input.margin ?? 1.05;
  const outputAspect = input.outputAspect ?? input.canvasAspect;

  // Screen basis: right = worldUp × camDir, up = camDir × right.
  const right = normalize(cross(worldUp, camDir));
  const up = normalize(cross(camDir, right));

  // Effective half-angles of the centered output-aspect crop region.
  const tanHalfY = Math.tan((input.fovYDeg * Math.PI) / 360);
  const tanYEff = tanHalfY * Math.min(1, input.canvasAspect / outputAspect);
  const tanXEff = tanHalfY * Math.min(input.canvasAspect, outputAspect);

  const xs = [bounds.min[0] - target[0], bounds.max[0] - target[0]];
  const ys = [bounds.min[1] - target[1], bounds.max[1] - target[1]];
  const zs = [bounds.min[2] - target[2], bounds.max[2] - target[2]];
  let dist = 0;
  for (const cx of xs) for (const cy of ys) for (const cz of zs) {
    const h = Math.abs(cx * right[0] + cy * right[1] + cz * right[2]);
    const u = Math.abs(cx * up[0] + cy * up[1] + cz * up[2]);
    // Corner depth along the view axis, positive toward the camera — each
    // corner must fit the frustum at its OWN depth, not the target's.
    const dAlong = cx * camDir[0] + cy * camDir[1] + cz * camDir[2];
    const required = Math.max(h / tanXEff, u / tanYEff) * margin + dAlong;
    if (required > dist) dist = required;
  }
  return dist;
}

function cross(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 1];
}
