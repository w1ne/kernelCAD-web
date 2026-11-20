// SPDX-License-Identifier: MIT
// Exact named-part and mesh checks for a low-poly scene prop, not farm hardware.
import { readConnectionParts, type PartMap, type MeshPart } from './fiveConnectionsGeometry';
import contract from '../../fixtures/catalog/hydroponicGrowRackContract.json';

export { readConnectionParts as readGrowRackParts };
export type GrowRackReport = {
  partCount: number; triangleCount: number; zeroAreaTriangles: number;
  boundsMm: { min: number[]; max: number[] }; failures: string[];
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
  const expectedTriangles: Record<string, number> = { lettuce: 7400, empty: 5240, microgreens: 2936 };
  const report: GrowRackReport = { partCount: parts.size, triangleCount: 0, zeroAreaTriangles: 0,
    boundsMm: { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }, failures: [], heads: [] };
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
        const name = `head-${k}`, r = 78 + ((h * 5 + g * 3 + t) % 3) * 8, centerZ = z + 70 + r * .38;
        checkBox(name, [x - r, y - r, centerZ - .6 * r], [x + r, y + r, centerZ + .6 * r]);
        const head = parts.get(name); if (!head) continue;
        const actualVolume = volume(head), expectedVolume = 2.4 * (r * scale) ** 3;
        report.heads.push({ name, triangleCount: head.triangles.length, volumeMm3: actualVolume, expectedVolumeMm3: expectedVolume });
        if (head.triangles.length !== 48) fail(name + ':triangle-count');
        near(name + ':volume', actualVolume, expectedVolume, expectedVolume * .001);
      }
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
