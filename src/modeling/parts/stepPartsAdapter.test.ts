// Tests for the step.parts → PartRecord adapter. The fixture is a verbatim
// /v1/parts/{id} response captured from https://api.step.parts (June 2026).

import { describe, it, expect } from 'vitest';
import {
  mapStepPartsRecord,
  STEP_PARTS_LICENSE,
  type StepPartsRecord,
} from './stepPartsAdapter';
import { isPartRecord } from '../../shared/parts/types';

const REAL: StepPartsRecord = {
  id: 'din913_set_screw_m3x3',
  name: 'DIN 913 set screw, M3 x 3',
  description: 'DIN 913, set screw, M3 x 3.',
  category: 'fastener',
  family: 'set-screw',
  tags: ['screw', 'metric'],
  aliases: ['M3 set screw', 'DIN 913 M3x3', 'DIN913 M3x3'],
  standard: { body: 'DIN', number: '913', designation: 'DIN 913' },
  attributes: { thread: 'M3', lengthMm: 3, nominalSize: 'M3 x 3', driveStyle: 'hex-socket' },
  stepUrl: 'https://media.githubusercontent.com/media/earthtojake/step.parts/abc/catalog/step/din913_set_screw_m3x3.step',
  byteSize: 31410,
  sha256: '527708f07fb56cd0d4a49def35f1d6d12695f3ebbb75ba226e8546921833bac2',
  pageUrl: 'https://www.step.parts/parts/din913_set_screw_m3x3',
};

describe('mapStepPartsRecord', () => {
  it('produces a valid PartRecord from a real step.parts detail record', () => {
    const r = mapStepPartsRecord(REAL);
    expect(isPartRecord(r)).toBe(true);
    expect(r.source).toBe('remote');
  });

  it('flattens the standard object to its designation string', () => {
    expect(mapStepPartsRecord(REAL).standard).toBe('DIN 913');
  });

  it('carries through stepUrl and sha256 so byte verification works', () => {
    const r = mapStepPartsRecord(REAL);
    expect(r.stepUrl).toBe(REAL.stepUrl);
    expect(r.sha256).toBe(REAL.sha256);
  });

  it('folds aliases into tags for fuzzy discovery', () => {
    expect(mapStepPartsRecord(REAL).tags).toEqual(
      expect.arrayContaining(['screw', 'metric', 'M3 set screw', 'DIN913 M3x3']),
    );
  });

  it('stamps a provenance license and pageUrl attribution (step.parts has none)', () => {
    const r = mapStepPartsRecord(REAL);
    expect(r.license).toBe(STEP_PARTS_LICENSE);
    expect(r.attribution).toBe(REAL.pageUrl);
  });

  it('emits no connectors — those are synthesized at fetch time', () => {
    expect(mapStepPartsRecord(REAL).connectors).toEqual([]);
  });

  it('tolerates a legacy string standard and missing optional fields', () => {
    const r = mapStepPartsRecord({
      id: 'x',
      name: 'x',
      category: 'c',
      family: 'f',
      standard: 'ISO 4762',
    });
    expect(r.standard).toBe('ISO 4762');
    expect(r.sha256).toBe('');
    expect(r.attributes).toEqual({});
  });
});
