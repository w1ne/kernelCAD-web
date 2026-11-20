// SPDX-License-Identifier: MIT
// Exact named-part and mesh checks for a low-poly scene prop, not farm hardware.
import { readConnectionParts, containsPoint, type PartMap, type MeshPart } from './fiveConnectionsGeometry';
import contract from '../../fixtures/catalog/hydroponicGrowRackContract.json';

export { readConnectionParts as readGrowRackParts };
export type GrowRackReport = {
  partCount: number; triangleCount: number; zeroAreaTriangles: number;
  boundsMm: { min: number[]; max: number[] }; failures: string[];
  points: { label: string; name: string; pointMm: number[]; inside: boolean; expectedInside: boolean }[];
  heads: { name: string; triangleCount: number; volumeMm3: number; expectedVolumeMm3: number }[];
};
const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]!);
const cross = (a: number[], b: number[]) => [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i]!, 0);
function volume(part: MeshPart): number {
  const origin = part.min.map((v, i) => (v + part.max[i]!) / 2);
  return part.triangles.reduce((sum, [a, b, c]) => sum + dot(sub(a, origin), cross(sub(b, origin), sub(c, origin))) / 6, 0);
}

export function checkGrowRackParts(parts: PartMap, values: Record<string, string | number | boolean> = {}): GrowRackReport {
  const scale = typeof values.scale === 'number' ? values.scale : 1;
  const crop = typeof values.crop === 'string' ? values.crop : 'lettuce';
  const expectedTriangles: Record<string, number> = { lettuce: 7832, empty: 5672, microgreens: 3368 };
  const report: GrowRackReport = { partCount: parts.size, triangleCount: 0, zeroAreaTriangles: 0,
    boundsMm: { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }, failures: [], heads: [], points: [] };
  const fail = (code: string) => { if (!report.failures.includes(code)) report.failures.push(code); };
  const near = (code: string, actual: number, expected: number, tolerance = .08 * scale) => {
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) fail(code);
  };
  const expectedNames = new Set(contract.nonCropPartNames);
  const checkBox = (name: string, min: number[], max: number[]) => {
    expectedNames.add(name); const part = parts.get(name); if (!part) { fail(name + ':missing'); return; }
    for (let a = 0; a < 3; a++) { near(name + ':min-' + a, part.min[a]!, min[a]! * scale); near(name + ':max-' + a, part.max[a]!, max[a]! * scale); }
  };
  if (!Number.isFinite(scale) || scale < .7 || scale > 1.3 || !(crop in expectedTriangles)) fail('invalid-test-controls');
  for (const [name, part] of parts) {
    report.triangleCount += part.triangles.length;
    for (let a = 0; a < 3; a++) { report.boundsMm.min[a] = Math.min(report.boundsMm.min[a]!, part.min[a]!); report.boundsMm.max[a] = Math.max(report.boundsMm.max[a]!, part.max[a]!); }
    for (const [a, b, c] of part.triangles) {
      const n = cross(sub(b, a), sub(c, a));
      if (!n.every(Number.isFinite) || dot(n, n) <= 1e-12) report.zeroAreaTriangles++;
    }
    if (!Number.isFinite(volume(part)) || volume(part) <= 0) fail(name + ':nonpositive-volume');
  }
  for (let t = 0; t < 3; t++) for (let g = 0; g < 4; g++) {
    const z = [280, 950, 1620][t]!, y = [-270, -90, 90, 270][g]!;
    if (crop === 'microgreens') {
      const height = 30 + ((g + t) % 2) * 12;
      checkBox(`greens-mat-${t}-${g}`, [-1180, y - 52, z + 70], [1180, y + 52, z + 70 + height]);
      for (let s = 0; s < 4; s++) {
        const x = -840 + s * 560 + g * 60;
        checkBox(`greens-tuft-${t}-${g}-${s}`, [x - 160, y - 42, z + 100], [x + 160, y + 42, z + 126]);
      }
    } else for (let h = 0; h < 9; h++) {
      const k = t * 100 + g * 10 + h, x = (h - 4) * 240;
      if (crop === 'empty') {
        const name = `cup-${k}`;
        checkBox(name, [x - 32, y - 32, z + 70], [x + 32, y + 32, z + 78]);
        if (parts.get(name)?.triangles.length !== 28) fail(name + ':triangle-count');
      } else {
        const name = `head-${k}`, r = 78 + ((h * 5 + g * 3 + t) % 3) * 8, centerZ = z + 70 + r * .6 - 7.8;
        checkBox(name, [x - r, y - r, centerZ - .6 * r], [x + r, y + r, centerZ + .6 * r]);
        const head = parts.get(name); if (!head) continue;
        const actualVolume = volume(head), expectedVolume = 2.4 * (r * scale) ** 3;
        report.heads.push({ name, triangleCount: head.triangles.length, volumeMm3: actualVolume, expectedVolumeMm3: expectedVolume });
        if (head.triangles.length !== 48) fail(name + ':triangle-count');
        near(name + ':volume', actualVolume, expectedVolume, expectedVolume * .001);
      }
    }
  }
  const pointCheck = (label: string, name: string, point: [number, number, number], expectedInside: boolean) => {
    const pointMm = point.map(v => v * scale) as [number, number, number];
    const inside = containsPoint(parts.get(name), pointMm);
    report.points.push({ label, name, pointMm, inside, expectedInside });
    if (!parts.has(name) || inside !== expectedInside) fail(label);
  };
  const joint = (label: string, a: string, b: string, point: [number, number, number]) => {
    pointCheck(label + ':' + a, a, point, true);
    pointCheck(label + ':' + b, b, point, true);
  };
  for (let t = 0; t < 3; t++) for (let g = 0; g < 4; g++) {
    const z = [280, 950, 1620][t]!, y = [-270, -90, 90, 270][g]!;
    const gutter = 'gutter-' + t + '-' + g, lid = 'gutter-lid-' + t + '-' + g;
    checkBox(gutter, [-1250, y - 55, z], [1250, y + 55, z + 60]);
    checkBox(lid, [-1250, y - 62, z + 60], [1250, y + 62, z + 70]);
    for (const [name, expected] of [[gutter, 2_750_000], [lid, 1_980_000]] as const) {
      const part = parts.get(name);
      if (part) near(name + ':material-volume', volume(part), expected * scale ** 3, expected * scale ** 3 * .001);
    }
    for (const x of [-1249, 0, 1249]) {
      pointCheck(gutter + ':open-channel-' + x, gutter, [x, y, z + 30], false);
      pointCheck(gutter + ':floor-' + x, gutter, [x, y, z + 2.5], true);
      for (const sign of [-1, 1]) pointCheck(gutter + ':side-' + x + '-' + sign, gutter, [x, y + sign * 52.5, z + 30], true);
    }
    pointCheck(gutter + ':floor-inside', gutter, [0, y, z + 4.9], true);
    pointCheck(gutter + ':floor-outside', gutter, [0, y, z + 5.1], false);
    pointCheck(gutter + ':wall-inside', gutter, [0, y + 50.1, z + 30], true);
    pointCheck(gutter + ':wall-outside', gutter, [0, y + 49.9, z + 30], false);
    for (const sign of [-1, 1]) {
      pointCheck(lid + ':slot-side-void-' + sign, lid, [0, y + sign * 27.9, z + 65], false);
      pointCheck(lid + ':slot-side-solid-' + sign, lid, [0, y + sign * 28.1, z + 65], true);
      pointCheck(lid + ':slot-end-void-' + sign, lid, [sign * 999.9, y, z + 65], false);
      pointCheck(lid + ':slot-end-solid-' + sign, lid, [sign * 1000.1, y, z + 65], true);
    }
    for (let h = 0; h < 9; h++) {
      const x = (h - 4) * 240;
      for (const height of [62, 68]) pointCheck(lid + ':station-' + h + '-' + height, lid, [x, y, z + height], false);
      pointCheck(gutter + ':station-cavity-' + h, gutter, [x, y, z + 30], false);
      if (crop === 'lettuce') {
        const name = 'head-' + (t * 100 + g * 10 + h), head = parts.get(name);
        pointCheck(name + ':slot-section-inside', name, [x + 25.9, y, z + 70], true);
        pointCheck(name + ':slot-section-outside', name, [x + 26.1, y, z + 70], false);
        if (head && (head.min[1] < -364 * scale - .08 * scale || head.max[1] > 364 * scale + .08 * scale)) fail(name + ':middle-post-clearance');
      }
    }
  }
  for (const sign of [-1, 1]) {
    const name = 'upright-0-' + sign * 380, post = parts.get(name), foot = parts.get('foot-0-' + sign * 380);
    checkBox(name, [-30, sign * 400 - 30, 10], [30, sign * 400 + 30, 2100]);
    if (post && foot) {
      near(name + ':foot-plane', post.min[2], foot.max[2]);
      for (const axis of [0, 1]) if (post.min[axis]! < foot.min[axis]! - .08 * scale || post.max[axis]! > foot.max[axis]! + .08 * scale) fail(name + ':foot-coverage');
    }
    for (let t = 0; t < 3; t++) joint(name + ':beam-' + t, name, 'beam-' + t + '-' + sign * 380, [0, sign * 390, [280, 950, 1620][t]! - 35]);
  }
  for (let k = 0; k < 14; k++) checkBox('slots-0-' + k, [-11, -432, 120 + k * 140], [11, -430, 170 + k * 140]);
  const cosine = 180 / Math.hypot(180, 100), sine = 100 / Math.hypot(180, 100);
  for (const x of [-1200, 1200]) for (const z0 of [120, 760, 1430]) {
    const name = 'end-brace-' + x + '-' + z0;
    checkBox(name, [x - 13, -350 - 13 * sine, z0 + 20 - 13 * cosine], [x + 13, -170 + 13 * sine, z0 + 120 + 13 * cosine]);
    joint(name + ':post', name, 'upright-' + x + '--380', [x, -352, z0 + 114]);
    joint(name + ':tie', name, 'end-tie-' + x + '-' + z0, [x, -176, z0 + 25]);
    const brace = parts.get(name);
    for (let t = 0; t < 3; t++) for (let g = 0; g < 4; g++) for (const prefix of ['gutter', 'gutter-lid']) {
      const otherName = prefix + '-' + t + '-' + g, other = parts.get(otherName);
      if (brace && other && !(brace.max[2] < other.min[2] - .08 * scale || brace.min[2] > other.max[2] + .08 * scale)) fail(name + ':crosses-' + otherName);
    }
  }
  if (parts.size !== (crop === 'microgreens' ? 224 : 272)) fail('part-count');
  for (const name of expectedNames) if (!parts.has(name)) fail(name + ':missing');
  for (const name of parts.keys()) if (!expectedNames.has(name)) fail(name + ':unexpected');
  for (let a = 0; a < 3; a++) {
    near('bounds:min-' + a, report.boundsMm.min[a]!, contract.boundsMm.min[a]! * scale);
    near('bounds:max-' + a, report.boundsMm.max[a]!, contract.boundsMm.max[a]! * scale);
  }
  if (report.zeroAreaTriangles !== 0) fail('degenerate-triangles');
  if (report.triangleCount !== expectedTriangles[crop] || report.triangleCount > contract.triangleBudget) fail('triangle-budget-or-topology');
  if (report.heads.length !== (crop === 'lettuce' ? 108 : 0)) fail('head-count');
  return report;
}
