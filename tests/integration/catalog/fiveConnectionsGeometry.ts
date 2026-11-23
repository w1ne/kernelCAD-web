// SPDX-License-Identifier: MIT
// Native exported geometry checks for five static scene props. No load, motion,
// manufacturing, electrical or magnetic-performance claim is made here.
import { NodeIO } from '@gltf-transform/core';

type Vec = [number, number, number];
type Triangle = [Vec, Vec, Vec];
export type MeshPart = { min: Vec; max: Vec; triangles: Triangle[] };
export type PartMap = Map<string, MeshPart>;
export type ConnectionReport = {
  id: string; partCount: number; triangleCount: number; failures: string[];
  measurements: Record<string, number>;
  witnesses: { label: string; a: string; b: string; pointMm: Vec; insideA: boolean; insideB: boolean }[];
};

/** Catalog GLBs are metres/Y-up; return authored millimetres/Z-up. */
export async function readConnectionParts(bytes: Uint8Array): Promise<PartMap> {
  const doc = await new NodeIO().readBinary(bytes), result: PartMap = new Map();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const name = node.getName(), matrix = node.getWorldMatrix();
    if (!name || result.has(name)) throw new Error('Missing or duplicate mesh part name: ' + name);
    const triangles: Triangle[] = [], min: Vec = [Infinity, Infinity, Infinity], max: Vec = [-Infinity, -Infinity, -Infinity];
    for (const primitive of mesh.listPrimitives()) {
      if (primitive.getMode() !== 4) throw new Error('Non-triangle primitive: ' + name);
      const positions = primitive.getAttribute('POSITION');
      if (!positions || positions.getCount() === 0) throw new Error('Empty positions: ' + name);
      const points: Vec[] = [];
      for (let i = 0; i < positions.getCount(); i++) {
        const p = positions.getElement(i, []);
        const w = [0, 1, 2].map(a => matrix[a]! * p[0]! + matrix[a + 4]! * p[1]! + matrix[a + 8]! * p[2]! + matrix[a + 12]!);
        const q: Vec = [w[0]! * 1000, -w[2]! * 1000, w[1]! * 1000];
        if (!q.every(Number.isFinite)) throw new Error('Non-finite vertex: ' + name);
        for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a]!, q[a]!); max[a] = Math.max(max[a]!, q[a]!); }
        points.push(q);
      }
      const index = primitive.getIndices(), count = index?.getCount() ?? points.length;
      if (count === 0 || count % 3 !== 0) throw new Error('Invalid triangle index count: ' + name);
      for (let i = 0; i < count; i += 3) {
        const ids = [0, 1, 2].map(k => index ? index.getScalar(i + k) : i + k);
        if (!ids.every(k => Number.isSafeInteger(k) && k >= 0 && k < points.length)) throw new Error('Invalid triangle index: ' + name);
        triangles.push(ids.map(k => points[k]!) as Triangle);
      }
    }
    if (!triangles.length || !min.every(Number.isFinite) || !max.every(Number.isFinite)) throw new Error('Empty mesh: ' + name);
    result.set(name, { min, max, triangles });
  }
  if (!result.size) throw new Error('No named mesh parts');
  return result;
}
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Odd/even ray test against actual exported triangles, not AABB overlap. */
export function containsPoint(part: MeshPart | undefined, point: Vec): boolean {
  if (!part || point.some((p, a) => p < part.min[a]! - 1e-5 || p > part.max[a]! + 1e-5)) return false;
  const direction: Vec = [1, 0.3713906763541037, 0.5291502622129182], hits: number[] = [];
  for (const [a, b, c] of part.triangles) {
    const ab = sub(b, a), ac = sub(c, a), h = cross(direction, ac), det = dot(ab, h);
    if (Math.abs(det) < 1e-10) continue;
    const s = sub(point, a), u = dot(s, h) / det;
    if (u < -1e-9 || u > 1 + 1e-9) continue;
    const q = cross(s, ab), v = dot(direction, q) / det;
    if (v < -1e-9 || u + v > 1 + 1e-9) continue;
    const t = dot(ac, q) / det; if (t > 1e-7) hits.push(t);
  }
  hits.sort((a, b) => a - b);
  return hits.filter((t, i) => i === 0 || Math.abs(t - hits[i - 1]!) > 1e-5).length % 2 === 1;
}

export function checkConnectionParts(id: string, parts: PartMap, values: Record<string, number | string | boolean> = {}): ConnectionReport {
  const scale = typeof values.scale === 'number' ? values.scale : 1;
  const report: ConnectionReport = { id, partCount: parts.size, triangleCount: [...parts.values()].reduce((n, p) => n + p.triangles.length, 0), failures: [], measurements: {}, witnesses: [] };
  const fail = (code: string) => { if (!report.failures.includes(code)) report.failures.push(code); };
  const near = (label: string, actual: number, expected: number, tolerance = .08) => {
    report.measurements[label] = actual; if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance * scale) fail(label);
  };
  const witness = (label: string, a: string, b: string, p: Vec) => {
    const pointMm = p.map(v => v * scale) as Vec;
    const insideA = containsPoint(parts.get(a), pointMm), insideB = containsPoint(parts.get(b), pointMm);
    report.witnesses.push({ label, a, b, pointMm, insideA, insideB });
    if (!insideA || !insideB) fail(label);
  };
  const gap = (label: string, left: string, right: string, axis: number, minimum: number) => {
    const a = parts.get(left), b = parts.get(right);
    const distance = a && b ? b.min[axis]! - a.max[axis]! : NaN;
    report.measurements[label] = distance;
    if (!Number.isFinite(distance) || distance < minimum * scale - .08 * scale) fail(label);
  };
  const extent = (name: string, axis: number) => { const p = parts.get(name); return p ? p.max[axis]! - p.min[axis]! : NaN; };
  if (id === 'belt-magnet-separator') {
    const self = (values.magnetType ?? 'selfCleaning') === 'selfCleaning';
    if (self) {
      for (const [k, s] of [-1, 1].entries()) {
        for (const [j, y] of [-600, 600].entries()) {
          const bar = 'magnet-support-' + k + '-' + j;
          witness(bar + '-body', bar, 'magnet-block', [s * 550, y, 1970]);
          witness(bar + '-frame', bar, 'side-frame-' + k, [s * 670, y, 1970]);
          gap(bar + '-lower-clearance', 'cleaning-belt-lower', bar, 2, 180);
          gap(bar + '-upper-clearance', bar, 'cleaning-belt-upper', 2, 180);
        }
        for (const [j, y] of [-1050, 1050].entries()) {
          const axle = 'magnet-pulley-axle-' + j;
          witness(axle + '-pulley', axle, 'magnet-pulley-' + j, [0, y, 1970]);
          witness(axle + '-frame-' + k, axle, 'side-frame-' + k, [s * 680, y, 1970]);
        }
      }
    } else {
      if (parts.has('cleaning-belt-upper') || parts.has('side-frame-0')) fail('plate-branch-has-cleaning-belt');
    }
    for (let k = 0; k < 4; k++) {
      const sx = k % 2 === 0 ? -1 : 1, sy = k < 2 ? -1 : 1;
      const x = sx * (self ? 690 : 560), y = sy * 760, top = self ? 2310 : 2350;
      const lug = 'lifting-lug-' + k, chain = 'chain-' + k;
      if (self) {
        witness(lug + '-frame', lug, 'side-frame-' + (sx < 0 ? 0 : 1), [x, y, 2110]);
        gap(lug + '-belt-clearance', sx < 0 ? lug : 'cleaning-belt-upper', sx < 0 ? 'cleaning-belt-upper' : lug, 0, 10);
        const oldCollision: Vec = [sx * 560 * scale, sy * 760 * scale, 2200 * scale];
        if (containsPoint(parts.get(lug), oldCollision) && containsPoint(parts.get('cleaning-belt-upper'), oldCollision)) fail(lug + '-belt-solid-overlap');
      } else witness(lug + '-fin', lug, 'cooling-fin-' + (sy < 0 ? 0 : 8), [x, sy * 728, 2250]);
      const dx = sx * 950 - x, dy = sy * 1350 - y, horizontal = Math.hypot(dx, dy);
      witness(chain + '-lug', chain, lug, [x + dx / horizontal * 10, y + dy / horizontal * 10, top - 2]);
      witness(chain + '-runner', chain, 'gantry-runner-' + (sy < 0 ? 0 : 1), [sx * 950 - dx / horizontal * 10, sy * 1350 - dy / horizontal * 10, 3662]);
    }
  } else if (id === 'inline-skate') {
    const wheels = [-121.5, -40.5, 40.5, 121.5];
    for (let i = 0; i < 4; i++) {
      const name = 'wheel-' + (i + 1), wheel = parts.get(name);
      near(name + '-diameter', extent(name, 0), 80 * scale, .2);
      near(name + '-ground', wheel?.min[2] ?? NaN, 0, .2);
      if (i < 3) gap(name + '-running-clearance', name, 'wheel-' + (i + 2), 0, 1);
      for (const [side, s] of [['left', -1], ['right', 1]] as const) {
        witness('axle-' + (i + 1) + '-' + side, 'axle-bolt-' + (i + 1), 'frame-rail-' + side, [wheels[i]!, s * 16.5, 40]);
        gap(name + '-rail-clearance-' + side, s < 0 ? 'frame-rail-left' : name, s < 0 ? name : 'frame-rail-right', 1, 2);
      }
    }
    near('wheelbase', ((parts.get('wheel-4')?.min[0] ?? NaN) + (parts.get('wheel-4')?.max[0] ?? NaN) - (parts.get('wheel-1')?.min[0] ?? NaN) - (parts.get('wheel-1')?.max[0] ?? NaN)) / 2, 243 * scale, .2);
    for (const [side, s] of [['left', -1], ['right', 1]] as const) {
      const arm = 'brake-arm-' + side;
      witness(arm + '-axle', arm, 'axle-bolt-4', [123.5, s * 16.5, 42]);
      witness(arm + '-rail', arm, 'frame-rail-' + side, [123.5, s * 17, 60]);
      witness(arm + '-pad', arm, 'brake-pad', [186.5, s * 14.75, 46]);
      gap(arm + '-tyre-clearance', s < 0 ? arm : 'wheel-4', s < 0 ? 'wheel-4' : arm, 1, 2.5);
      const a = parts.get(arm), rail = parts.get('frame-rail-' + side);
      near(arm + '-outer-face-step', a && rail ? (s < 0 ? rail.min[1] - a.min[1] : a.max[1] - rail.max[1]) : NaN, 0.5 * scale);
      near(arm + '-inner-face-step', a && rail ? (s < 0 ? rail.max[1] - a.max[1] : a.min[1] - rail.min[1]) : NaN, 0.5 * scale);
    }
    gap('brake-pad-tyre-clearance', 'wheel-4', 'brake-pad', 0, 4);
    const originalOverlap: Vec = [0, 0, 40 * scale];
    if (containsPoint(parts.get('wheel-2'), originalOverlap) && containsPoint(parts.get('wheel-3'), originalOverlap)) fail('middle-wheel-solid-overlap');
  } else if (id === 'strip-light-battens') {
    for (const [unit, xc] of [['left', -1130], ['centre', 0], ['right', 1130]] as const) {
      for (const [end, s] of [['l', -1], ['r', 1]] as const) {
        const axle = 'pivot-axle-' + unit + '-' + end;
        witness(axle + '-cap', axle, 'end-cap-' + unit + '-' + end, [xc + s * 514, 0, 230]);
        witness(axle + '-stand', axle, 'stand-upright-' + unit + '-' + end, [xc + s * 538, 0, 230]);
        witness(axle + '-knob', axle, 'pivot-knob-' + unit + '-' + end, [xc + s * 549, 0, 230]);
      }
    }
  } else if (id === 'blackout-curtain-drive') {
    for (const x of [-830, 830]) {
      const bearing = 'bearing-' + x, arm = 'bearing-arm-' + x, hanger = 'bearing-hanger-' + x;
      witness(bearing + '-shaft', bearing, 'drive-shaft', [x, 740, 1860]);
      witness(arm + '-bearing', arm, bearing, [x, 760, 1860]);
      witness(hanger + '-arm', hanger, arm, [x, 840, 1860]);
      witness(hanger + '-truss', hanger, 'truss-bottom', [x, 840, 1990]);
    }
    witness('gearbox-mount-gearbox', 'gearbox-mount', 'gearbox', [0, 810, 1960]);
    witness('gearbox-mount-truss', 'gearbox-mount', 'truss-bottom', [0, 840, 1990]);
    const leading = values.screenPosition === 'open' ? 600 : values.screenPosition === 'closed' ? -820 : -100;
    for (const x of [-500, 500]) {
      const rack = 'rack-' + x, box = 'pinion-box-' + x, r = parts.get(rack), p = parts.get(box);
      witness(rack + '-engagement', rack, box, [x, 740, 1845]);
      near(rack + '-length', extent(rack, 1), 1680 * scale);
      near(rack + '-leading-edge', r?.min[1] ?? NaN, leading * scale);
      const margin = r && p ? Math.min(p.min[1] - r.min[1], r.max[1] - p.max[1]) : NaN;
      report.measurements[rack + '-box-margin'] = margin;
      if (!Number.isFinite(margin) || margin < -0.08 * scale) fail(rack + '-box-outside-travel');
    }
  } else if (id === 'roll-cage-trolley') {
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const tag = (sx! < 0 ? 'l' : 'r') + (sy! < 0 ? 'f' : 'b'), x = sx! * 330, y = sy! * 280;
      const axle = 'castor-axle-' + tag, wheel = 'castor-wheel-' + tag;
      witness(axle + '-wheel', axle, wheel, [x, y + 12, 50]);
      for (const [side, sign] of [['l', -1], ['r', 1]] as const)
        witness(axle + '-fork-' + side, axle, 'castor-fork-' + side + '-' + tag, [x + sign * 24, y + 12, 50]);
      near(wheel + '-ground', parts.get(wheel)?.min[2] ?? NaN, 0, .2);
      near(wheel + '-width', extent(wheel, 0), 34 * scale);
    }
    if (parts.has('shelf-frame') !== ((values.shelf ?? 'shelf') === 'shelf')) fail('shelf-choice');
  } else throw new Error('Unknown connection fixture: ' + id);
  return report;
}
