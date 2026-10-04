// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kernel/export/gcode/printerProfiles.test.ts
//
// The printer profile registry: every named profile has a positive build
// volume, a nozzle, a slicer family and a manufacturer source; unknown ids
// are refused with the full id list; `generic-fdm` keeps its bed; the
// "fits on" suggestion is the smallest fitting profiles, smallest first.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PRINTER_PROFILES, PRINTER_PROFILE_IDS, DEFAULT_PRINTER_PROFILE, FITS_ON_LIMIT,
  resolvePrinterProfile, printableAreaArg, profilesBySize, smallestFittingProfiles,
  fitsOnAdvice, exceedsBed,
} from '../../../../../src/kernel/export/gcode/printerProfiles';

describe('printer profile registry', () => {
  it('has the common printers besides generic-fdm, with unique ids', () => {
    expect(PRINTER_PROFILE_IDS[0]).toBe('generic-fdm');
    expect(new Set(PRINTER_PROFILE_IDS).size).toBe(PRINTER_PROFILE_IDS.length);
    expect(PRINTER_PROFILE_IDS.length).toBeGreaterThanOrEqual(15);
    for (const id of ['bambu-a1-mini', 'bambu-h2d', 'prusa-mk4s', 'prusa-xl']) {
      expect(PRINTER_PROFILE_IDS).toContain(id);
    }
  });

  it.each(PRINTER_PROFILE_IDS)('%s has a positive build volume, a nozzle, a slicer family and a source', (id) => {
    const p = PRINTER_PROFILES[id];
    expect(p.name).toBe(id);
    expect(id).toMatch(/^[a-z0-9][a-z0-9.-]*$/);
    expect(p.label.length).toBeGreaterThan(0);
    for (const v of [p.bedSizeMm.x, p.bedSizeMm.y, p.bedSizeMm.z]) {
      expect(Number.isFinite(v) && v > 0).toBe(true);
    }
    expect(p.nozzleMm).toBeGreaterThan(0);
    expect(p.nozzleMm).toBeLessThan(2);
    expect(['generic', 'bambu', 'orca', 'prusa']).toContain(p.slicer);
    if (id === DEFAULT_PRINTER_PROFILE) {
      expect(p.source).toBeUndefined();
    } else {
      expect(p.source?.url).toMatch(/^https:\/\/[^/]+\//);
      expect(p.source?.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('keeps generic-fdm unchanged: 220x220x250, the same slicer printable area', () => {
    const g = resolvePrinterProfile(undefined);
    expect(g.name).toBe('generic-fdm');
    expect(g.bedSizeMm).toEqual({ x: 220, y: 220, z: 250 });
    expect(g.slicer).toBe('generic');
    expect(printableAreaArg(g)).toBe('0x0,220x0,220x220,0x220');
  });

  it('refuses an unknown id with the list of every valid id', () => {
    expect(() => resolvePrinterProfile('mystery-printer')).toThrow(
      `Unknown printer profile 'mystery-printer'. Known profiles: ${PRINTER_PROFILE_IDS.join(', ')}.`,
    );
    // Object prototype keys are not profiles.
    expect(() => resolvePrinterProfile('toString')).toThrow(/Unknown printer profile 'toString'/);
  });

  it('orders profiles smallest bed first and suggests only fitting ones', () => {
    const sorted = profilesBySize();
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1].bedSizeMm;
      const b = sorted[i].bedSizeMm;
      expect(a.x * a.y).toBeLessThanOrEqual(b.x * b.y);
    }
    const size = { x: 300, y: 300, z: 100 };
    const fitting = smallestFittingProfiles(p => !exceedsBed(size, p));
    const expected = sorted.filter(p => p.name !== DEFAULT_PRINTER_PROFILE && !exceedsBed(size, p));
    expect(fitting.map(p => p.name)).toEqual(expected.slice(0, FITS_ON_LIMIT).map(p => p.name));
    expect(fitting.length).toBeGreaterThan(0);
    for (const p of fitting) expect(p.bedSizeMm.x >= 300 && p.bedSizeMm.y >= 300).toBe(true);
    expect(fitsOnAdvice(fitting)).toBe(
      ` Fits on: ${fitting.map(p => `${p.label} ('${p.name}')`).join(', ')}.`,
    );
    expect(fitsOnAdvice(smallestFittingProfiles(p => !exceedsBed({ x: 5000, y: 1, z: 1 }, p))))
      .toBe(' No bundled printer profile fits it.');
  });
});

describe('kernelcad-print skill printer table', () => {
  it('lists every profile with its registry build volume and slicer family', () => {
    const skill = readFileSync(new URL('../../../../../src/agent/skills/kernelcad-print/SKILL.md', import.meta.url), 'utf8');
    const rows = [...skill.matchAll(/^\| `([^`]+)` \| (\d+)×(\d+)×(\d+)[^|]* \| (\w+) \|$/gm)];
    expect(rows.map(r => r[1])).toEqual([...PRINTER_PROFILE_IDS]);
    for (const [, id, x, y, z, slicer] of rows) {
      const p = PRINTER_PROFILES[id];
      expect([Number(x), Number(y), Number(z)]).toEqual([p.bedSizeMm.x, p.bedSizeMm.y, p.bedSizeMm.z]);
      expect(slicer).toBe(p.slicer);
    }
  });
});
