// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pins examples/drawing-to-cad/ so it cannot rot: the README command writes
// exactly the committed script and ledger, and the committed script builds
// the part the drawing describes.

import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { drawingToCadTool } from '../../../src/agent/mcp/tools/drawingToCad';
import { diffGeometryTool } from '../../../src/agent/mcp/tools/diffGeometry';
import { MOTOR_MOUNT_BRACKET } from '../../helpers/drawingPdf/fixtureModels';

const EXAMPLE_DIR = resolve(__dirname, '../../../examples/drawing-to-cad');

describe('examples/drawing-to-cad', () => {
  beforeAll(async () => { await initOcct(); }, 120_000);

  it('regenerates the committed script and ledger from the committed PDF', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kc-drawing-example-'));
    try {
      const r = await drawingToCadTool({
        path: join(EXAMPLE_DIR, 'motor-mount-bracket.pdf'),
        out: join(dir, 'motor-mount-bracket.kcad.ts'),
      });
      expect(r.ok).toBe(true);
      expect(r.fidelity?.verdict).toBe('match');
      expect(readFileSync(r.scriptPath!, 'utf8')).toBe(readFileSync(join(EXAMPLE_DIR, 'motor-mount-bracket.kcad.ts'), 'utf8'));
      expect(JSON.parse(readFileSync(r.ledgerPath!, 'utf8'))).toEqual(
        JSON.parse(readFileSync(join(EXAMPLE_DIR, 'motor-mount-bracket.ledger.json'), 'utf8')),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);

  it('the committed script is the same solid as the model the drawing was made from', async () => {
    const d = await diffGeometryTool({
      baseCode: MOTOR_MOUNT_BRACKET.code,
      file: join(EXAMPLE_DIR, 'motor-mount-bracket.kcad.ts'),
    });
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.bodies).toHaveLength(1);
    expect(d.bodies[0].addedMm3).toBeLessThan(0.5);
    expect(d.bodies[0].removedMm3).toBeLessThan(0.5);
    expect(d.bodies[0].holeCount).toMatchObject({ base: 3, revised: 3 });
  }, 120_000);
});
