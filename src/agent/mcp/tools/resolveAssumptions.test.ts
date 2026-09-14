// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/resolveAssumptions.test.ts

import { describe, expect, it, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveAssumptionsTool } from './resolveAssumptions';
import { buildLedger } from '../../vision/ledger';
import type { TraceFeatureResult } from '../../vision/types';

const tmpDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function writeTempLedger(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'ledger-test-'));
  tmpDirs.push(dir);
  const feature: TraceFeatureResult = {
    label: 'brow_top',
    kind: 'curve',
    waypoints: [[0.2, 0.3], [0.5, 0.1]],
    confidence: 0.8,
    backend: 'vision-llm',
  };
  const ledger = buildLedger({ features: [feature] });
  const path = join(dir, 'model.ledger.json');
  await import('node:fs/promises').then((fs) => fs.writeFile(path, JSON.stringify(ledger, null, 2)));
  return path;
}

describe('resolveAssumptionsTool', () => {
  it('returns ledger-not-found diagnostic when ledgerPath is missing/empty', async () => {
    const out = await resolveAssumptionsTool({ ledgerPath: '', resolutions: [] });
    expect(out.ok).toBe(false);
    expect(out.diagnostics[0].code).toBe('reference.assumptions.ledger-not-found');
  });

  it('returns ledger-not-found diagnostic when the file does not exist', async () => {
    const out = await resolveAssumptionsTool({
      ledgerPath: '/tmp/does-not-exist-' + Math.random() + '.ledger.json',
      resolutions: [{ id: 'x', confirm: true }],
    });
    expect(out.ok).toBe(false);
    expect(out.diagnostics[0].code).toBe('reference.assumptions.ledger-not-found');
  });

  it('confirms and overrides facts, rewrites the file, and returns paramOverrides', async () => {
    const path = await writeTempLedger();
    const out = await resolveAssumptionsTool({
      ledgerPath: path,
      resolutions: [
        { id: 'brow_top', confirm: true },
        { id: 'scale', value: 0.2 },
      ],
    });
    expect(out.ok).toBe(true);
    expect(out.ledger?.unresolvedCount).toBe(0);
    expect(out.paramOverrides.scale).toBe(0.2);
    expect(out.paramOverrides.brow_top).toEqual([[0.2, 0.3], [0.5, 0.1]]);

    const rewritten = JSON.parse(await readFile(path, 'utf8'));
    expect(rewritten.unresolvedCount).toBe(0);
  });

  it('emits unknown-resolution-id diagnostic for ids not present in the ledger', async () => {
    const path = await writeTempLedger();
    const out = await resolveAssumptionsTool({
      ledgerPath: path,
      resolutions: [{ id: 'not-a-real-fact', confirm: true }],
    });
    expect(out.ok).toBe(true);
    expect(out.diagnostics.some((d) => d.code === 'reference.assumptions.unknown-resolution-id')).toBe(true);
  });
});
