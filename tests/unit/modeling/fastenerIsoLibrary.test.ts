// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Table test. Expected numbers live in tests/fixtures/isoFastenerOracle.ts
// and are not read back out of the family-table constants.
import { describe, expect, it } from 'vitest';
import { KernelError } from '../../../src/shared/intent/kernelError';
import { iso4014ReferenceThreadMm } from '../../../src/modeling/parts/fastenerIsoDims';
import { resolvePart } from '../../../src/modeling/parts/familyTable';
import { findPartHost } from '../../../src/modeling/parts/findPart';
import { loadCatalog, queryCatalog } from '../../../src/modeling/parts/catalog';
import {
  COARSE_PITCH,
  ISO_10642,
  ISO_4014_HEAD,
  ISO_4014_LENGTHS,
  ISO_4017_M5_DW,
  ISO_4032,
  ISO_4762,
  ISO_7089,
  ISO_7380,
} from '../../fixtures/isoFastenerOracle';

/** Circumscribed diameter of a hexagon with across-flats width s, mm. */
function acrossCorners(s: number): number {
  return Math.round((2 * s) / Math.sqrt(3) * 1000) / 1000;
}

/** The nut's mating face is on the thread, and the remaining screw covers the nut. */
function nutOnThread(lengthMm: number, threadMm: number, gripMm: number, nutMm: number): boolean {
  const plainUnderHead = lengthMm - threadMm;
  return gripMm >= plainUnderHead && lengthMm - gripMm >= nutMm;
}

function representativeLength(thread: string): number {
  if (thread === 'M2' || thread === 'M2.5') return 16;
  if (thread === 'M3' || thread === 'M4') return 20;
  return 25;
}

describe('ISO/DIN fastener table against the standard fixture', () => {
  it('matches ISO 4762, ISO 7380 and ISO 10642 head rows and coarse pitch', () => {
    for (const row of ISO_4762) {
      const part = resolvePart({ family: 'socket-head-cap-screw', thread: row.thread, lengthMm: representativeLength(row.thread) });
      expect(part.headDiameterMm).toBe(row.d);
      expect(part.headHeightMm).toBe(row.k);
      expect(part.iso?.pitchMm).toBe(COARSE_PITCH[row.thread]);
      expect(part.standard).toBe('ISO 4762');
    }
    for (const row of ISO_7380) {
      const part = resolvePart({ family: 'button-head-cap-screw', thread: row.thread, lengthMm: 16 });
      expect(part.headDiameterMm).toBe(row.d);
      expect(part.headHeightMm).toBe(row.k);
      expect(part.iso?.pitchMm).toBe(COARSE_PITCH[row.thread]);
    }
    for (const row of ISO_10642) {
      const part = resolvePart({ family: 'flat-head-countersunk', thread: row.thread, lengthMm: 16 });
      expect(part.headDiameterMm).toBe(row.d);
      expect(part.headHeightMm).toBe(row.k);
      expect(part.iso?.pitchMm).toBe(COARSE_PITCH[row.thread]);
    }
  });

  it('matches ISO 4032 nuts and ISO 7089 washers', () => {
    for (const row of ISO_4032) {
      const part = resolvePart({ family: 'hex-nut', thread: row.thread });
      expect(part.acrossFlatsMm).toBe(row.s);
      expect(part.headHeightMm).toBe(row.m);
      expect(part.designation).toBe(`ISO 4032 ${row.thread} - 8`);
      expect(part.iso?.pitchMm).toBe(COARSE_PITCH[row.thread]);
    }
    for (const row of ISO_7089) {
      const part = resolvePart({ family: 'flat-washer', thread: row.thread });
      expect(part.headDiameterMm).toBe(row.outside);
      expect(part.innerDiameterMm).toBe(row.inside);
      expect(part.headHeightMm).toBe(row.t);
      expect(part.designation).toBe(`ISO 7089 ${row.thread} - 200 HV`);
    }
  });

  it('matches ISO 4014 heads, stocked lengths and the 2d+6 thread on those lengths', () => {
    for (const row of ISO_4014_HEAD) {
      const stock = ISO_4014_LENGTHS.find((item) => item.thread === row.thread)!;
      for (const lengthMm of stock.lengths) {
        const part = resolvePart({ family: 'hex-head-bolt-partial', thread: row.thread, lengthMm });
        expect(part.acrossFlatsMm).toBe(row.s);
        expect(part.headHeightMm).toBe(row.k);
        expect(part.headDiameterMm).toBe(acrossCorners(row.s));
        expect(part.iso?.washerFaceDiameterMm).toBe(row.dw);
        expect(part.iso?.threadLengthMm).toBe(stock.b);
        expect(part.iso?.pitchMm).toBe(COARSE_PITCH[row.thread]);
        expect(part.designation).toBe(`ISO 4014 ${row.thread}x${lengthMm} - 8.8`);
        expect(part.id).toBe(`iso-4014-${row.thread.toLowerCase().replace('.', '-')}x${lengthMm}`);
      }
    }
    const full = resolvePart({ family: 'hex-head-bolt', thread: 'M5', lengthMm: 25 });
    expect(full.iso?.washerFaceDiameterMm).toBe(ISO_4017_M5_DW);
    const partial = resolvePart({ family: 'ISO 4014', thread: 'M5', lengthMm: 25 });
    expect(partial.iso?.washerFaceDiameterMm).toBe(7.2);
  });

  it('uses the three ISO 4014 thread-length bands, including lengths the table does not stock', () => {
    // Hand arithmetic, written as the result: M12 is 2*12+6, 2*12+12, 2*12+25.
    expect(iso4014ReferenceThreadMm(12, 125)).toBe(30);
    expect(iso4014ReferenceThreadMm(12, 126)).toBe(36);
    expect(iso4014ReferenceThreadMm(12, 160)).toBe(36);
    expect(iso4014ReferenceThreadMm(12, 200)).toBe(36);
    expect(iso4014ReferenceThreadMm(12, 201)).toBe(49);
    expect(iso4014ReferenceThreadMm(12, 210)).toBe(49);
    expect(iso4014ReferenceThreadMm(6, 30)).toBe(18);
  });

  it('keeps the published ISO 4762 partial-thread samples', () => {
    // Short screws are threaded to the head. Longer ones keep the reference b.
    expect(resolvePart({ family: 'ISO 4762', thread: 'M5', lengthMm: 16 }).iso?.threadLengthMm).toBe(16);
    expect(resolvePart({ family: 'socket-head-cap-screw', thread: 'M5', lengthMm: 50 }).iso?.threadLengthMm).toBe(22);
    expect(resolvePart({ family: 'socket-head-cap-screw', thread: 'M3', lengthMm: 12 }).iso?.threadLengthMm).toBe(12);
    expect(resolvePart({ family: 'socket-head-cap-screw', thread: 'M12', lengthMm: 80 }).iso?.threadLengthMm).toBe(36);
  });

  it('resolves DIN aliases to the canonical ISO designation and the same id', () => {
    const din = resolvePart({ family: 'DIN 912', thread: 'M5', lengthMm: 16 });
    const iso = resolvePart({ family: 'ISO 4762', thread: 'M5', lengthMm: 16 });
    expect(din.id).toBe(iso.id);
    expect(din.id).toBe('iso-4762-m5x16');
    expect(din.designation).toBe('ISO 4762 M5x16 - 8.8');
    expect(iso.designation).toBe('ISO 4762 M5x16 - 8.8');
    expect(din.family).toBe('socket-head-cap-screw');
    expect(din.tags).toContain('DIN 912');

    const bolt = resolvePart({ family: 'DIN 931', thread: 'M6', lengthMm: 30 });
    expect(bolt.family).toBe('hex-head-bolt-partial');
    expect(bolt.designation).toBe('ISO 4014 M6x30 - 8.8');
    expect(bolt.standard).toBe('ISO 4014');

    const flat = resolvePart({ family: 'DIN 7991', thread: 'M5', lengthMm: 16 });
    expect(flat.family).toBe('flat-head-countersunk');
    expect(flat.designation).toBe('ISO 10642 M5x16 - 8.8');

    const full = resolvePart({ family: 'DIN 933', thread: 'M6', lengthMm: 20 });
    expect(full.designation).toBe('ISO 4017 M6x20 - 8.8');
    expect(full.family).toBe('hex-head-bolt');

    const set = resolvePart({ family: 'ISO 4026', thread: 'M6', lengthMm: 16 });
    expect(set.designation).toBe('ISO 4026 M6x16');
    const rod = resolvePart({ family: 'DIN 975', thread: 'M8', lengthMm: 250 });
    expect(rod.designation).toBe('DIN 975 M8x250');
  });

  it('refuses sizes and lengths the cited tables do not stock', () => {
    expect(() => resolvePart({ family: 'ISO 10642', thread: 'M2', lengthMm: 16 })).toThrow(KernelError);
    expect(() => resolvePart({ family: 'ISO 7380', thread: 'M12', lengthMm: 20 })).toThrow(KernelError);
    expect(() => resolvePart({ family: 'ISO 4017', thread: 'M2', lengthMm: 16 })).toThrow(KernelError);
    expect(() => resolvePart({ family: 'ISO 4014', thread: 'M16', lengthMm: 80 })).toThrow(KernelError);
    try {
      resolvePart({ family: 'ISO 4014', thread: 'M5', lengthMm: 16 });
      throw new Error('M5×16 was accepted');
    } catch (error) {
      expect(error).toBeInstanceOf(KernelError);
      expect(String(error)).toContain('ISO 4017');
      expect(String(error)).toContain('hex-head-bolt');
      expect(String(error)).toContain('25');
    }
  });

  it('puts an ISO 4014 nut on the thread only when the grip clears the plain shank', () => {
    // M6×30, b = 18, plain shank under the head = 12. ISO 4032 M6 m max = 5.2.
    const bolt = resolvePart({ family: 'ISO 4014', thread: 'M6', lengthMm: 30 });
    expect(bolt.iso?.threadLengthMm).toBe(18);
    expect(nutOnThread(30, 18, 14, 5.2)).toBe(true);
    expect(nutOnThread(30, 18, 8, 5.2)).toBe(false);
    // M6×40 is still b = 18, so a 10 mm grip leaves the nut on the plain shank.
    expect(resolvePart({ family: 'ISO 4014', thread: 'M6', lengthMm: 40 }).iso?.threadLengthMm).toBe(18);
    expect(nutOnThread(40, 18, 10, 5.2)).toBe(false);
    expect(nutOnThread(40, 18, 22, 5.2)).toBe(true);
  });

  it('finds DIN and ISO names as the canonical designation and leaves a bare size on the catalog', async () => {
    const din = await findPartHost('DIN 912 M5x16', { source: 'local' });
    const iso = await findPartHost('ISO 4762 M5x16', { source: 'local' });
    expect(din.results.map((row) => row.id)).toEqual(['iso-4762-m5x16']);
    expect(iso.results.map((row) => row.id)).toEqual(['iso-4762-m5x16']);
    expect(din.results[0]?.attributes.designation).toBe('ISO 4762 M5x16 - 8.8');
    expect(iso.results[0]?.standard).toBe('ISO 4762');

    const partial = await findPartHost('ISO 4014 M6x30', { source: 'local' });
    expect(partial.results[0]?.id).toBe('iso-4014-m6x30');
    expect(partial.results[0]?.attributes.designation).toBe('ISO 4014 M6x30 - 8.8');
    expect(partial.results[0]?.family).toBe('hex-head-bolt-partial');

    const byStandard = await findPartHost('', { standard: 'DIN 931', source: 'local', limit: 5 });
    expect(byStandard.results.length).toBeGreaterThan(0);
    expect(byStandard.results.every((row) => row.standard === 'ISO 4014')).toBe(true);
    expect(byStandard.results.every((row) => String(row.attributes.designation).startsWith('ISO 4014 '))).toBe(true);

    const countersunk = await findPartHost('DIN 7991 M4x16', { source: 'local' });
    expect(countersunk.results[0]?.designation ?? countersunk.results[0]?.attributes.designation).toBe('ISO 10642 M4x16 - 8.8');

    expect(await findPartHost('DIN 912', { family: 'hex-nut', source: 'local' })).toMatchObject({ results: [] });
    expect((await findPartHost('ISO 10642 M2', { source: 'local' })).results).toEqual([]);
    expect((await findPartHost('ISO 4014 M5x16', { source: 'local' })).results).toEqual([]);

    const bare = await findPartHost('M3', { source: 'local' });
    const catalog = queryCatalog(loadCatalog(), 'M3', { limit: 10 });
    expect(bare.results.map((row) => row.id)).toEqual(catalog.map((row) => row.id));
  });
});
