// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CaptureSession } from '../capture/captureSession';

const state = vi.hoisted(() => ({
  healedBackends: new WeakSet<object>(),
  importedBackend: {},
  selectedBackend: {},
}));

vi.mock('./stepParseCache', () => ({
  importStepCached: vi.fn(async () => state.importedBackend),
  isStepBackendHealed: vi.fn((backend: object) => state.healedBackends.has(backend)),
  StepParseError: class StepParseError extends Error {},
}));

vi.mock('../../kernel/backends/occt/stepSolidPicker', () => ({
  pickSolid: vi.fn(() => ({ solid: state.selectedBackend, count: 2 })),
}));

import { fromSTEP } from './fromSTEP';

describe('lib.fromSTEP metadata', () => {
  let dir = '';

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kcad-step-metadata-'));
    writeFileSync(join(dir, 'multi.step'), 'ISO-10303-21; DATA; ENDSEC;');
    state.healedBackends.add(state.importedBackend);
  });

  it('preserves the healed status when a solid is selected from the import', async () => {
    const session = new CaptureSession();
    const shape = await fromSTEP({ session, scriptDir: dir }, 'multi.step', { solid: 1 });

    expect(session.getRecords()[0]?.metadata).toMatchObject({ solidIndex: 1, healed: true });
    expect(session.importedGeometry.get(shape.id)).toBe(state.selectedBackend);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    state.healedBackends.delete(state.importedBackend);
  });
});
