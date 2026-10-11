// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// FIX-05 verdict consistency: one model, one mechanism verdict.
//
// A plain butt hinge (two leaves, pin pressed into one leaf, one revolute
// mate, no limits) is a valid passive mechanism. evaluate_script called it
// mechanism:'real' while review_cad called it 'broken' / topology-redesign
// because gravity swung the free leaf 63-79°, and demanded limits,
// jointSupport and a physicalUseCase. Gravity drift on an unactuated,
// unlimited joint is informational unless the script declares a hold/load
// requirement. A base + lid print layout (no mates) is independent bodies and
// gets no mechanism.orphan-part at all.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

const FREE_HINGE = `
// Two-leaf butt hinge: leafA grounded, leafB swings on a pin pressed into leafB.
const arm = assembly('hinge-asm');
const knuckle = (y0: number, len: number) =>
  cylinder(len, 4).rotateX(-90).translate(0, y0, 4).subtract(cylinder(len + 2, 1.6).rotateX(-90).translate(0, y0 - 1, 4));
const leafAShape = box(37, 30, 2).translate(-42, -15, 0)
  .union(box(3, 10, 2).translate(-5.5, -15, 0))
  .union(box(3, 10, 2).translate(-5.5, 5, 0))
  .union(knuckle(-15, 10))
  .union(knuckle(5, 10));
const pinShape = cylinder(36, 1.5).rotateX(-90).translate(0, -18, 4);
const leafBShape = box(37, 30, 2).translate(5, -15, 0)
  .union(box(3, 10, 2).translate(2.5, -5, 0))
  .union(cylinder(10, 4).rotateX(-90).translate(0, -5, 4))
  .union(pinShape);
const leafA = arm.part('leafA', leafAShape);
const leafB = arm.part('leafB', leafBShape);
leafA.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 4] }, axis: [0, 1, 0] });
leafB.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 4] }, axis: [0, 1, 0] });
arm.mate('hinge', 'leafA.axis', 'leafB.axis', 'revolute');
return arm.solvedModel({ hinge: 0 });
`;

const LIMITED_HINGE = FREE_HINGE.replace("'revolute');", "'revolute', { limitsDeg: [-90, 90] });");

// The same hinge with a declared load rating (a mate capacity): something
// must hold, so gravity drift is a real defect again.
const RATED_HINGE = FREE_HINGE.replace(
  "'revolute');",
  "'revolute', { limitsDeg: [-90, 90], capacity: { envelope: { maxResultantForceN: 50, maxResultantMomentNmm: 500 } } });",
);

const PI_ENCLOSURE = `
const asm = assembly('pi-enclosure');
asm.part('base', box(90, 62, 20).shell(2, { face: 'top' }));
asm.part('lid', box(90, 62, 3).translate(110, 0, 0));
return asm.solvedModel({});
`;

type Diag = { code: string; severity?: string; id?: string };

describe('passive free joint — evaluate_script and review_cad agree', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('a free revolute hinge is real in both, review is green, drift is info', async () => {
    const ev = await evaluateScriptTool({ code: FREE_HINGE });
    const rv = await reviewCadTool({ code: FREE_HINGE });
    expect(ev.mechanism).toBe('real');
    expect(rv.mechanism).toBe(ev.mechanism);
    expect(rv.ok).toBe(true);
    expect(rv.fitness?.repairMode).toBe('none');
    const drift = (rv.mechanismFailures ?? []).filter((d) => d.code === 'mechanism.drops-on-release');
    expect(drift.length).toBeGreaterThan(0);
    expect(drift.every((d) => d.severity === 'info')).toBe(true);
    // Missing limits / support intent on a free passive joint: warnings, not blockers.
    const topology = (rv.diagnostics as Diag[]).filter((d) => d.code.startsWith('assembly.joint-topology.'));
    expect(topology.every((d) => d.severity === 'warning')).toBe(true);
    expect((rv.diagnostics as Diag[]).some((d) => d.code === 'assembly.connectivity.floating-moving-part')).toBe(false);
  }, 240_000);

  it('declared limits are end stops, not a hold requirement: a limited hinge is still passive', async () => {
    const ev = await evaluateScriptTool({ code: LIMITED_HINGE });
    const rv = await reviewCadTool({ code: LIMITED_HINGE });
    expect(rv.mechanism).toBe(ev.mechanism);
    expect(rv.ok).toBe(true);
    const drift = (rv.mechanismFailures ?? []).filter((d) => d.code === 'mechanism.drops-on-release') as Array<Diag & { message?: string }>;
    expect(drift.length).toBeGreaterThan(0);
    expect(drift.every((d) => d.severity === 'info')).toBe(true);
    // The note tells a user whose hinge really must hold how to opt in.
    const note = drift.map((d) => d.message ?? '').join('\n');
    expect(note).toMatch(/limitsDeg \/ limitsMm are end stops, not a holding requirement/);
    expect(note).toMatch(/capacity: \{ envelope: \{ maxResultantForceN, maxResultantMomentNmm \} \}/);
    expect(note).toMatch(/arm\.physicalUseCase\('<name>', \{ stableParts: .*loads: \[/);
    expect(note).toContain("arm.mate('hinge'");
  }, 240_000);

  it('a hinge with a declared load rating must hold: drift blocks (control)', async () => {
    const rv = await reviewCadTool({ code: RATED_HINGE });
    expect(rv.ok).toBe(false);
    expect(rv.mechanism).toBe('broken');
    const drift = (rv.mechanismFailures ?? []).find((d) => d.code === 'mechanism.drops-on-release');
    expect(drift?.severity).toBe('error');
  }, 240_000);

  it('review output states each finding once and references it by id', async () => {
    const rv = await reviewCadTool({ code: RATED_HINGE });
    if (rv.ok) throw new Error('expected a failing review');
    const ids = new Set([
      ...(rv.diagnostics as Diag[]).map((d) => d.id),
      ...((rv.mechanismFailures ?? []) as Diag[]).map((d) => d.id),
    ]);
    const reasons = rv.fitness?.blockingReasons ?? [];
    expect(reasons.length).toBeGreaterThan(0);
    for (const reason of reasons) {
      expect('ref' in reason, reason.code).toBe(true);
      if ('ref' in reason) {
        expect(ids).toContain(reason.ref);
        expect(rv.suggestedRepairPrompt).toContain(`${reason.code}: see ${reason.ref}`);
      }
      expect(reason).not.toHaveProperty('evidence');
    }
    // A diagnostic's full message appears exactly once in the payload outside
    // mechanismSummary, the one-line mechanism verdict evaluate_script, the CLI
    // and the live viewer share (it quotes the failure on purpose).
    const { mechanismSummary: _summary, ...rest } = rv as typeof rv & { mechanismSummary?: unknown };
    const json = JSON.stringify(rest);
    for (const d of [...rv.diagnostics, ...(rv.mechanismFailures ?? [])]) {
      const needle = JSON.stringify(d.message);
      expect(json.split(needle).length - 1, d.code).toBe(1);
    }
  }, 240_000);
});

describe('independent bodies — no orphan-part on a mate-less assembly', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('a Pi enclosure base + lid print layout is real with no mechanism.orphan-part', async () => {
    const ev = await evaluateScriptTool({ code: PI_ENCLOSURE });
    expect(ev.ok).toBe(true);
    expect(ev.mechanism).toBe('real');
    expect((ev.diagnostics as Diag[]).some((d) => d.code === 'mechanism.orphan-part')).toBe(false);
  }, 120_000);
});
