// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/links/referral.gate.test.ts
//
// Gate: `buildVendorUrl` (referral.ts) is the only producer of outbound vendor
// URLs, and vendor data stays clean.
//
//   1. No shipped source file outside referral.ts carries a raw vendor URL
//      literal (comments are allowed; they never reach a user).
//   2. Every module that emits vendor URLs from data routes them through the
//      builder, checked at runtime with tags switched on.
//   3. Vendor data files hold clean URLs: no referral or tracking parameters.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { VENDOR_REFERRALS, buildVendorUrl, REFERRAL_DISCLOSURE } from '../../../src/shared/links/referral';

const REPO = join(__dirname, '..', '..', '..');
const SCAN_ROOTS = ['src', 'workers', 'site/src'];
const BUILDER = join('src', 'shared', 'links', 'referral.ts');
const SOURCE_EXT = /\.(ts|tsx|mts|js|mjs|astro)$/;
const TEST_FILE = /\.(test|spec)\.[a-z]+$|[\\/]__tests__[\\/]/;
const URL_RE = /https?:\/\/[^\s'"`)<>\\]+/g;

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
}

function isVendorUrl(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return VENDOR_REFERRALS.some((v) => v.hosts.some((re) => re.test(hostname)));
}

function isCommentLine(line: string): boolean {
  const t = line.trimStart();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/** `file:line url` for every raw vendor URL literal in shipped source. */
function rawVendorUrlEmitters(repo: string = REPO): string[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) walk(join(repo, root), files);
  const hits: string[] = [];
  for (const file of files) {
    const rel = relative(repo, file);
    if (!SOURCE_EXT.test(rel) || TEST_FILE.test(rel) || rel === BUILDER) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      for (const m of line.matchAll(URL_RE)) {
        if (isVendorUrl(m[0])) hits.push(`${rel.split(sep).join('/')}:${i + 1} ${m[0]}`);
      }
    });
  }
  return hits;
}

describe('referral gate: buildVendorUrl is the only vendor-URL emitter', () => {
  it('no raw vendor URL literal in shipped source outside referral.ts', () => {
    expect(rawVendorUrlEmitters()).toEqual([]);
  });
});

describe('referral gate: data-driven emit points go through the builder', () => {
  const env = { KERNELCAD_REFERRAL_SENDCUTSEND: 'gate-scs', KERNELCAD_REFERRAL_IGUS: 'gate-igus' };

  beforeAll(() => {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("fetch_part link_out (surface 'part')", async () => {
    const { fetchPartFromUrlHost } = await import('../../../src/modeling/parts/fetchPart');
    const { CaptureSession } = await import('../../../src/modeling/capture/captureSession');
    const clean = 'https://igus.partcommunity.com/portal/x';
    const fetchImpl = vi.fn();
    const outcome = await fetchPartFromUrlHost(
      { session: new CaptureSession() },
      clean,
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    if (!outcome.ok || outcome.kind !== 'link_out') throw new Error('expected link_out');
    expect(outcome.url).toBe(buildVendorUrl(clean, { surface: 'part', env }));
    expect(new URL(outcome.url).searchParams.get('ref')).toBe('gate-igus');
    expect(outcome.disclosure).toBe(REFERRAL_DISCLOSURE);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fetch_part link_out stays clean and undisclosed with no tag", async () => {
    vi.stubEnv('KERNELCAD_REFERRAL_IGUS', '');
    const { fetchPartFromUrlHost } = await import('../../../src/modeling/parts/fetchPart');
    const { CaptureSession } = await import('../../../src/modeling/capture/captureSession');
    const clean = 'https://igus.partcommunity.com/portal/x';
    const outcome = await fetchPartFromUrlHost({ session: new CaptureSession() }, clean);
    if (!outcome.ok || outcome.kind !== 'link_out') throw new Error('expected link_out');
    expect(outcome.url).toBe(clean);
    expect(outcome.disclosure).toBeUndefined();
  });

  it("dfm-preflight catalog sources (surface 'shopcheck')", async () => {
    const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
    await initOcct();
    const { dfmPreflightTool } = await import('../../../src/agent/mcp/tools/dfmPreflight');
    const r = await dfmPreflightTool({
      file: 'tests/fixtures/shopcheck/passing-bracket.kcad.ts',
      vendor: 'sendcutsend', material: 'aluminum-6061-t6', thicknessIn: 0.125,
    });
    const manifest = JSON.parse(readFileSync(
      join(REPO, 'src/agent/skills/kernelcad-shopcheck/catalogs/sources-manifest.json'), 'utf8',
    )) as { vendors: Record<string, { sources: Array<{ url: string }> }> };
    const expected = manifest.vendors.sendcutsend!.sources
      .map((s) => buildVendorUrl(s.url, { surface: 'shopcheck', env }));
    expect(expected.length).toBeGreaterThan(0);
    expect(r.sources).toEqual(expected);
    expect(r.disclosure).toBe(REFERRAL_DISCLOSURE);
  }, 60000);
});

describe('referral gate: vendor data stores clean URLs', () => {
  const TRACKING = /[?&](ref|tag|aff|affiliate|utm_[a-z]+|irclickid|clickid)=/i;

  it('vendor catalog JSON carries no referral or tracking parameters', () => {
    const files: string[] = [];
    walk(join(REPO, 'src', 'agent', 'skills'), files);
    const dirty: string[] = [];
    for (const file of files.filter((f) => f.endsWith('.json'))) {
      for (const m of readFileSync(file, 'utf8').matchAll(URL_RE)) {
        if (isVendorUrl(m[0]) && TRACKING.test(m[0])) dirty.push(`${relative(REPO, file)} ${m[0]}`);
      }
    }
    expect(dirty).toEqual([]);
  });
});
