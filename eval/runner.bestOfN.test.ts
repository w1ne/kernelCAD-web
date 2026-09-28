// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { variantTemperature, reduceHarnessScore, BEST_OF_N } from './runner.js';
import { parseBestOfFlags, parseTaskArg } from './run.js';

describe('best-of-N eval wiring', () => {
  it('exposes a fan-out width > 1', () => {
    expect(BEST_OF_N).toBeGreaterThan(1);
  });

  it('maps each variant index to a distinct temperature, undefined when not fanning out', () => {
    expect(variantTemperature(undefined)).toBeUndefined();
    const temps = [0, 1, 2, 3].map((i) => variantTemperature(i));
    expect(new Set(temps).size).toBe(4); // all distinct
    for (const t of temps) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });

  it('reduces a harness result to the mean of its scored values', () => {
    expect(reduceHarnessScore({ gates: {}, scored: { a: 0.4, b: 0.6 } })).toBeCloseTo(0.5);
  });

  it('reduces a gates-only harness result to 1 when all gates pass, 0 otherwise', () => {
    expect(reduceHarnessScore({ gates: { x: true, y: true }, scored: {} })).toBe(1);
    expect(reduceHarnessScore({ gates: { x: true, y: false }, scored: {} })).toBe(0);
  });
});

describe('eval --best-of / --selector flags', () => {
  it('defaults to the oracle selector and the mode default width', () => {
    expect(parseBestOfFlags([])).toEqual({ selector: 'oracle' });
  });

  it('parses --best-of <N> and --selector consensus', () => {
    expect(parseBestOfFlags(['--best-of', '3', '--selector', 'consensus'])).toEqual({ bestOf: 3, selector: 'consensus' });
    expect(parseBestOfFlags(['--best-of', '1'])).toEqual({ bestOf: 1, selector: 'oracle' });
  });

  it('rejects bad values instead of falling back silently', () => {
    expect(() => parseBestOfFlags(['--best-of', '0'])).toThrow(/integer >= 1/);
    expect(() => parseBestOfFlags(['--best-of', '2.5'])).toThrow(/integer >= 1/);
    expect(() => parseBestOfFlags(['--best-of'])).toThrow(/needs a value/);
    expect(() => parseBestOfFlags(['--selector', 'judge'])).toThrow(/'oracle' or 'consensus'/);
  });

  it('never mistakes a flag value for the task argument', () => {
    expect(parseTaskArg(['--best-of', '3', '--selector', 'consensus', 'bracket-holes'])).toBe('bracket-holes');
    expect(parseTaskArg(['--best-of', '3'])).toBeUndefined();
    expect(parseTaskArg(['--fixture', 'f.json', '--mock', 'bracket-holes'])).toBe('bracket-holes');
  });
});
