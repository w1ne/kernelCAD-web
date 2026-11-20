// verify({ check: 'clearance-range' }) (#1590): per mating pair, actual vs
// planned clearance at rest and across the joint range.
//
// Fixture: a carriage slides along +X on a base rail toward a stop block that
// is fastened to the base. At rest the carriage-to-stop gap is 20 mm; at
// slide pose s it is 20 - s mm, so every expected value is closed form.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { verifyTool } from '../../../src/agent/mcp/tools/verify';
import type { CheckClearanceRangeOutput } from '../../../src/agent/mcp/tools/checkClearanceRange';
import type { ClearanceRangeReport, ClearanceRangeRow } from '../../../src/modeling/mates/clearanceRange';

interface FixtureOpts {
  limits?: string;
  clearances?: string;
  dfm?: string;
}

function slide({ limits = ', { limitsMm: [0, 10] }', clearances = "[{ parts: ['carriage', 'stop'], minMm: 5 }]", dfm = '' }: FixtureOpts = {}): string {
  return `
${dfm}
const along = (p) => ({ type: 'axis', origin: { kind: 'vec3', value: p }, axis: [1, 0, 0] });
const seat = (p) => ({ type: 'frame', origin: { kind: 'vec3', value: p } });
const cell = assembly('slide-cell');
cell.part('base', box(100, 20, 5)).connector('rail', along([25, 10, 5])).connector('stop-seat', seat([55, 10, 5]));
cell.part('carriage', box(10, 10, 10).translate(20, 5, 5)).connector('shoe', along([25, 10, 5]));
cell.part('stop', box(10, 20, 20).translate(50, 0, 5)).connector('foot', seat([55, 10, 5]));
cell.mate('slide', 'base.rail', 'carriage.shoe', 'prismatic'${limits});
cell.mate('stop-fixed', 'base.stop-seat', 'stop.foot', 'fastened');
return cell.solvedModel({}, { clearances: ${clearances} });
`;
}

type Report = ClearanceRangeReport & { source: 'local'; assembly: string };

async function run(code: string, extra: Record<string, unknown> = {}): Promise<CheckClearanceRangeOutput> {
  return (await verifyTool({ check: 'clearance-range', code, ...extra })) as CheckClearanceRangeOutput;
}

function report(out: CheckClearanceRangeOutput): Report {
  if (!('rows' in out)) throw new Error(`expected a report, got error: ${out.error}`);
  return out;
}

function row(r: Report, a: string, b: string, at: 'rest' | 'range'): ClearanceRangeRow {
  const found = r.rows.find((x) => x.at === at && [x.a, x.b].sort().join() === [a, b].sort().join());
  if (found === undefined) throw new Error(`no ${at} row for ${a}/${b}: ${JSON.stringify(r.rows)}`);
  return found;
}

describe("verify({ check: 'clearance-range' })", () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('passes a declared pair that keeps its planned clearance at rest and across the range', async () => {
    const r = report(await run(slide()));
    const rest = row(r, 'carriage', 'stop', 'rest');
    const range = row(r, 'carriage', 'stop', 'range');
    expect(rest).toMatchObject({ planned: 5, plannedSource: 'declared', status: 'pass', worstSample: 'current' });
    expect(rest.actual).toBeCloseTo(20, 6);
    expect(range).toMatchObject({ planned: 5, status: 'pass', worstSample: 'slide:max' });
    expect(range.actual).toBeCloseTo(10, 6);
    // rest + slide:min + 3 interior + slide:max
    expect(range.measuredSamples).toBe(6);
    expect(r.ok).toBe(true);
  }, 180_000);

  it('fails a pair that is clear at rest but goes under spec inside the joint range', async () => {
    const r = report(await run(slide({ limits: ', { limitsMm: [0, 19] }' })));
    expect(row(r, 'carriage', 'stop', 'rest').status).toBe('pass');
    const range = row(r, 'carriage', 'stop', 'range');
    expect(range).toMatchObject({ status: 'fail', worstSample: 'slide:max' });
    expect(range.actual).toBeCloseTo(1, 6);
    expect(range.reason).toMatch(/below the planned 5 mm/);
    expect(r.ok).toBe(false);
  }, 180_000);

  it('reports the range as unknown, not pass, when a movable mate has no limits', async () => {
    const r = report(await run(slide({ limits: '' })));
    expect(row(r, 'carriage', 'stop', 'rest').status).toBe('pass');
    const range = row(r, 'carriage', 'stop', 'range');
    expect(range.status).toBe('unknown');
    expect(range.reason).toMatch(/'slide' have no declared limits/);
    expect(r.unboundedMates).toEqual(['slide']);
    expect(r.ok).toBe(false);
  }, 180_000);

  it('applies min_clearance_mm to movable mate pairs and keeps fastened pairs exempt', async () => {
    // The carriage rides on the rail: 0 mm against a 0.5 mm planned gap.
    const r = report(await run(slide(), { min_clearance_mm: 0.5 }));
    const rest = row(r, 'base', 'carriage', 'rest');
    expect(rest).toMatchObject({ plannedSource: 'spec', planned: 0.5, status: 'fail' });
    expect(rest.actual).toBeCloseTo(0, 6);
    expect(r.rows.some((x) => [x.a, x.b].includes('stop') && [x.a, x.b].includes('base'))).toBe(false);
    expect(r.ok).toBe(false);
  }, 180_000);

  it('reads the spec from dfmSpec minClearance and honours its ignore list', async () => {
    const ignored = report(await run(slide({ dfm: "dfmSpec({ minClearance: 0.5, ignore: [['base', 'carriage']] });" })));
    expect(ignored.rows.every((x) => x.plannedSource === 'declared')).toBe(true);
    const measured = report(await run(slide({ dfm: 'dfmSpec({ minClearance: 0.5 });' })));
    expect(row(measured, 'base', 'carriage', 'rest').status).toBe('fail');
  }, 180_000);

  it('refuses a model with no planned clearance', async () => {
    const out = await run(slide({ clearances: '[]' }));
    expect(out.ok).toBe(false);
    expect('error' in out && out.error).toMatch(/has no planned clearance/);
  }, 120_000);
});
