// solvedModel({ posesGate: 'envelope', clearances }) (#1590): the declared
// per-pair minimum clearance is checked at every envelope sample, so a pair
// that is clear at rest but goes under spec inside the joint range fails the
// build.
//
// Fixture: a carriage slides along +X on a base rail toward a stop block that
// is fastened to the base. At rest the carriage-to-stop gap is 20 mm; at
// slide pose s it is 20 - s mm.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';

function slide(minMm: number, gate: string): string {
  return `
const along = (p) => ({ type: 'axis', origin: { kind: 'vec3', value: p }, axis: [1, 0, 0] });
const seat = (p) => ({ type: 'frame', origin: { kind: 'vec3', value: p } });
const cell = assembly('slide-cell');
cell.part('base', box(100, 20, 5)).connector('rail', along([25, 10, 5])).connector('stop-seat', seat([55, 10, 5]));
cell.part('carriage', box(10, 10, 10).translate(20, 5, 5)).connector('shoe', along([25, 10, 5]));
cell.part('stop', box(10, 20, 20).translate(50, 0, 5)).connector('foot', seat([55, 10, 5]));
cell.mate('slide', 'base.rail', 'carriage.shoe', 'prismatic', { limitsMm: [0, 15] });
cell.mate('stop-fixed', 'base.stop-seat', 'stop.foot', 'fastened');
return cell.solvedModel({}, { ${gate} clearances: [{ parts: ['carriage', 'stop'], minMm: ${minMm} }] });
`;
}

const ENVELOPE = "posesGate: 'envelope', samplesPerMate: 1,";

async function evaluate(code: string) {
  const { evaluation } = await evaluateAndBuildScript({ code });
  return { exitCode: evaluation.exitCode, messages: evaluation.diagnostics.map((d) => `${d.code}: ${d.message}`).join('\n') };
}

describe("solvedModel({ posesGate: 'envelope', clearances })", () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('fails the build when a declared pair goes under spec inside the joint range', async () => {
    // Rest gap 20 mm >= 10; at slide:max the gap is 5 mm < 10.
    const r = await evaluate(slide(10, ENVELOPE));
    expect(r.exitCode).not.toBe(0);
    expect(r.messages).toMatch(/clearance-violated/);
  }, 180_000);

  it('passes when the declared pair keeps its clearance across the range', async () => {
    const r = await evaluate(slide(4, ENVELOPE));
    expect(r.messages).not.toMatch(/clearance-violated/);
    expect(r.exitCode).toBe(0);
  }, 180_000);

  it('keeps the default gate rest-only', async () => {
    const r = await evaluate(slide(10, ''));
    expect(r.exitCode).toBe(0);
  }, 180_000);
});
