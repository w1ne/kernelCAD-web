// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { guessUnit, humanizeParamName, looksLikeCount, niceCeil, sliderRange, sliderStep } from './paramPresentation';

describe('humanizeParamName', () => {
  it.each([
    ['plateW', 'Plate width'],
    ['m4HeadDia', 'M4 head diameter'],
    ['earOverlap', 'Ear overlap'],
    ['HasLid', 'Has lid'],
    ['wall_t', 'Wall thickness'],
    ['boltDia', 'Bolt diameter'],
    ['PCBHoleX', 'PCB hole X'],
    ['hole2Dia', 'Hole 2 diameter'],
    ['m4Clear', 'M4 clearance'],
    ['Width', 'Width'],
    ['w', 'Width'],
  ])('%s → %s', (name, label) => {
    expect(humanizeParamName(name)).toBe(label);
  });
});

describe('guessUnit', () => {
  it.each([
    ['plateW', 'mm'],
    ['boreDia', 'mm'],
    ['slotAngle', '°'],
    ['twist', '°'],
    ['holeCount', undefined],
    ['numTeeth', undefined],
    ['density', undefined],
  ])('%s → %s', (name, unit) => {
    expect(guessUnit(name)).toBe(unit);
  });

  it('marks counts, not ratios, as whole numbers', () => {
    expect(looksLikeCount('holeCount')).toBe(true);
    expect(looksLikeCount('gearRatio')).toBe(false);
  });
});

describe('slider range and step', () => {
  it('rounds up to 1, 2 or 5 × 10^k', () => {
    expect([0.3, 1, 3, 40, 94, 188, 600].map(niceCeil)).toEqual([0.5, 1, 5, 50, 100, 200, 1000]);
  });

  it('keeps declared bounds and fills a missing side from the default', () => {
    expect(sliderRange(40, { min: 10, max: 80 })).toEqual({ min: 10, max: 80 });
    expect(sliderRange(40, {})).toEqual({ min: 0, max: 100 });
    expect(sliderRange(40, { min: 5 })).toEqual({ min: 5, max: 100 });
    expect(sliderRange(4, { max: 12 })).toEqual({ min: 0, max: 12 });
    expect(sliderRange(-15, {})).toEqual({ min: -50, max: 50 });
    expect(sliderRange(0, {})).toEqual({ min: 0, max: 10 });
    expect(sliderRange(0.35, {})).toEqual({ min: 0, max: 1 });
    expect(sliderRange(45, {}, '°')).toEqual({ min: 0, max: 360 });
  });

  it('picks a step that lands on the default', () => {
    expect(sliderStep(40, { min: 0, max: 100 }, false)).toBe(1);
    expect(sliderStep(30.2, { min: 0, max: 100 }, false)).toBe(0.1);
    expect(sliderStep(0.35, { min: 0, max: 1 }, false)).toBe(0.01);
    expect(sliderStep(4, { min: 0, max: 10 }, false)).toBe(0.1);
    expect(sliderStep(4, { min: 0, max: 10 }, true)).toBe(1);
  });
});
