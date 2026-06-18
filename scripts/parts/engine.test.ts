// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/engine.test.ts

import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  candidatesFromSource,
  ingestCandidate,
  ingestFromRegistry,
  verifyCatalog,
  type IngestDeps,
} from './engine';
import type { PartSourceEntry, PartCandidate, MirrorStore } from './contracts';
import type { StepInspectReport } from '../../src/agent/inspect/inspectStep';
import type { AutoConnector } from '../../src/modeling/parts/holeAutoConnectors';
import type { PartRecord } from '../../src/shared/parts/types';

// --- In-memory mirror store ---------------------------------------------------

class MemStore implements MirrorStore {
  objects = new Map<string, Uint8Array>();
  putCount = 0;
  async put(sha256: string, bytes: Uint8Array): Promise<string> {
    this.putCount++;
    if (!this.objects.has(sha256)) this.objects.set(sha256, bytes);
    return `mem://step/${sha256}.step`;
  }
  async has(sha256: string): Promise<boolean> {
    return this.objects.has(sha256);
  }
}

// --- Mocked geometry deps -----------------------------------------------------

function reportWithSolids(n: number): StepInspectReport {
  const solids = Array.from({ length: n }, (_, i) => ({
    index: i,
    name: null,
    bboxExact: { min: [0, 0, 0] as [number, number, number], max: [10, 10, 10] as [number, number, number] },
    volumeMm3: 1000,
    faceCount: 6,
    holes: [],
  }));
  return { file: 'mem', solidCount: n, solids };
}

const conn = (name: string): AutoConnector => ({
  name,
  ref: `ref:${name}`,
  origin: [0, 0, 0],
  axis: [0, 0, 1],
  type: 'frame',
});

/** A deps that decides parse/connector behavior from the candidate id substring. */
function makeDeps(): IngestDeps {
  return {
    inspectStep: async (_bytes, hint) => {
      if (hint.includes('unparseable')) return reportWithSolids(0);
      return reportWithSolids(2);
    },
    synthesizeConnectors: (_report, partName) => {
      if (partName.includes('connectorless')) return [];
      return [conn('mating-face'), conn('top-face')];
    },
  };
}

// --- Fixtures -----------------------------------------------------------------

function makeCheckout(): { dir: string; source: PartSourceEntry } {
  const dir = mkdtempSync(join(tmpdir(), 'kc-engine-'));
  // gears/spur.step  → categoryMap should pick 'gear'
  mkdirSync(join(dir, 'gears'), { recursive: true });
  writeFileSync(join(dir, 'gears', 'spur-gear.step'), 'ISO-10303-21; gear');
  // misc/widget.stp → no categoryMap match → guessCategory fallback
  mkdirSync(join(dir, 'misc'), { recursive: true });
  writeFileSync(join(dir, 'misc', 'mystery-widget.stp'), 'ISO-10303-21; widget');
  // a non-STEP file that must be ignored
  writeFileSync(join(dir, 'README.md'), '# readme');

  const source: PartSourceEntry = {
    id: 'fixture-src',
    repo: 'github.com/example/fixture',
    commit: 'deadbeef',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'MIT',
    attribution: 'Example contributors',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    categoryMap: { gears: 'gear' },
  };
  return { dir, source };
}

// --- Tests --------------------------------------------------------------------

describe('candidatesFromSource (github-glob)', () => {
  it('finds both STEP files with correct category/upstream/license', async () => {
    const { dir, source } = makeCheckout();
    const { candidates } = await candidatesFromSource(source, { checkoutDir: dir });

    expect(candidates).toHaveLength(2);
    const byPath = new Map(candidates.map((c) => [c.upstream.path, c]));

    const gear = byPath.get('gears/spur-gear.step')!;
    expect(gear.category).toBe('gear'); // from categoryMap top dir
    expect(gear.license).toBe('MIT');
    expect(gear.licenseClass).toBe('permissive');
    expect(gear.upstream).toEqual({ repo: 'github.com/example/fixture', commit: 'deadbeef', path: 'gears/spur-gear.step' });
    expect(gear.stepPath).toContain('spur-gear.step');

    const widget = byPath.get('misc/mystery-widget.stp')!;
    // 'widget' has no keyword → uncategorized fallback.
    expect(widget.category).toBe('uncategorized');
    expect(widget.attribution).toBe('Example contributors');
  });

  it('respects exclude globs', async () => {
    const { dir, source } = makeCheckout();
    const { candidates } = await candidatesFromSource(
      { ...source, exclude: ['misc/**'] },
      { checkoutDir: dir },
    );
    expect(candidates.map((c) => c.upstream.path)).toEqual(['gears/spur-gear.step']);
  });
});

describe('ingestCandidate gates', () => {
  const deps = makeDeps();
  const base: PartCandidate = {
    id: 'p1',
    name: 'P1',
    category: 'gear',
    family: 'p1',
    tags: ['fixture'],
    attributes: {},
    license: 'MIT',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    upstream: { repo: 'r', commit: 'c', path: 'p1.step' },
    stepUrl: 'mem://p1',
  };
  const fetchBytes = (s: string): IngestDeps =>
    ({ ...deps, fetchImpl: (async () => new Response(s)) as unknown as typeof fetch });

  it('G3: drops a fetch-only candidate without mirroring', async () => {
    const store = new MemStore();
    const res = await ingestCandidate(
      { ...base, licenseClass: 'fetch-only' },
      store,
      fetchBytes('bytes-a'),
    );
    expect(res.outcome).toBe('dropped-license');
    expect(res.part).toBeUndefined();
    expect(store.putCount).toBe(0);
  });

  it('G3: drops a candidate with empty license', async () => {
    const store = new MemStore();
    const res = await ingestCandidate({ ...base, license: '' }, store, fetchBytes('bytes-a'));
    expect(res.outcome).toBe('dropped-license');
    expect(store.putCount).toBe(0);
  });

  it('G1: skips an unparseable candidate (0 solids)', async () => {
    const store = new MemStore();
    const res = await ingestCandidate(
      { ...base, id: 'p-unparseable' },
      store,
      fetchBytes('bytes-bad'),
    );
    expect(res.outcome).toBe('skipped-unparseable');
    expect(store.putCount).toBe(0);
  });

  it('mirrors a clean candidate with connectors', async () => {
    const store = new MemStore();
    const res = await ingestCandidate(base, store, fetchBytes('bytes-clean'));
    expect(res.outcome).toBe('mirrored');
    expect(res.part?.connectors).toEqual(['mating-face', 'top-face']);
    expect(res.part?.redistribution).toBe('mirror');
    expect(res.part?.source).toBe('remote');
    expect(res.part?.stepUrl).toMatch(/^mem:\/\/step\//);
    expect(store.putCount).toBe(1);
  });

  it('G4: marks a connectorless candidate, still mirrors, adds tag', async () => {
    const store = new MemStore();
    const res = await ingestCandidate(
      { ...base, id: 'p-connectorless' },
      store,
      fetchBytes('bytes-cl'),
    );
    expect(res.outcome).toBe('connectorless');
    expect(res.part?.connectors).toEqual([]);
    expect(res.part?.tags).toContain('connectorless');
    expect(store.putCount).toBe(1);
  });

  it('dedups identical sha256 seen in the same run', async () => {
    const store = new MemStore();
    const seen = new Set<string>();
    const first = await ingestCandidate(base, store, fetchBytes('same-bytes'), { seen });
    expect(first.outcome).toBe('mirrored');
    const second = await ingestCandidate(
      { ...base, id: 'p2' },
      store,
      fetchBytes('same-bytes'),
      { seen },
    );
    expect(second.outcome).toBe('deduped');
    expect(store.putCount).toBe(1);
  });

  it('adds legal-hold tag when the source is on legal hold', async () => {
    const store = new MemStore();
    const res = await ingestCandidate(base, store, fetchBytes('lh-bytes'), { legalHold: true });
    expect(res.part?.tags).toContain('legal-hold');
  });
});

describe('ingestFromRegistry', () => {
  it('merges parts and reports per-source accounting', async () => {
    const { dir, source } = makeCheckout();
    const store = new MemStore();
    const logs: string[] = [];
    const { index, reports } = await ingestFromRegistry([source], store, {
      deps: makeDeps(),
      candidatesOptions: () => ({ checkoutDir: dir }),
      log: (l) => logs.push(l),
    });

    expect(index).toHaveLength(2);
    expect(reports).toHaveLength(1);
    expect(reports[0].ingested).toBe(2);
    expect(reports[0].droppedForLicense).toBe(0);
    expect(logs[0]).toContain('[fixture-src]');
    expect(logs[0]).toContain('ingested=2');
  });
});

describe('verifyCatalog', () => {
  function rec(over: Partial<PartRecord>): PartRecord {
    return {
      id: 'r',
      name: 'R',
      category: 'gear',
      family: 'r',
      tags: [],
      attributes: {},
      sha256: 'sha-present',
      source: 'remote',
      license: 'MIT',
      connectors: ['mating-face'],
      licenseClass: 'permissive',
      redistribution: 'mirror',
      ...over,
    };
  }

  it('passes a clean catalog whose objects are all present', async () => {
    const store = new MemStore();
    store.objects.set('sha-present', new Uint8Array([1]));
    const { ok, problems } = await verifyCatalog([rec({})], store);
    expect(ok).toBe(true);
    expect(problems).toHaveLength(0);
  });

  it('flags a record with empty license (G3)', async () => {
    const store = new MemStore();
    store.objects.set('sha-present', new Uint8Array([1]));
    const { ok, problems } = await verifyCatalog([rec({ license: '' })], store);
    expect(ok).toBe(false);
    expect(problems.some((p) => p.startsWith('G3') && p.includes('empty license'))).toBe(true);
  });

  it('flags a mirror record missing from the store (G2)', async () => {
    const store = new MemStore(); // object NOT added
    const { ok, problems } = await verifyCatalog([rec({})], store);
    expect(ok).toBe(false);
    expect(problems.some((p) => p.startsWith('G2'))).toBe(true);
  });

  it('flags a fetch-only mirror record (G3) and connectorless (G4)', async () => {
    const store = new MemStore();
    store.objects.set('sha-present', new Uint8Array([1]));
    const { ok, problems } = await verifyCatalog(
      [rec({ licenseClass: 'fetch-only', connectors: [], tags: ['connectorless'] })],
      store,
    );
    expect(ok).toBe(false);
    expect(problems.some((p) => p.startsWith('G3') && p.includes('fetch-only'))).toBe(true);
    expect(problems.some((p) => p.startsWith('G4'))).toBe(true);
  });
});
