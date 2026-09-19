// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/cli/renderHuman.test.ts
//
// Characterisation tests for the human-readable `kernelcad validate` renderer
// (`renderHuman`, reached through `runValidateCli` with `json: false`).
// Pins the exact console lines for the clean, warning, mechanism-broken and
// physical-diagnostic paths ahead of the complexity split.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runValidateCli, type ValidateCliInput } from '../../../src/agent/cli/commands/validate';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';
import { reviewMechanicalPlausibility } from '../../../src/modeling/mates/mechanicalPlausibility';

vi.mock('../../../src/modeling/runtime/mechanismTruth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/modeling/runtime/mechanismTruth')>();
  return { ...actual, checkMechanismTruth: vi.fn(actual.checkMechanismTruth) };
});

vi.mock('../../../src/modeling/mates/mechanicalPlausibility', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/modeling/mates/mechanicalPlausibility')>();
  return { ...actual, reviewMechanicalPlausibility: vi.fn(actual.reviewMechanicalPlausibility) };
});

const TWO_BOX_FLOATING = `
const arm = assembly('demo');
arm.part('a', box(10, 10, 10));
arm.part('b', box(10, 10, 10), { at: [20, 0, 0] });
return arm.model();
`;

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'kernelcad-render-human-'));
});

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

function fixture(name: string, code: string): string {
  const file = join(dir, name);
  writeFileSync(file, code, 'utf8');
  return file;
}

async function renderCli(input: Omit<ValidateCliInput, 'json'>): Promise<{ lines: string[]; exitCode: number }> {
  const lines: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  });
  try {
    const r = await runValidateCli({ ...input, json: false });
    return { lines, exitCode: r.exitCode };
  } finally {
    spy.mockRestore();
  }
}

describe('renderHuman — human-readable validate output', () => {
  it('renders the clean one-liner for a script with no assembly records', async () => {
    const file = fixture('one-box.kcad.ts', 'return box(10, 10, 10);');
    const { lines, exitCode } = await renderCli({
      file,
      epsilon: 0.01,
      includeInterference: false,
      physical: false,
      includePhysics: false,
    });
    expect(lines).toEqual(['Assembly validates clean (0 parts, 0 joints).']);
    expect(exitCode).toBe(0);
  }, 120_000);

  it('renders the warning header and validator diagnostic lines', async () => {
    const file = fixture('floating.kcad.ts', TWO_BOX_FLOATING);
    const { lines, exitCode } = await renderCli({
      file,
      epsilon: 0.01,
      includeInterference: false,
      physical: false,
      includePhysics: false,
    });
    expect(lines).toMatchInlineSnapshot(`
      [
        "Assembly status: WARNING (2 parts, 0 joints; 0 errors, 2 warnings)",
        "  [WARN] assembly.part.floating",
        "         Part 'a' has no joint connecting it to any other part.",
        "         hint: invalid-args.assembly.floating-part — declare a connection via arm.mate('a-mount', 'a.<connector>', '<other>.<connector>', 'fastened') (or 'revolute' / 'prismatic' / 'ball' as appropriate) so the assembly graph reflects how parts actually mate.",
        "  [WARN] assembly.part.floating",
        "         Part 'b' has no joint connecting it to any other part.",
        "         hint: invalid-args.assembly.floating-part — declare a connection via arm.mate('b-mount', 'b.<connector>', '<other>.<connector>', 'fastened') (or 'revolute' / 'prismatic' / 'ball' as appropriate) so the assembly graph reflects how parts actually mate.",
      ]
    `);
    expect(exitCode).toBe(1);
  }, 120_000);

  it('renders the mechanism-broken banner before the validator diagnostics', async () => {
    vi.mocked(checkMechanismTruth).mockResolvedValue({
      mechanism: 'broken',
      failures: [{
        target: 'export-occt',
        code: 'mechanism.test-broken',
        severity: 'error',
        message: 'Mate limits disagree.',
        hint: 'Re-author the mate.',
      }],
    });
    const file = fixture('broken.kcad.ts', TWO_BOX_FLOATING);
    const { lines, exitCode } = await renderCli({
      file,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      includePhysics: false,
    });
    expect(lines).toMatchInlineSnapshot(`
      [
        "MECHANISM BROKEN — this assembly will not work as built (1 failure)",
        "  [ERROR] mechanism.test-broken",
        "         Mate limits disagree.",
        "         hint: Re-author the mate.",
        "",
        "Assembly status: ERROR (2 parts, 0 joints; 0 errors, 2 warnings)",
        "  [WARN] assembly.part.floating",
        "         Part 'a' has no joint connecting it to any other part.",
        "         hint: invalid-args.assembly.floating-part — declare a connection via arm.mate('a-mount', 'a.<connector>', '<other>.<connector>', 'fastened') (or 'revolute' / 'prismatic' / 'ball' as appropriate) so the assembly graph reflects how parts actually mate.",
        "  [WARN] assembly.part.floating",
        "         Part 'b' has no joint connecting it to any other part.",
        "         hint: invalid-args.assembly.floating-part — declare a connection via arm.mate('b-mount', 'b.<connector>', '<other>.<connector>', 'fastened') (or 'revolute' / 'prismatic' / 'ball' as appropriate) so the assembly graph reflects how parts actually mate.",
      ]
    `);
    expect(exitCode).toBe(2);
  }, 120_000);

  it('renders physical plausibility diagnostics after the validator diagnostics', async () => {
    vi.mocked(reviewMechanicalPlausibility).mockResolvedValue({
      diagnostics: [{
        code: 'assembly.mechanical.part-disconnected',
        severity: 'warning',
        message: "Part 'a' is a disconnected solid.",
        hint: 'Join it to the main component.',
        partName: 'a',
        componentCount: 2,
        largestComponentTriangleCount: 12,
        maxComponentGapMm: 3,
        bbox: { min: [0, 0, 0], max: [10, 10, 10] },
      }],
      checkedMateConnectorCount: 0,
      checkedFastenedMateContactCount: 0,
    });
    const file = fixture('physical.kcad.ts', TWO_BOX_FLOATING);
    const { lines, exitCode } = await renderCli({
      file,
      epsilon: 0.01,
      includeInterference: false,
      physical: true,
      includePhysics: false,
    });
    expect(lines).toMatchInlineSnapshot(`
      [
        "Assembly status: WARNING (2 parts, 0 joints; 0 errors, 3 warnings)",
        "  [WARN] assembly.part.floating",
        "         Part 'a' has no joint connecting it to any other part.",
        "         hint: invalid-args.assembly.floating-part — declare a connection via arm.mate('a-mount', 'a.<connector>', '<other>.<connector>', 'fastened') (or 'revolute' / 'prismatic' / 'ball' as appropriate) so the assembly graph reflects how parts actually mate.",
        "  [WARN] assembly.part.floating",
        "         Part 'b' has no joint connecting it to any other part.",
        "         hint: invalid-args.assembly.floating-part — declare a connection via arm.mate('b-mount', 'b.<connector>', '<other>.<connector>', 'fastened') (or 'revolute' / 'prismatic' / 'ball' as appropriate) so the assembly graph reflects how parts actually mate.",
        "  [WARN] assembly.mechanical.part-disconnected",
        "         Part 'a' is a disconnected solid.",
        "         hint: Join it to the main component.",
      ]
    `);
    expect(exitCode).toBe(1);
  }, 120_000);
});
