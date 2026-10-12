// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateCommand } from '../../../src/agent/cli/commands/evaluate';
import { exportCommand } from '../../../src/agent/cli/commands/export';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createHash } from 'node:crypto';

const GOOD = 'examples/rocket-engine-lines/engine-routed.kcad.ts';
const BROKEN = 'examples/rocket-engine-lines/engine-routed-twin.kcad.ts';
const ENDPOINTS: Record<string, string[]> = {
  'lox-pump-main': ['turbopump.lox-out', 'main-lox-valve.in'],
  'lox-main-dome': ['main-lox-valve.out', 'injector-dome.lox-in'],
  'lox-pump-gg': ['turbopump.gg-lox', 'gg-valve.lox-in'],
  'lox-gg-generator': ['gg-valve.lox-out', 'gas-generator.lox-in'],
  'fuel-pump-main': ['turbopump.fuel-out', 'main-fuel-valve.in'],
  'fuel-main-manifold': ['main-fuel-valve.out', 'coolant-manifold.fuel-in'],
  'fuel-coolant-dome': ['chamber.coolant-out', 'injector-dome.fuel-in'],
  'fuel-pump-gg': ['turbopump.gg-fuel', 'gg-valve.fuel-in'],
  'fuel-gg-generator': ['gg-valve.fuel-out', 'gas-generator.fuel-in'],
  'fuel-act1-supply': ['turbopump.act-supply-1', 'tvc-actuator-1.supply'],
  'fuel-act1-return': ['turbopump.act-return-1', 'tvc-actuator-1.return'],
  'fuel-act2-supply': ['turbopump.act-supply-2', 'tvc-actuator-2.supply'],
  'fuel-act2-return': ['turbopump.act-return-2', 'tvc-actuator-2.return'],
  'hotgas-generator-turbine': ['gas-generator.out', 'turbopump.turbine-in'],
  'hotgas-exhaust': ['turbine-exhaust-collar.out'],
  'igniter-chamber': ['igniter-cartridge.out-chamber', 'chamber.igniter'],
  'igniter-generator': ['igniter-cartridge.out-gg', 'gas-generator.igniter'],
  'pneumatic-helium-block': ['helium-bottle.out', 'pneumatic-block.in'],
  'pneumatic-main-lox': ['pneumatic-block.out-lox-valve', 'main-lox-valve.pneumatic'],
  'pneumatic-main-fuel': ['pneumatic-block.out-fuel-valve', 'main-fuel-valve.pneumatic'],
  'pneumatic-gg-valve': ['pneumatic-block.out-gg-valve', 'gg-valve.pneumatic'],
  'pneumatic-purge-dome': ['pneumatic-block.purge-dome', 'injector-dome.purge'],
  'pneumatic-purge-generator': ['pneumatic-block.purge-gg', 'gas-generator.purge'],
};
beforeAll(async () => { await initOcct(); }, 120_000);
afterEach(() => { vi.restoreAllMocks(); process.exitCode = 0; });
async function evaluateJson(file: string): Promise<any> {
  const started = Date.now();
  const output: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((value: unknown) => output.push(String(value)));
  await evaluateCommand().parseAsync(['node', 'evaluate', file, '--json']);
  vi.restoreAllMocks();
  const result = JSON.parse(output.join('\n'));
  // Optional release receipts record the same real command the contract uses.
  const receiptDir = process.env.KCAD_ROCKET_RECEIPT_DIR;
  if (receiptDir) {
    mkdirSync(receiptDir, { recursive: true });
    writeFileSync(join(receiptDir, `${basename(file)}.json`), JSON.stringify({
      ...result,
      receipt: { sourceSha256: createHash('sha256').update(readFileSync(file)).digest('hex'), elapsedMs: Date.now() - started },
    }, null, 2));
  }
  return result;
}
describe('rocket engine routed example', () => {
  it('connects 23 real lines across all five services without tube errors', async () => {
    const result = await evaluateJson(GOOD);
    expect(result.ok).toBe(true);
    expect(result.tubes?.lines ?? []).toHaveLength(23);
    expect(Object.fromEntries(result.tubes.systems.map((s: any) => [s.system, s.lines])))
      .toEqual({ lox: 4, fuel: 9, 'hot-gas': 2, igniter: 2, pneumatic: 6 });
    expect(result.diagnostics.filter((d: any) => d.severity !== 'info')).toEqual([]);
    expect(result.ports).toHaveLength(46);
    for (const line of result.tubes.lines) {
      expect(line.cutLength).toBeGreaterThan(0);
      expect(line.minClearance.mm).toBeGreaterThanOrEqual(6);
      const nearest = result.tubes.lines.find((other: any) => other.name === line.minClearance.to);
      if (nearest && nearest.system !== line.system) {
        const need = [line.system, nearest.system].includes('hot-gas') ? 25
          : [line.system, nearest.system].sort().join('/') === 'fuel/lox' ? 12 : 6;
        expect(line.minClearance.mm).toBeGreaterThanOrEqual(need);
      }
      const actual = result.ports.filter((p: any) => p.usedBy.includes(line.name))
        .map((p: any) => `${p.part}.${p.name}`).sort();
      expect(actual, line.name).toEqual([...ENDPOINTS[line.name]].sort());
    }
    const unused = result.ports.filter((p: any) => p.usedBy.length === 0);
    expect(unused.map((p: any) => `${p.part}.${p.name}`)).toEqual(['turbopump.turbine-out']);
    for (const port of result.ports) {
      expect(port.usedBy.length).toBeLessThanOrEqual(1);
      expect(port.unresolved).toBeUndefined();
      expect(port.origin).toHaveLength(3);
    }
  }, 600_000);

  it('keeps all 19 display parts and 23 hollow tubes as distinct STEP solids', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-rocket-step-'));
    try {
      const out = join(dir, 'engine.step');
      vi.spyOn(console, 'log').mockImplementation(() => {});
      await exportCommand().parseAsync(['node', 'export', 'step', GOOD, '-o', out]);
      const step = readFileSync(out, 'utf8');
      const solidCount = step.match(/MANIFOLD_SOLID_BREP/g)?.length ?? 0;
      if (process.env.KCAD_ROCKET_RECEIPT_DIR) {
        copyFileSync(out, join(process.env.KCAD_ROCKET_RECEIPT_DIR, 'engine-routed.step'));
        writeFileSync(join(process.env.KCAD_ROCKET_RECEIPT_DIR, 'step.json'), JSON.stringify({
          solidCount, sourceSha256: createHash('sha256').update(readFileSync(GOOD)).digest('hex'),
          stepSha256: createHash('sha256').update(step).digest('hex'),
        }, null, 2));
      }
      expect(solidCount).toBe(42);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }, 600_000);

  it('the broken twin changes one routing parameter and fails on its one clearance code', async () => {
    const good = readFileSync(GOOD, 'utf8');
    const broken = readFileSync(BROKEN, 'utf8');
    expect(broken.replace("param('IgniterRunRise', 308,", "param('IgniterRunRise', 268,")).toBe(good);
    const result = await evaluateJson(BROKEN);
    expect(result.ok).toBe(false);
    expect(result.tubes.lines).toHaveLength(23);
    expect(result.diagnostics.filter((d: any) => d.severity === 'error').map((d: any) => d.code))
      .toEqual(['tube.clearance.overlap']);
  }, 600_000);

  it('refuses STEP export of the broken twin without writing a file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-rocket-failclosed-'));
    try {
      const out = join(dir, 'broken.step');
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await exportCommand().parseAsync(['node', 'export', 'step', BROKEN, '-o', out]);
      const refusal = { exitCode: process.exitCode ?? 0, fileWritten: existsSync(out) };
      if (process.env.KCAD_ROCKET_RECEIPT_DIR) {
        writeFileSync(join(process.env.KCAD_ROCKET_RECEIPT_DIR, 'broken-export.json'), JSON.stringify(refusal, null, 2));
      }
      expect(refusal).toEqual({ exitCode: 1, fileWritten: false });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }, 600_000);

  it('moving the cartridge moves both connected tube ends without losing their port axes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-rocket-moved-'));
    try {
      const copy = join(dir, 'moved.kcad.ts');
      writeFileSync(copy, readFileSync(GOOD, 'utf8').replace("param('CartridgeStation', 190,", "param('CartridgeStation', 180,"));
      const result = await evaluateJson(copy);
      expect(result.ok).toBe(true);
      expect(result.diagnostics.filter((d: any) => d.severity !== 'info')).toEqual([]);
      for (const port of result.ports.filter((p: any) => p.part === 'igniter-cartridge')) {
        expect(port.origin[2]).toBe(358);
        expect(port.axis).toEqual([0, 0, 1]);
        expect(port.usedBy).toEqual([port.name === 'out-chamber' ? 'igniter-chamber' : 'igniter-generator']);
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }, 600_000);
});
