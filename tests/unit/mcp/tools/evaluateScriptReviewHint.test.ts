// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// evaluate_script's mechanism check is shallow next to review_cad: it missed
// missing joint-support intents, a pose-envelope overlap at a declared limit
// and a gravity drop. A model with articulated mates now carries a
// `reviewHint` that says so and points at review_cad.

import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool, MATES_REVIEW_HINT } from '../../../../src/agent/mcp/tools/evaluateScript';
import { TOOL_OUTPUT_SCHEMAS } from '../../../../src/agent/mcp/toolOutputSchemas';

const ARM = readFileSync('tests/unit/kinematic/fixtures/desk-arm-mates.kcad.ts', 'utf8');

const FASTENED_ONLY = `
const arm = assembly('plate-stack');
const a = arm.part('a', box(20, 20, 5));
const b = arm.part('b', box(20, 20, 5));
a.connector('top', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 5] } });
b.connector('bottom', { type: 'frame', origin: { kind: 'vec3', value: [10, 10, 0] } });
arm.mate('stack', 'a.top', 'b.bottom', 'fastened');
return arm.model();`;

describe('evaluate_script reviewHint', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('points a model with articulated mates at review_cad', async () => {
    const out = await evaluateScriptTool({ code: ARM, skipMechanismCheck: true });
    expect(out.ok, JSON.stringify(out.diagnostics)).toBe(true);
    expect(out.reviewHint).toBe(MATES_REVIEW_HINT);
    expect(out.reviewHint).toMatch(/run review_cad for pose-envelope \+ gravity checks/i);
    expect(out.reviewHint).toMatch(/joint-support intents/);
  }, 120_000);

  it('stays quiet for fastened-only assemblies and plain parts', async () => {
    const fastened = await evaluateScriptTool({ code: FASTENED_ONLY, skipMechanismCheck: true });
    expect(fastened.reviewHint).toBeUndefined();
    const part = await evaluateScriptTool({ code: 'return box(10, 10, 10);' });
    expect(part.reviewHint).toBeUndefined();
  }, 120_000);

  it('declares reviewHint in the MCP output schema', () => {
    expect(TOOL_OUTPUT_SCHEMAS.evaluate_script.properties.reviewHint).toBeDefined();
  });
});
