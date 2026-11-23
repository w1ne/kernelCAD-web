// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { addMateSource } from '../../agent/mcp/edits/assemblySourceEdits';
import { createModelingApi } from '../api';
import { CaptureSession } from '../capture/captureSession';
import { validateAssemblyWithMates } from './validator';

describe('adhesive mate contact', () => {
  it('writes explicit adhesive faces into MCP-authored source', () => {
    const result = addMateSource({
      code: "const arm = assembly('panels'); return arm.solvedModel();",
      assembly_binding: 'arm',
      name: 'glue',
      a: 'base.seat',
      b: 'panel.seat',
      type: 'fastened',
      adhesive: { face_a: 'right', face_b: 'left' },
    });
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).toMatch(/adhesive.*faceA.*right.*faceB.*left/);
  });

  it.each([
    ['partial face contact', 10, 4, false],
    ['edge contact', 10, 10, true],
    ['separated faces', 11, 0, true],
  ] as const)('reports the declared interface for %s', async (_case, x, y, invalid) => {
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('two panels');
    arm.part('base', kcad.box(10, 10, 10, true))
      .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [x, y, 0] } });
    arm.part('panel', kcad.box(10, 10, 10, true))
      .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('glue', 'base.seat', 'panel.seat', 'fastened', {
      adhesive: { faceA: 'right', faceB: 'left' },
    });
    const result = await validateAssemblyWithMates(arm);
    expect(result.partCount).toBe(2);
    expect(result.diagnostics.filter((item) => item.code.startsWith('assembly.mounting-hole.'))).toEqual([]);
    expect(result.diagnostics.filter((item) => item.code === 'assembly.mate.adhesive-contact')).toHaveLength(invalid ? 1 : 0);
  });
});
