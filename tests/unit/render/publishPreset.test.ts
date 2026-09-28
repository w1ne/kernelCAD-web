// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/render/publishPreset.test.ts
//
// The 'publish' render preset's pure parts: backdrop parsing, supersample
// sizing, the seamless turntable schedule, the az/el convention, and — the
// framing contract — that the page's camera fit keeps every model-bounds
// corner inside the frame with the preset margin, for a single pose and for
// every azimuth of an orbit.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  PUBLISH_PRESET,
  parsePublishBackground,
  poseCameraDir,
  publishSupersample,
  turntableAzimuths,
} from '../../../src/shared/render/publishPreset';
import { PUBLISH_FOV_DEG } from '../../../src/studio/components/demoPlayer/publishStage';
import { frameForRequest } from '../../../src/studio/components/demoPlayer/publishFraming';

describe('publish preset — parameters', () => {
  it('normalises backdrops: named, hex, short hex, transparent; rejects junk', () => {
    expect(parsePublishBackground(undefined)).toBe('#ffffff');
    expect(parsePublishBackground('white')).toBe('#ffffff');
    expect(parsePublishBackground('Transparent')).toBe('transparent');
    expect(parsePublishBackground('#F5F5F0')).toBe('#f5f5f0');
    expect(parsePublishBackground('#abc')).toBe('#aabbcc');
    expect(parsePublishBackground('red')).toBeUndefined();
    expect(parsePublishBackground('#12345')).toBeUndefined();
  });

  it('supersamples 2× up to the largest tile and never exceeds the canvas cap', () => {
    expect(publishSupersample(1600, 1200)).toBe(2);
    expect(publishSupersample(2048, 2048)).toBe(2);
    expect(publishSupersample(64, 64)).toBe(2);
    for (const edge of [64, 777, 1600, 2048]) {
      expect(edge * publishSupersample(edge, edge)).toBeLessThanOrEqual(PUBLISH_PRESET.maxCanvasEdge);
    }
  });

  it('az/el follows the setRenderPose convention (az=0 is the front view, camera on -Y)', () => {
    const front = poseCameraDir(0, 0);
    expect(front[0]).toBeCloseTo(0, 12);
    expect(front[1]).toBeCloseTo(-1, 12);
    expect(front[2]).toBeCloseTo(0, 12);
    const right = poseCameraDir(90, 0);
    expect(right[0]).toBeCloseTo(1, 12);
    const up = poseCameraDir(0, 90);
    expect(up[2]).toBeCloseTo(1, 12);
  });

  it('turntable azimuths are evenly spaced and exclude the 360° endpoint (seamless loop)', () => {
    const az = turntableAzimuths(8, 30);
    expect(az).toEqual([30, 75, 120, 165, 210, 255, 300, 345]);
    // The step from the last frame back to the first equals every other step.
    expect(az[0] + 360 - az[az.length - 1]).toBe(az[1] - az[0]);
  });
});

type Vec3 = [number, number, number];

/** NDC of `points` seen by a camera placed per `framing`. */
function projectNdc(points: readonly Vec3[], framing: { target: Vec3; camDir: Vec3; distance: number }, aspect: number): THREE.Vector3[] {
  const camera = new THREE.PerspectiveCamera(PUBLISH_FOV_DEG, aspect, 0.01, 1e6);
  const { target: t, camDir: d, distance } = framing;
  camera.up.set(0, 0, 1);
  camera.position.set(t[0] + d[0] * distance, t[1] + d[1] * distance, t[2] + d[2] * distance);
  camera.lookAt(t[0], t[1], t[2]);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return points.map((p) => new THREE.Vector3(...p).project(camera));
}

/** An L-shaped part (tall off-centre post on a wide plate) as a point
 *  cloud: its bbox has big empty corners, so a bbox fit would not centre it. */
function lPartPoints(): Vec3[] {
  const pts: Vec3[] = [];
  const box = (min: Vec3, max: Vec3) => {
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) pts.push([x, y, z]);
  };
  box([-40, 10, 0], [25, 70, 8]);
  box([-35, 15, 8], [-20, 30, 120]);
  return pts;
}

const LIMIT = 1 / PUBLISH_PRESET.margin;
const lens = (w: number, h: number) => ({ fovYDeg: PUBLISH_FOV_DEG, aspect: w / h, margin: PUBLISH_PRESET.margin });

describe('publish preset — framing keeps the model in bounds with margin', () => {
  const points = lPartPoints();

  for (const [w, h] of [[1600, 1200], [1080, 1080], [800, 1400]] as const) {
    it(`hero pose at ${w}×${h}: silhouette inside 1/margin on every side, centred, binding side on the line`, () => {
      const req = { width: w, height: h, supersample: 1, margin: PUBLISH_PRESET.margin, azDeg: PUBLISH_PRESET.heroAzDeg, elDeg: PUBLISH_PRESET.heroElDeg };
      const ndc = projectNdc(points, frameForRequest(points, req, lens(w, h)), w / h);
      const xs = ndc.map((p) => p.x);
      const ys = ndc.map((p) => p.y);
      for (const p of ndc) {
        expect(Math.abs(p.x)).toBeLessThanOrEqual(LIMIT + 1e-9);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(LIMIT + 1e-9);
      }
      // Centred: equal air on opposite sides (within 1% of the frame).
      expect(Math.abs(Math.min(...xs) + Math.max(...xs))).toBeLessThan(0.02);
      expect(Math.abs(Math.min(...ys) + Math.max(...ys))).toBeLessThan(0.02);
      // Tight, not loose: the binding extent lands on the margin line.
      const extent = Math.max(...ndc.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
      expect(extent).toBeGreaterThan(LIMIT - 0.01);
    });
  }

  it('orbit fit: one distance keeps the model in frame at every azimuth of the loop', () => {
    const base = { width: 1080, height: 1080, supersample: 1, margin: PUBLISH_PRESET.margin, elDeg: 22, fit: 'orbit' as const };
    const distances = new Set<number>();
    // 7° steps are deliberately not a divisor of the 5° polygon pitch.
    for (const az of turntableAzimuths(51, 3)) {
      const framing = frameForRequest(points, { ...base, azDeg: az }, lens(1080, 1080));
      distances.add(framing.distance);
      for (const p of projectNdc(points, framing, 1)) {
        expect(Math.abs(p.x)).toBeLessThanOrEqual(LIMIT + 1e-9);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(LIMIT + 1e-9);
      }
    }
    // Constant camera distance → no zoom pumping across the loop.
    expect(distances.size).toBe(1);
  });
});
