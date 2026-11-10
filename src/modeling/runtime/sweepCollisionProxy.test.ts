// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Conservative sweep proxies: exact-geometry enclosure, inclusive OBB SAT,
// and fail-closed bounds.

import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import type { Shape3D } from 'replicad';
import { initOcct, OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { SceneBackend, SceneBackendPart } from '../../kernel/backends/sceneBackend';
import { Transform } from '../../shared/runtime/se3';
import {
  SWEEP_PROXY_MARGIN_MM,
  SWEEP_PROXY_TOUCH_SLOP_MM,
  buildSweepProxies,
  collectSweepProxyCandidates,
  orientedBoxesCandidate,
  poseSweepProxy,
  type OrientedBox,
  type SweepProxy,
} from './sweepCollisionProxy';

beforeAll(async () => {
  await initOcct();
});

function scene(parts: readonly SceneBackendPart[]): SceneBackend {
  return { target: 'occt', assemblyName: 'proxy', parts, _kind: 'scene' };
}

function part(name: string, shape: OcctBackend, worldTransform: Transform = Transform.identity()): SceneBackendPart {
  return { name, shape, worldTransform };
}

function edgeSamples(body: OcctBackend): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = [];
  for (const edge of body.getReplicadShape().edges) {
    for (let step = 0; step <= 24; step++) {
      const point = edge.pointAt(step / 24);
      points.push([point.x, point.y, point.z]);
    }
  }
  return points;
}

function insideLocal(proxy: SweepProxy, point: readonly [number, number, number]): boolean {
  const min = proxy.localMin;
  const max = proxy.localMax;
  if (min === undefined || max === undefined) return false;
  return point.every((value, axis) => value >= min[axis]! - 1e-6 && value <= max[axis]! + 1e-6);
}

function insideObb(box: OrientedBox, point: readonly [number, number, number]): boolean {
  const delta = [point[0] - box.center[0], point[1] - box.center[1], point[2] - box.center[2]];
  return box.axes.every((axis, index) => {
    const projected = Math.abs(delta[0]! * axis[0] + delta[1]! * axis[1] + delta[2]! * axis[2]);
    return projected <= box.half[index]! + 1e-6;
  });
}

function offChord(body: OcctBackend): boolean {
  for (const edge of body.getReplicadShape().edges) {
    const a = edge.pointAt(0);
    const b = edge.pointAt(0.5);
    const mid = edge.pointAt(0.25);
    const ab = [b.x - a.x, b.y - a.y, b.z - a.z];
    const am = [mid.x - a.x, mid.y - a.y, mid.z - a.z];
    const abLen = Math.hypot(ab[0]!, ab[1]!, ab[2]!);
    if (abLen < 1e-9) continue;
    const scale = (am[0]! * ab[0]! + am[1]! * ab[1]! + am[2]! * ab[2]!) / (abLen * abLen);
    const closest = [a.x + ab[0]! * scale, a.y + ab[1]! * scale, a.z + ab[2]! * scale];
    const gap = Math.hypot(mid.x - closest[0]!, mid.y - closest[1]!, mid.z - closest[2]!);
    if (gap > 0.2) return true;
  }
  return false;
}

describe('sweep collision proxies', () => {
  it('encloses curved and spline edges sampled from the OCCT geometry', () => {
    const cylinder = OcctBackend.cylinder(10, 5);
    const spline = new OcctBackend(replicad.draw([0, 0]).smoothSplineTo([12, 6]).lineTo([12, 0]).close().sketchOnPlane().extrude(4) as Shape3D);
    expect(offChord(cylinder)).toBe(true);
    expect(offChord(spline)).toBe(true);

    const posed = Transform.translation(3, 4, 5).compose(Transform.rotationAxisAngleDeg([1, 1, 0], 30));
    for (const body of [cylinder, spline]) {
      const proxy = buildSweepProxies(scene([part('body', body)]))[0]!;
      expect(proxy.valid).toBe(true);
      const samples = edgeSamples(body);
      expect(samples.length).toBeGreaterThan(8);
      for (const sample of samples) expect(insideLocal(proxy, sample)).toBe(true);
      const box = poseSweepProxy(proxy, posed);
      expect(box).toBeDefined();
      for (const sample of samples) expect(insideObb(box!, posed.point(sample))).toBe(true);
      for (let axis = 0; axis < 3; axis++) {
        expect(box!.half[axis]!).toBeGreaterThanOrEqual((proxy.localMax![axis]! - proxy.localMin![axis]!) / 2 - 1e-9);
      }
    }

    const round = buildSweepProxies(scene([part('cylinder', cylinder)]))[0]!;
    expect(round.localMin![0]!).toBeLessThanOrEqual(-5 - SWEEP_PROXY_MARGIN_MM + 1e-6);
    expect(round.localMax![0]!).toBeGreaterThanOrEqual(5 + SWEEP_PROXY_MARGIN_MM - 1e-6);
    expect(round.localMin![2]!).toBeLessThanOrEqual(-SWEEP_PROXY_MARGIN_MM + 1e-6);
    expect(round.localMax![2]!).toBeGreaterThanOrEqual(10 + SWEEP_PROXY_MARGIN_MM - 1e-6);
  }, 20_000);

  it('prunes a rotated box whose world AABB still overlaps, and keeps a real hit', () => {
    const box = () => OcctBackend.box(4, 4, 4, true);
    const spin = (x: number, y: number) =>
      Transform.translation(x, y, 0).compose(Transform.rotationAxisAngleDeg([0, 0, 1], 45));
    const separated = scene([
      part('a', box()),
      part('b', box(), spin(4, 4)),
    ]);
    expect(collectSweepProxyCandidates(buildSweepProxies(separated), separated)).toEqual([]);

    const penetrating = scene([
      part('a', box()),
      part('b', box(), spin(2, 2)),
    ]);
    const hit = collectSweepProxyCandidates(buildSweepProxies(penetrating), penetrating);
    expect(hit.map((pair) => [pair.a, pair.b])).toEqual([['a', 'b']]);
  }, 20_000);

  it('counts exact touching as a candidate and a real gap as apart', () => {
    const touching = scene([
      part('a', OcctBackend.box(10, 10, 10)),
      part('b', OcctBackend.box(10, 10, 10).translate(10, 0, 0)),
    ]);
    expect(collectSweepProxyCandidates(buildSweepProxies(touching), touching)).toHaveLength(1);

    const apart = scene([
      part('a', OcctBackend.box(10, 10, 10)),
      part('b', OcctBackend.box(10, 10, 10).translate(11, 0, 0)),
    ]);
    expect(collectSweepProxyCandidates(buildSweepProxies(apart), apart)).toEqual([]);
  }, 20_000);

  it('keeps a pair whose separation equals the touch slop, and drops one just past it', () => {
    const axis = [1, 0, 0] as const;
    const axes = [axis, [0, 1, 0], [0, 0, 1]] as OrientedBox['axes'];
    const half = [1, 1, 1] as const;
    const left: OrientedBox = { center: [0, 0, 0], axes, half };
    const touch: OrientedBox = { center: [2 + SWEEP_PROXY_TOUCH_SLOP_MM, 0, 0], axes, half };
    const past: OrientedBox = { center: [2 + SWEEP_PROXY_TOUCH_SLOP_MM + 1e-6, 0, 0], axes, half };
    expect(orientedBoxesCandidate(left, touch)).toBe(true);
    expect(orientedBoxesCandidate(left, past)).toBe(false);
  });

  it('treats an invalid proxy as overlapping every pair, and still prunes two valid parts', () => {
    const oc = replicad.getOC() as {
      TopoDS_Compound: new () => object;
      TopoDS_Builder: new () => { MakeCompound: (compound: object) => void };
    };
    const compound = new oc.TopoDS_Compound();
    new oc.TopoDS_Builder().MakeCompound(compound);
    const bad = new OcctBackend((replicad as unknown as { cast: (shape: object) => Shape3D }).cast(compound));
    const layout = scene([
      part('a', OcctBackend.box(10, 10, 10)),
      part('b', OcctBackend.box(10, 10, 10).translate(40, 0, 0)),
      part('bad', bad),
    ]);
    const proxies = buildSweepProxies(layout);
    expect(proxies.find((proxy) => proxy.name === 'bad')?.valid).toBe(false);
    const names = collectSweepProxyCandidates(proxies, layout).map((pair) => `${pair.a}/${pair.b}`).sort();
    expect(names).toEqual(['a/bad', 'b/bad']);
  }, 20_000);
});
