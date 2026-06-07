// tests/unit/mcp/tools/inspectStep.test.ts
//
// Unit tests for the `inspect_step` MCP tool — read-only STEP file
// interrogation (solid tree + hole report). Unlike the script tools this
// takes a STEP file path directly; no { code } mode exists. Fixture: same
// two-disjoint-solid STEP recipe as the CLI tests.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { inspectStepTool } from '../../../../src/agent/mcp/tools/inspectStep';
import { inspectStepFile } from '../../../../src/agent/inspect/inspectStep';
import { callMcpTool, getToolDefinition } from '../../../../src/agent/mcp/toolRegistry';

vi.mock('../../../../src/agent/inspect/inspectStep', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/agent/inspect/inspectStep')>();
  return { ...actual, inspectStepFile: vi.fn(actual.inspectStepFile) };
});

let tmpDir: string;
let stepPath: string;

beforeAll(async () => {
  await initOcct();
  // Plate with a Ø4 blind hole 6 deep + a disjoint cube — round-trips as a
  // 2-solid compound.
  const plate = OcctBackend.box(20, 20, 10, true)
    .subtract(OcctBackend.cylinder(6, 2).translate(0, 0, -1));
  const cube = OcctBackend.box(5, 5, 5, true).translate(40, 0, 0);
  const compound = plate.union(cube);
  tmpDir = mkdtempSync(join(tmpdir(), 'kcad-inspectmcp-'));
  stepPath = join(tmpDir, 'two-solids.step');
  writeFileSync(stepPath, await compound.exportSTEPAsync());
}, 60000);

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('inspect_step MCP tool', () => {
  it('returns ok + full report for a valid STEP file', async () => {
    const r = await inspectStepTool({ file: stepPath });
    expect(r.ok).toBe(true);
    expect(r.error).toBeUndefined();
    expect(r.report?.solidCount).toBe(2);
    expect(r.report?.solids).toHaveLength(2);
    const plate = r.report!.solids.find((s) => s.volumeMm3 > 1000)!;
    expect(plate.holes).toHaveLength(1);
    expect(plate.holes[0].diameterMm).toBeCloseTo(4, 1);
    expect(plate.holes[0].kind).toBe('blind');
  }, 60000);

  it('returns ok: false with feature.invalid-args for a missing file', async () => {
    const r = await inspectStepTool({ file: '/tmp/definitely-missing.step' });
    expect(r.ok).toBe(false);
    expect(r.report).toBeUndefined();
    expect(r.errorCode).toBe('feature.invalid-args');
    expect(r.error).toBeTruthy();
    expect(r.errorHint).toBeTruthy();
  });

  it('returns ok: false with feature.invalid-args when input.file is absent', async () => {
    const r = await inspectStepTool({} as Parameters<typeof inspectStepTool>[0]);
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.invalid-args');
    expect(r.error).toMatch(/file/);
  });

  it('returns ok: false with feature.kernel-failed for unparseable STEP bytes', async () => {
    const badPath = join(tmpDir, 'garbage.step');
    writeFileSync(badPath, 'ISO-10303-21; this is not a valid STEP body');
    const r = await inspectStepTool({ file: badPath });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.kernel-failed');
    expect(r.errorHint).toBeTruthy();
  });

  it('clamps non-KernelError throws to cli.script-exception (no code leak)', async () => {
    vi.mocked(inspectStepFile).mockRejectedValueOnce({ code: 'ENOENT' });
    const r = await inspectStepTool({ file: stepPath });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cli.script-exception');
    expect(r.errorHint).toBeUndefined();
  });

  it('is registered in TOOL_REGISTRY and dispatchable via callMcpTool', async () => {
    const def = getToolDefinition('inspect_step');
    expect(def).toBeDefined();
    expect(def!.inputSchema.required).toEqual(['file']);
    const r = (await callMcpTool('inspect_step', { file: stepPath })) as {
      ok: boolean;
      report?: { solidCount: number };
    };
    expect(r.ok).toBe(true);
    expect(r.report?.solidCount).toBe(2);
  }, 60000);
});
