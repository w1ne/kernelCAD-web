// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Calibration guard for the text-pattern quality facts used by the design loop.
// They are heuristics over source text, so the only ground truth we trust is the
// expert solution written for each mech40 prompt. None of them may be flagged,
// including the prompts that trip the production-intent gate.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { scriptQualityFacts } from '../../src/agent/loop/designLoopQualityFacts';
import { listMech40Tasks } from './tasks';

describe('text quality facts vs mech40 expert solutions', () => {
  const tasks = listMech40Tasks();

  it('finds the mech40 task set', () => {
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('flags none of the expert solutions under their own prompts', () => {
    const flagged = tasks.flatMap((task) => {
      const solution = readFileSync(task.solution, 'utf8');
      const prompt = readFileSync(task.prompt, 'utf8');
      return scriptQualityFacts(solution, prompt, []).map((fact) => `${task.id} ${fact.code}`);
    });
    expect(flagged).toEqual([]);
  });
});
