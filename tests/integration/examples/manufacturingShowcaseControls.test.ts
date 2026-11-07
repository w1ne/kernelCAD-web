// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { paramsListTool } from '../../../src/agent/mcp/tools/paramsList';

const controls = [
  {
    file: 'examples/manufacturing-showcase/bearing-block.kcad.ts',
    names: ['length', 'width', 'thickness', 'seatDiameter', 'mountInset'],
    expected: {
      length: { value: 80, min: 70, max: 120 },
      width: { value: 50, min: 45, max: 90 },
      thickness: { value: 18, min: 14, max: 30 },
      seatDiameter: { value: 22, min: 21.8, max: 22.2 },
      mountInset: { value: 10, min: 8, max: 14 },
    },
  },
  {
    file: 'examples/manufacturing-showcase/electronics-enclosure.kcad.ts',
    names: ['length', 'width', 'height', 'wall', 'lidThickness'],
    expected: {
      length: { value: 100, min: 80, max: 200 },
      width: { value: 70, min: 60, max: 140 },
      height: { value: 35, min: 20, max: 80 },
      wall: { value: 2.5, min: 1.5, max: 5 },
      lidThickness: { value: 2.5, min: 1.5, max: 5 },
    },
  },
  {
    file: 'examples/manufacturing-showcase/bent-mounting-bracket.kcad.ts',
    names: ['bendAngle', 'length', 'width', 'holeDiameter'],
    expected: {
      bendAngle: { value: 90, min: 45, max: 120 },
      length: { value: 100, min: 90, max: 115 },
      width: { value: 50, min: 40, max: 100 },
      holeDiameter: { value: 5.5, min: 3.4, max: 6.6 },
    },
  },
  {
    file: 'examples/manufacturing-showcase/cut-motor-plate.kcad.ts',
    names: ['length', 'width', 'thickness', 'motorPitch', 'pilotDiameter', 'mountDiameter'],
    expected: {
      length: { value: 100, min: 80, max: 160 },
      width: { value: 80, min: 70, max: 120 },
      thickness: { value: 4, min: 2, max: 8 },
      motorPitch: { value: 31, min: 28, max: 40 },
      pilotDiameter: { value: 22, min: 16, max: 26 },
      mountDiameter: { value: 5.5, min: 3.4, max: 8 },
    },
  },
  {
    file: 'examples/manufacturing-showcase/shoulder-spacer.kcad.ts',
    names: ['length', 'bodyDiameter', 'flangeDiameter', 'boreDiameter', 'flangeThickness'],
    expected: {
      length: { value: 25, min: 8, max: 60 },
      bodyDiameter: { value: 20, min: 16, max: 26 },
      flangeDiameter: { value: 30, min: 28, max: 40 },
      boreDiameter: { value: 8.5, min: 6, max: 12 },
      flangeThickness: { value: 3, min: 2, max: 5 },
    },
  },
  {
    file: 'examples/manufacturing-showcase/bearing-shaft-assembly.kcad.ts',
    names: ['shaftLength', 'shaftDiameter', 'shoulderDiameter', 'retainerThickness'],
    expected: {
      shaftLength: { value: 30, min: 26, max: 60 },
      shaftDiameter: { value: 7.9, min: 7.7, max: 7.98 },
      shoulderDiameter: { value: 12, min: 10, max: 16 },
      retainerThickness: { value: 2, min: 1.5, max: 3 },
    },
  },
  {
    file: 'examples/manufacturing-showcase/moulded-housing.kcad.ts',
    names: ['length', 'width', 'height', 'draftDeg', 'wall', 'boardScrewPilotDia'],
    expected: {
      length: { value: 80, min: 70, max: 120 },
      width: { value: 50, min: 45, max: 90 },
      height: { value: 25, min: 20, max: 40 },
      draftDeg: { value: 1.5, min: 1, max: 5 },
      wall: { value: 2, min: 2, max: 2.5 },
      boardScrewPilotDia: { value: 2.1, min: 2, max: 2.2 },
    },
  },
];

describe('manufacturing showcase advertised controls', () => {
  it.each(controls)('$file exposes only its advertised manufacturing controls', async ({ file, names, expected }) => {
    const result = await paramsListTool({ file });
    expect(result.error).toBeUndefined();
    const actual = Object.fromEntries(result.params.map(({ name, value, min, max }) => [name, { value, min, max }]));
    expect(Object.keys(actual).sort()).toEqual([...names].sort());
    expect(actual).toMatchObject(expected);
  });
});
