// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Post-condition trust gate: evaluate_script must surface the per-feature
// health map so an agent can see WHICH feature degraded (silently fell back
// to a passthrough, or errored) even when the overall run still reports
// ok: true. The RecomputeEngine already computes this map; these tests pin
// that it reaches the agent-facing output as a lean `featureHealth` list of
// ONLY the non-healthy features.

import { describe, it, expect } from 'vitest';
import { evaluateScriptTool } from './evaluateScript';
import { TOOL_OUTPUT_SCHEMAS } from '../toolOutputSchemas';

// A gated-off cutout named `pocket` whose floor face a downstream cutout
// targets. With the gate false, `pocket` becomes a no-op, so the downstream
// `innerCut` silently falls back to a passthrough — the engine marks it
// `warning` while the overall evaluation still succeeds (exitCode 0). This is
// the exact "feature degraded but ok: true" case the trust gate must expose.
const DEGRADING_SCRIPT = `
const enablePocket = param('enablePocket', false);
const b = box(80, 60, 30);
const pocketed = b.cutout(
  path().moveTo(-10,-10).lineTo(10,-10).lineTo(10,10).lineTo(-10,10).close(),
  { face: 'top', depth: 10, name: 'pocket', enabled: enablePocket },
);
const second = pocketed.cutout(
  path().moveTo(-4,-4).lineTo(4,-4).lineTo(4,4).lineTo(-4,4).close(),
  { face: 'pocket.floor', depth: 5, name: 'innerCut' },
);
return second;
`;

// Same model with the gate enabled — every feature lowers cleanly.
const HEALTHY_SCRIPT = `
const b = box(80, 60, 30);
const pocketed = b.cutout(
  path().moveTo(-10,-10).lineTo(10,-10).lineTo(10,10).lineTo(-10,10).close(),
  { face: 'top', depth: 10, name: 'pocket', enabled: true },
);
const second = pocketed.cutout(
  path().moveTo(-4,-4).lineTo(4,-4).lineTo(4,4).lineTo(-4,4).close(),
  { face: 'pocket.floor', depth: 5, name: 'innerCut' },
);
return second;
`;

describe('evaluate_script featureHealth', () => {
  it('surfaces the degraded feature with status warning even when ok is true', async () => {
    const out = await evaluateScriptTool({ code: DEGRADING_SCRIPT });

    // The overall run still succeeds — this is the whole point: a degraded
    // feature would otherwise be invisible.
    expect(out.ok).toBe(true);

    expect(out.featureHealth).toBeDefined();
    const entries = out.featureHealth!;
    // Only the non-healthy feature(s) appear.
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const degraded = entries.find((e) => e.status !== 'healthy');
    expect(degraded).toBeDefined();
    // The passthrough fallback is the downstream cutout (`cutout_2`).
    expect(degraded!.featureId).toBe('cutout_2');
    expect(degraded!.status).toBe('warning');
    // Healthy features are NOT listed (lean payload).
    expect(entries.every((e) => e.status === 'warning' || e.status === 'error')).toBe(true);
  });

  it('returns an empty featureHealth list for a fully-healthy model', async () => {
    const out = await evaluateScriptTool({ code: HEALTHY_SCRIPT });
    expect(out.ok).toBe(true);
    expect(out.featureHealth).toEqual([]);
  });

  it('declares featureHealth in the MCP output schema so it survives the wire', () => {
    const schema = TOOL_OUTPUT_SCHEMAS.evaluate_script;
    expect(schema.properties.featureHealth).toBeDefined();
  });
});
