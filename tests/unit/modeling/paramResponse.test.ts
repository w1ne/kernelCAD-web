// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { ParamTable } from '../../../src/shared/runtime/paramTable';
import {
  PARAM_RESPONSE_BUDGET_MS,
  classifyParamStep,
  heavyParamResponses,
  legalParamStep,
} from '../../../src/modeling/paramResponse';

describe('classifyParamStep', () => {
  it('hides a step that does not change a feature', () => {
    expect(classifyParamStep({ relowered: [], elapsedMs: 10, shapeChanged: false })).toBe('heavy');
  });

  it('calls a fast solid edit local', () => {
    expect(classifyParamStep({
      relowered: [{ id: 'box_1', kind: 'box' }],
      elapsedMs: PARAM_RESPONSE_BUDGET_MS,
      shapeChanged: true,
    })).toBe('local');
  });

  it('hides a solid edit that misses the budget', () => {
    expect(classifyParamStep({
      relowered: [{ id: 'box_1', kind: 'box' }],
      elapsedMs: PARAM_RESPONSE_BUDGET_MS + 1,
      shapeChanged: true,
    })).toBe('heavy');
  });

  it('calls a fast pose-only edit rigid', () => {
    expect(classifyParamStep({
      relowered: [{ id: 'solved_1', kind: 'solvedAssembly' }],
      elapsedMs: 40,
      shapeChanged: true,
    })).toBe('rigid');
  });

  it('hides a pose edit that misses the budget', () => {
    expect(classifyParamStep({
      relowered: [{ id: 'solved_1', kind: 'solvedAssembly' }],
      elapsedMs: 900,
      shapeChanged: true,
    })).toBe('heavy');
  });
});

describe('legalParamStep', () => {
  it('steps a number up, and down when up would pass the maximum', () => {
    const table = new ParamTable();
    table.declare('width', 'number', 10, { min: 1, max: 40, step: 2 });
    expect(legalParamStep(table.get('width'))).toBe(12);
    table.declare('bodyDiameter', 'number', 72, { min: 58, max: 72 });
    expect(legalParamStep(table.get('bodyDiameter'))).toBe(71);
  });

  it('has no step when the number is pinned to a single value', () => {
    const table = new ParamTable();
    table.declare('fixed', 'number', 58, { min: 58, max: 58 });
    expect(legalParamStep(table.get('fixed'))).toBeNull();
  });

  it('flips a boolean and moves a choice to another declared value', () => {
    const table = new ParamTable();
    table.declare('cutaway', 'boolean', false);
    table.declare('bearing', 'choice', '608', { choices: ['608', '6000'] });
    expect(legalParamStep(table.get('cutaway'))).toBe(true);
    expect(legalParamStep(table.get('bearing'))).toBe('6000');
  });
});

describe('heavyParamResponses', () => {
  it('stamps every name heavy when a publish cannot prove a drag', () => {
    expect(heavyParamResponses(['width', 'knurl'])).toEqual({ width: 'heavy', knurl: 'heavy' });
  });
});
