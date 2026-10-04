// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, it, expect } from 'vitest';
import {
  executeCookbookTool,
  setExecuteCookbookOpenInStudioHook,
} from './executeCookbook';
import { TOOL_OUTPUT_SCHEMAS } from '../toolOutputSchemas';
import { getToolDefinition } from '../toolRegistry';

describe('executeCookbookTool', () => {
  afterEach(() => {
    setExecuteCookbookOpenInStudioHook(null);
  });

  it('resolves by id and returns cookbook metadata', async () => {
    const r = await executeCookbookTool({ id: 'gt2-timing-belt-drive', dryRun: true });
    expect(r.cookbookId).toBe('gt2-timing-belt-drive');
    expect(r.title).toMatch(/GT2/i);
    expect(r.executionId).toMatch(/^[0-9a-f]{8}$/);
    expect(r.code).toContain('gt2Pulley');
    expect(r.evaluate).toBeDefined();
    expect(r.dryRunNotEvidence).toBe(true);
  });

  it('evaluates green on a small cookbook (extrude-rounded-rect-plate)', async () => {
    const r = await executeCookbookTool({ id: 'extrude-rounded-rect-plate' });
    expect(r.ok, JSON.stringify(r.evaluate?.diagnostics)).toBe(true);
    expect(r.cookbookId).toBe('extrude-rounded-rect-plate');
    expect(r.evaluate?.ok).toBe(true);
    expect(r.evaluate?.featureCount).toBeGreaterThan(0);
    expect(r.stage).toBeUndefined();
  });

  it('rejects unknown id with stage resolve', async () => {
    const r = await executeCookbookTool({ id: 'no-such-cookbook-xyz' });
    expect(r.ok).toBe(false);
    expect(r.stage).toBe('resolve');
    expect(r.error).toMatch(/unknown cookbook id/i);
    expect(r.executionId).toBeTruthy();
  });

  it('documents dryRun:true is NOT evidence (and still resolves)', async () => {
    const r = await executeCookbookTool({ id: 'extrude-rounded-rect-plate', dryRun: true });
    expect(r.ok).toBe(true);
    expect(r.evaluate?.dryRun).toBe(true);
    expect(r.dryRunNotEvidence).toBe(true);
    // Schema / description contract: dryRun success must not be treated as build proof.
    const def = getToolDefinition('execute_cookbook');
    expect(def?.description).toMatch(/dryRun:true[\s\S]*NOT evidence/i);
    expect(TOOL_OUTPUT_SCHEMAS.execute_cookbook.properties.dryRunNotEvidence).toBeDefined();
  });

  it('refuses openInStudio when dryRun:true', async () => {
    const r = await executeCookbookTool({
      id: 'extrude-rounded-rect-plate',
      dryRun: true,
      openInStudio: true,
    });
    expect(r.ok).toBe(false);
    expect(r.stage).toBe('open_in_studio');
    expect(r.error).toMatch(/NOT evidence/i);
    expect(r.openInStudio?.ok).toBe(false);
  });

  it('calls open_in_studio hook after green evaluate when requested', async () => {
    setExecuteCookbookOpenInStudioHook(async ({ code, title, cookbookId }) => {
      expect(cookbookId).toBe('extrude-rounded-rect-plate');
      expect(title.length).toBeGreaterThan(0);
      expect(code).toContain('extrudeRoundedRect');
      return { ok: true, slug: 'test-slug', url: 'https://example.test/p/test-slug' };
    });
    const r = await executeCookbookTool({
      id: 'extrude-rounded-rect-plate',
      openInStudio: true,
    });
    expect(r.ok).toBe(true);
    expect(r.openInStudio?.ok).toBe(true);
    expect(r.openInStudio?.slug).toBe('test-slug');
  });

  it('resolves by query via BM25 top hit when id omitted', async () => {
    const r = await executeCookbookTool({
      query: 'rounded-corner plate rectangular extrudeRoundedRect',
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    expect(r.cookbookId).toBe('extrude-rounded-rect-plate');
  });
});
