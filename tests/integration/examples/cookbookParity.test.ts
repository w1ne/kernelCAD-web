import { beforeAll, describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { getShapeInfoTool } from '../../../src/agent/mcp/tools/getShapeInfo';
import { getMassPropertiesTool } from '../../../src/agent/mcp/tools/getMassProperties';
import { listPartStatsTool } from '../../../src/agent/mcp/tools/listPartStats';
import { lookupCookbookTool } from '../../../src/agent/mcp/tools/lookupCookbook';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { resolveFeaMaterial } from '../../../src/kernel/fea/feaMaterials';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { readFileSync } from 'node:fs';

const ROOT = 'examples/cookbook-parity';

function extent(bbox: { min: [number, number, number]; max: [number, number, number] }): [number, number, number] {
  return [
    bbox.max[0] - bbox.min[0],
    bbox.max[1] - bbox.min[1],
    bbox.max[2] - bbox.min[2],
  ];
}

function center(bbox: { min: [number, number, number]; max: [number, number, number] }): [number, number, number] {
  return [
    (bbox.min[0] + bbox.max[0]) / 2,
    (bbox.min[1] + bbox.max[1]) / 2,
    (bbox.min[2] + bbox.max[2]) / 2,
  ];
}

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('cookbook parity examples', () => {
  it('involute spur gear pair: center distance is m(z1+z2)/2', async () => {
    const file = `${ROOT}/involute-spur-gear-pair.kcad.ts`;
    const ev = await evaluateScript({ file });
    expect(ev.exitCode, JSON.stringify(ev.diagnostics)).toBe(0);

    const stats = await listPartStatsTool({ file });
    expect(stats.ok, stats.error).toBe(true);
    const pinion = stats.parts!.find((p) => p.name === 'pinion');
    const gear = stats.parts!.find((p) => p.name === 'gear');
    expect(pinion).toBeDefined();
    expect(gear).toBeDefined();

    const moduleMm = 2;
    const z1 = 16;
    const z2 = 24;
    const centerDistance = (moduleMm * (z1 + z2)) / 2; // 40
    const dx = center(gear!.bbox)[0] - center(pinion!.bbox)[0];
    expect(dx).toBeCloseTo(centerDistance, 1);

    const pinionOuter = moduleMm * (z1 / 2 + 1);
    expect(extent(pinion!.bbox)[0]).toBeCloseTo(2 * pinionOuter, 1.5);
  }, 120_000);

  // The M6 bolt-and-nut example (modeled V-thread + threaded nut) costs minutes
  // to evaluate and interference-check, so its proof lives in the non-required
  // geometry-proofs job: tests/integration/modeling/modeledThreadProofs.test.ts.
  // Its snippet body is still evaluated by `npm run qc:build` (cookbook:evaluate).

  it('countersunk flat-head screws sit flush without interference', async () => {
    const file = `${ROOT}/countersunk-flat-head-screw.kcad.ts`;
    const ev = await evaluateScript({ file });
    expect(ev.exitCode, JSON.stringify(ev.diagnostics)).toBe(0);

    const stats = await listPartStatsTool({ file });
    expect(stats.ok, stats.error).toBe(true);
    const bar = stats.parts!.find((p) => p.name === 'bar')!;
    // Bar = blank − 2 × (Ø4.5 bore + 90° cone from Ø8.96 at the face).
    const T = 6;
    const boreR = 2.25;
    const rimR = 4.48;
    const h = rimR - boreR;
    const frustum = (Math.PI * h / 3) * (rimR * rimR + rimR * boreR + boreR * boreR);
    const perHole = Math.PI * boreR * boreR * T + frustum - Math.PI * boreR * boreR * h;
    expect(bar.volumeMm3 / (50 * 20 * T - 2 * perHole)).toBeCloseTo(1, 4);
    // Heads sit in the faces: the screw tops are at the bar's top face.
    for (const name of ['screw-a', 'screw-b']) {
      expect(stats.parts!.find((p) => p.name === name)!.bbox.max[2]).toBeCloseTo(T, 3);
    }

    const clash = await checkInterference({ code: readFileSync(file, 'utf8'), fileName: file });
    expect(clash.pairs).toEqual([]);
  }, 180_000);

  it('20x20 B-type T-slot: 20 mm envelope, slot-6 opening', async () => {
    const file = `${ROOT}/tslot-extrusion-and-bracket.kcad.ts`;
    const ev = await evaluateScript({ file });
    expect(ev.exitCode, JSON.stringify(ev.diagnostics)).toBe(0);

    const stats = await listPartStatsTool({ file });
    expect(stats.ok, stats.error).toBe(true);
    const extrusion = stats.parts!.find((p) => p.name === 'extrusion');
    const opening = stats.parts!.find((p) => p.name === 'slot-opening-gauge');
    expect(extrusion).toBeDefined();
    expect(opening).toBeDefined();

    const length = 120;
    const size = extent(extrusion!.bbox);
    expect(size[0]).toBeCloseTo(20, 0.3);
    expect(size[1]).toBeCloseTo(20, 0.3);
    expect(size[2]).toBeCloseTo(length, 0.3);

    // Gauge is box(6, 0.2, 20) in the slot: X is the 6 mm opening.
    expect(extent(opening!.bbox)[0]).toBeCloseTo(6, 1);
  }, 120_000);

  it('GT2 timing-belt drive: belt length from pitch diameters, rounded to teeth', async () => {
    const file = `${ROOT}/gt2-timing-belt-drive.kcad.ts`;
    const ev = await evaluateScript({ file });
    expect(ev.exitCode, JSON.stringify(ev.diagnostics)).toBe(0);

    const stats = await listPartStatsTool({ file });
    expect(stats.ok, stats.error).toBe(true);
    const p1 = stats.parts!.find((p) => p.name === 'pulley-a');
    const p2 = stats.parts!.find((p) => p.name === 'pulley-b');
    const belt = stats.parts!.find((p) => p.name === 'gt2-belt');
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(belt).toBeDefined();

    const pitch = 2;
    const z1 = 20;
    const z2 = 20;
    const C = 60;
    const pd1 = (z1 * pitch) / Math.PI;
    const pd2 = (z2 * pitch) / Math.PI;
    const rawLength = 2 * C + (Math.PI * (pd1 + pd2)) / 2 + ((pd2 - pd1) ** 2) / (4 * C);
    const beltTeeth = Math.round(rawLength / pitch);
    const beltLength = beltTeeth * pitch; // 160

    const dx = Math.abs(center(p2!.bbox)[0] - center(p1!.bbox)[0]);
    expect(dx).toBeCloseTo(C, 1.5);
    expect(beltTeeth).toBe(80);
    expect(beltLength).toBe(160);

    // Circular cord r=0.7 along the pitch line: V ≈ L * π r²
    const cordR = 0.7;
    const impliedLength = belt!.volumeMm3 / (Math.PI * cordR * cordR);
    expect(impliedLength).toBeCloseTo(beltLength, -0.5); // within ~3 mm
  }, 180_000);

  it('wood joinery: dado, rabbet, mortise-and-tenon with fit clearance', async () => {
    const file = `${ROOT}/wood-joinery-dado-rabbet-mortise.kcad.ts`;
    const ev = await evaluateScript({ file });
    expect(ev.exitCode, JSON.stringify(ev.diagnostics)).toBe(0);

    const stats = await listPartStatsTool({ file });
    expect(stats.ok, stats.error).toBe(true);
    const receiving = stats.parts!.find((p) => p.name === 'receiving-board');
    const mating = stats.parts!.find((p) => p.name === 'mating-board');
    expect(receiving).toBeDefined();
    expect(mating).toBeDefined();

    const fit = 0.2;
    const solidA = 120 * 40 * 18;
    const dadoVol = 40 * (18 + 2 * fit) * 6;
    const rabbetVol = 120 * 8 * (9 + fit);
    const mortiseVol = 8 * (20 + 2 * fit) * 12;
    const expectedA = solidA - dadoVol - rabbetVol - mortiseVol;
    expect(receiving!.volumeMm3).toBeCloseTo(expectedA, -1); // ±10 mm³

    // Tenon is nominal (no clearance subtracted from the male).
    expect(mating!.volumeMm3).toBeGreaterThan(18 * 40 * 80);
  }, 120_000);

  it('pipe route: swept tube with bend radius at each corner', async () => {
    const file = `${ROOT}/pipe-route-swept-tube.kcad.ts`;
    const ev = await evaluateScript({ file });
    expect(ev.exitCode, JSON.stringify(ev.diagnostics)).toBe(0);

    const info = await getShapeInfoTool({ file });
    expect(info.ok, info.error).toBe(true);
    const bbox = info.shape!.bbox;
    const size = extent(bbox);

    const bendR = 8;
    const tubeR = 3;
    const segs = [50, 40, 30];
    const arcLen = 2 * ((Math.PI / 2) * bendR);
    const centerline =
      (segs[0] - bendR) + arcLen + (segs[1] - 2 * bendR) + (segs[2] - bendR);
    const expectedVol = centerline * Math.PI * tubeR * tubeR;

    expect(size[0]).toBeGreaterThan(50);
    expect(size[0]).toBeLessThan(50 + 2 * tubeR + 2);
    expect(size[2]).toBeGreaterThan(40);
    // Filleted centerline is shorter than the sharp polyline (120 mm → ~113 mm),
    // so volume sits below the sharp-corner envelope (~3393 mm³).
    expect(info.shape!.volume).toBeGreaterThan(expectedVol * 0.95);
    expect(info.shape!.volume).toBeLessThan(expectedVol * 1.05);
    expect(centerline).toBeLessThan(50 + 40 + 30);
  }, 120_000);

  it('engineering material presets drive mass by name', async () => {
    const file = `${ROOT}/engineering-material-presets-mass.kcad.ts`;
    const ev = await evaluateScript({ file });
    expect(ev.exitCode, JSON.stringify(ev.diagnostics)).toBe(0);

    const stats = await listPartStatsTool({ file });
    expect(stats.ok, stats.error).toBe(true);
    expect(stats.parts!.map((p) => p.name).sort()).toEqual(
      ['aluminum-6061-cube', 'mild-steel-cube', 'nylon-cube'].sort(),
    );
    for (const p of stats.parts!) {
      expect(p.volumeMm3).toBeCloseTo(20 * 20 * 20, 1);
    }

    // The recipe's grade names drive mass AND resolve in FEA to the same grade.
    const cube = 'return box(20, 20, 20);';
    const steel = await getMassPropertiesTool({ code: cube, material: 'mild-steel' });
    const alu = await getMassPropertiesTool({ code: cube, material: 'aluminum-6061' });
    const nylon = await getMassPropertiesTool({ code: cube, material: 'nylon' });
    expect(steel.ok && alu.ok && nylon.ok).toBe(true);
    expect(steel.massProperties!.mass / alu.massProperties!.mass).toBeCloseTo(7850 / 2700, 3);
    expect(steel.massProperties!.mass / nylon.massProperties!.mass).toBeCloseTo(7850 / 1010, 3);
    for (const grade of ['mild-steel', 'aluminum-6061', 'nylon']) {
      const fea = resolveFeaMaterial(grade);
      expect(fea.ok && fea.name).toBe(grade);
    }
  }, 120_000);
});

describe('cookbook parity lookup_cookbook ranking', () => {
  const cases: Array<{ query: string; id: string }> = [
    { query: 'involute spur gear pair 20 degree pressure angle', id: 'involute-spur-gear-pair' },
    { query: 'ISO metric hex bolt and nut helical thread', id: 'iso-metric-bolt-and-nut' },
    { query: 'countersunk hole flat head screw flush', id: 'countersunk-flat-head-screw' },
    { query: '20x20 B-type T-slot extrusion slot 6', id: 'tslot-extrusion-and-bracket' },
    { query: 'GT2 timing belt drive pulleys center distance', id: 'gt2-timing-belt-drive' },
    { query: 'wood dado rabbet mortise and tenon fit clearance', id: 'wood-joinery-dado-rabbet-mortise' },
    { query: 'pipe route through 3D waypoints with bend radius', id: 'pipe-route-swept-tube' },
    { query: 'mild-steel aluminum-6061 nylon material mass', id: 'engineering-material-presets-mass' },
  ];

  for (const c of cases) {
    it(`ranks ${c.id} first for "${c.query}"`, async () => {
      const r = await lookupCookbookTool({ query: c.query, k: 3 });
      expect(r.ok).toBe(true);
      expect(r.hits!.length).toBeGreaterThan(0);
      expect(r.hits![0].id).toBe(c.id);
    });
  }
});
