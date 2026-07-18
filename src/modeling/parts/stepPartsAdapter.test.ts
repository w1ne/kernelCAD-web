// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

/** A GLB-only authored dev-board record, verbatim from kernelCAD's own catalog
 *  (https://kernelcad-parts.pages.dev/v1/parts/nucleo-h563zi-board, July 2026).
 *  buildBoardGlbs.ts deliberately strips `stepUrl` from these and serves
 *  `glbUrl` instead — the mapper must not drop it. */
const GLB_ONLY_BOARD: StepPartsRecord = {
  id: 'nucleo-h563zi-board',
  name: 'ST Nucleo-144 H563ZI',
  category: 'Electronics',
  family: 'STM32',
  tags: ['nucleo', 'stm32', 'h563', 'dev-board'],
  attributes: { bboxXmm: 147, bboxYmm: 70, bboxZmm: 1.6 },
  sha256: '29b087a46fc778ebd727c6de57ba053638eae9dfecb1c14180e43ee45322842e',
  glbUrl: 'https://kernelcad-parts.pages.dev/glb/nucleo-h563zi-board.glb',
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

  it('stamps MIT (the step.parts repo license) and pageUrl attribution', () => {
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

  // Regression: the mapper used to copy only `stepUrl`, silently dropping
  // `glbUrl`. fetchPartHost then saw a record with neither and reported a bare
  // "Remote record X has no stepUrl", hiding the real (by-design) reason.
  it('preserves glbUrl on a GLB-only authored board record', () => {
    const r = mapStepPartsRecord(GLB_ONLY_BOARD);
    expect(r.glbUrl).toBe(GLB_ONLY_BOARD.glbUrl);
    expect(r.stepUrl).toBeUndefined();
    expect(isPartRecord(r)).toBe(true);
  });

  it('leaves glbUrl undefined for a STEP-backed record', () => {
    expect(mapStepPartsRecord(REAL).glbUrl).toBeUndefined();
    expect(mapStepPartsRecord(REAL).stepUrl).toBe(REAL.stepUrl);
  });
});
