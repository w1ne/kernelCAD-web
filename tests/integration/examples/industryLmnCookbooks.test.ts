// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Industry L/M/N chain cookbooks must evaluate on the agent path
// (evaluate_script), not only as markdown. M/N require mechanism=real.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

function snippetBody(id: string): string {
  const md = readFileSync(`cookbook/snippets/${id}.md`, 'utf8');
  return md.split('```typescript')[1].split('```')[0];
}

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('industry L/M/N chain cookbooks evaluate green', () => {
  it('gt2-shop-release-actuator full evaluate is green with the shop parts', async () => {
    const r = await evaluateScriptTool({ code: snippetBody('gt2-shop-release-actuator') });
    expect(r.ok, JSON.stringify(r.diagnostics?.slice(0, 6))).toBe(true);
    expect(r.mechanism).not.toBe('broken');
    expect(r.parts?.names.sort()).toEqual([
      'bearing-608',
      'cover',
      'gt2-belt',
      'housing',
      'pulley-drive',
      'pulley-idler',
      'shaft',
    ]);
  }, 180_000);

  it('mated inspection head is mechanism=real with param-backed animation', async () => {
    const code = snippetBody('mated-inspection-head-routed-tube-animation');
    expect(code).toMatch(/const yawDeg = param\('yawDeg'/);
    expect(code).toMatch(/const tiltDeg = param\('tiltDeg'/);
    expect(code.indexOf("const yawDeg = param('yawDeg'")).toBeLessThan(code.indexOf('animationView({'));
    const r = await evaluateScriptTool({ code });
    expect(r.mechanism, JSON.stringify(r.diagnostics?.slice(0, 6))).toBe('real');
    expect(r.ok, JSON.stringify(r.diagnostics?.slice(0, 6))).toBe(true);
    expect(r.parts?.names.sort()).toEqual([
      'base-frame',
      'service-tube',
      'tilt-head',
      'tilt-servo',
      'yaw-stage',
    ]);
  }, 180_000);

  it('4dof release pack is mechanism=real and keeps static-hold in the script', async () => {
    const code = snippetBody('4dof-release-evidence-pack');
    expect(code).toMatch(/const baseYawDeg = param\('baseYawDeg'/);
    expect(code.indexOf("const baseYawDeg = param('baseYawDeg'")).toBeLessThan(code.indexOf('animationView({'));
    expect(code).toContain('kinematic.checkStaticHold');
    const r = await evaluateScriptTool({ code });
    expect(r.mechanism, JSON.stringify(r.diagnostics?.slice(0, 8))).toBe('real');
    expect(r.ok, JSON.stringify(r.diagnostics?.slice(0, 8))).toBe(true);
    expect(r.parts?.names).toEqual(expect.arrayContaining([
      'base-frame',
      'yaw-turret',
      'upper-link',
      'forearm-link',
      'wrist-link',
    ]));
  }, 180_000);
});
