// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { GenerateEvent } from './generateClient';
import { formatElapsed } from './formatElapsed';
import { generationSteps, partialSummary, serverElapsedMs } from './generationProgress';

const progress = (stage: string, message: string, elapsedMs = 1000): GenerateEvent => ({ kind: 'progress', stage, message, elapsedMs });

describe('generationSteps', () => {
  it('starts on "Plan the part" before any progress arrives', () => {
    const steps = generationSteps([{ kind: 'status', phase: 'running' }]);
    expect(steps.map((s) => s.state)).toEqual(['current', 'pending', 'pending', 'pending']);
  });

  it('marks earlier steps done and shows what the current one is doing', () => {
    const steps = generationSteps([progress('planning', 'Planning'), progress('writing_code', 'Writing'), progress('fixing', 'Fixing error 2')]);
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'pending']);
    expect(steps[2]).toMatchObject({ label: 'Build the geometry', detail: 'Fixing error 2' });
  });

  it('never moves backwards, and an unknown stage keeps the step', () => {
    const steps = generationSteps([progress('verifying', 'Checking'), progress('planning', 'Re-planning'), progress('mystery', 'Something new')]);
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'done', 'current']);
    expect(steps[3].detail).toBe('Something new');
  });

  it('says so when the request joined a run already in progress', () => {
    const steps = generationSteps([{ kind: 'attached', message: 'x' }]);
    expect(steps[0].detail).toMatch(/already in progress/);
  });

  it('reads the latest server elapsed time', () => {
    expect(serverElapsedMs([progress('planning', 'a', 3000), progress('writing_code', 'b', 9000)])).toBe(9000);
    expect(serverElapsedMs([])).toBeNull();
  });
});

describe('partialSummary', () => {
  it('names the checks that did not run', () => {
    expect(partialSummary({ reason: 'timeout', stage: 'verifying', unverified: ['interference', 'wall_thickness'], note: '' }))
      .toBe('The run stopped early. The model builds, but these did not run or did not pass: interference check and wall thickness.');
  });

  it('still says the model was not fully checked when no check is named', () => {
    expect(partialSummary({ reason: 'timeout', stage: 'x', unverified: [], note: '' })).toMatch(/not fully checked/);
  });
});

describe('formatElapsed', () => {
  it('formats minutes and seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(7_900)).toBe('0:07');
    expect(formatElapsed(150_000)).toBe('2:30');
    expect(formatElapsed(-5)).toBe('0:00');
    expect(formatElapsed(Number.NaN)).toBe('0:00');
  });
});
