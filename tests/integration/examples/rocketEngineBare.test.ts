// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The bare rocket-engine example: the parts of a gas-generator kerolox engine
// with a fluid port wherever a line will attach, and no lines yet.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateCommand } from '../../../src/agent/cli/commands/evaluate';
import { runScript } from '../../../src/composition/runScript';
import { readFileSync } from 'node:fs';

const FILE = 'examples/rocket-engine-lines/engine-bare.kcad.ts';

const PARTS = [
  'chamber',
  'coolant-manifold',
  'injector-dome',
  'gimbal-mount',
  'thrust-frame',
  'turbopump',
  'turbine-exhaust-collar',
  'gas-generator',
  'pump-mount',
  'main-lox-valve',
  'main-fuel-valve',
  'gg-valve',
  'tvc-actuator-1',
  'tvc-actuator-2',
  'igniter-cartridge',
  'helium-bottle',
  'pneumatic-block',
];

/** `part.connector` for every port the model must carry. */
const PORTS = [
  'chamber.igniter',
  'chamber.coolant-out',
  'coolant-manifold.fuel-in',
  'injector-dome.lox-in',
  'injector-dome.fuel-in',
  'injector-dome.purge',
  'turbopump.lox-out',
  'turbopump.fuel-out',
  'turbopump.gg-lox',
  'turbopump.gg-fuel',
  'turbopump.turbine-in',
  'turbopump.turbine-out',
  'turbopump.act-supply-1',
  'turbopump.act-supply-2',
  'turbopump.act-return-1',
  'turbopump.act-return-2',
  'turbine-exhaust-collar.out',
  'gas-generator.out',
  'gas-generator.lox-in',
  'gas-generator.fuel-in',
  'gas-generator.igniter',
  'gas-generator.purge',
  'main-lox-valve.in',
  'main-lox-valve.out',
  'main-lox-valve.pneumatic',
  'main-fuel-valve.in',
  'main-fuel-valve.out',
  'main-fuel-valve.pneumatic',
  'gg-valve.lox-in',
  'gg-valve.lox-out',
  'gg-valve.fuel-in',
  'gg-valve.fuel-out',
  'gg-valve.pneumatic',
  'tvc-actuator-1.supply',
  'tvc-actuator-1.return',
  'tvc-actuator-2.supply',
  'tvc-actuator-2.return',
  'igniter-cartridge.out-chamber',
  'igniter-cartridge.out-gg',
  'helium-bottle.out',
  'pneumatic-block.in',
  'pneumatic-block.out-lox-valve',
  'pneumatic-block.out-fuel-valve',
  'pneumatic-block.out-gg-valve',
  'pneumatic-block.purge-dome',
  'pneumatic-block.purge-gg',
];

const SYSTEMS = new Set(['lox', 'fuel', 'hot-gas', 'igniter', 'pneumatic']);

interface PortRecord { part: string; name: string; system: string; od: number }

beforeAll(async () => { await initOcct(); }, 120_000);

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

async function evaluateJson(file: string): Promise<any> {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((s: unknown) => { lines.push(String(s)); });
  await evaluateCommand().parseAsync(['node', 'evaluate', file, '--json']);
  return JSON.parse(lines.join('\n'));
}

/** Parts and ports as the script recorded them. */
async function partsAndPorts(file: string): Promise<{ parts: string[]; ports: PortRecord[] }> {
  const run = await runScript({ code: readFileSync(file, 'utf8'), fileName: file });
  const parts: string[] = [];
  const ports: PortRecord[] = [];
  const scene = run.returnValue as { parts: Array<{ name: string; connectors?: Array<{ name: string; port?: { system: string; od: number } }> }> };
  for (const p of scene.parts) {
    parts.push(p.name);
    for (const c of p.connectors ?? []) {
      if (c.port) ports.push({ part: p.name, name: c.name, system: c.port.system, od: c.port.od });
    }
  }
  return { parts, ports };
}

describe('rocket engine bare model', () => {
  it('evaluates with no warnings or errors', async () => {
    const r = await evaluateJson(FILE);
    expect(r.diagnostics.filter((d: { severity: string }) => d.severity !== 'info')).toEqual([]);
    expect(r.ok).toBe(true);
  }, 300_000);

  it('has the declared parts and a port for every line end', async () => {
    const { parts, ports } = await partsAndPorts(FILE);
    expect([...parts].sort()).toEqual([...PARTS].sort());
    expect(ports.map((p) => `${p.part}.${p.name}`).sort()).toEqual([...PORTS].sort());
    expect(ports).toHaveLength(46);
    for (const p of ports) {
      expect(SYSTEMS.has(p.system), `${p.part}.${p.name} system ${p.system}`).toBe(true);
      expect(p.od).toBeGreaterThan(0);
    }
  }, 300_000);
});
