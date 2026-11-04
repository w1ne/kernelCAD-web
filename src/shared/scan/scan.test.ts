// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fitBboxToScan, parseScanBytes, parseScanText, refuseScanBoolean, scanEnvelope } from './index';

const PLY = new URL('../../../tests/fixtures/scan/opening-ascii.ply', import.meta.url);
const XYZ = new URL('../../../tests/fixtures/scan/opening.xyz', import.meta.url);

function ok<T extends { ok: boolean; error?: string }>(result: T): Extract<T, { ok: true }> {
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result as Extract<T, { ok: true }>;
}

describe('scan reference parsing', () => {
  it('reads an ASCII PLY fixture with colour and an empty face list', () => {
    const scan = ok(parseScanBytes(readFileSync(PLY)));
    expect(scan.format).toBe('ply-ascii');
    expect(scan.pointCount).toBe(8);
    expect(scan.units).toBe('mm');
    expect(scan.bbox).toEqual({ min: [0, 0, 0], max: [12, 22, 32], size: [12, 22, 32] });
    expect(scan.centroid).toEqual([6, 11, 16]);
    expect(scan.downsampled).toBe(false);
    expect(scan.disclaimer).toMatch(/not a BREP/i);
  });

  it('reads an XYZ fixture and ignores a header and extra columns', () => {
    const scan = ok(parseScanBytes(readFileSync(XYZ)));
    expect(scan.format).toBe('xyz');
    expect(scan.pointCount).toBe(8);
    expect(scan.bbox.size).toEqual([12, 22, 32]);
  });

  it('scales metres and inches into millimetres', () => {
    const metres = ok(parseScanText('0 0 0\n0.012 0.022 0.032\n', { units: 'm' }));
    expect(metres.bbox.max).toEqual([12, 22, 32]);
    expect(metres.scaleToMm).toBe(1000);
    const inches = ok(parseScanText('0 0 0\n1 0 0\n', { units: 'in' }));
    expect(inches.bbox.max[0]).toBeCloseTo(25.4, 9);
  });

  it('finds xyz when colour is listed first and keeps the full bbox while downsampling', () => {
    const text = [
      'ply',
      'format ascii 1.0',
      'element vertex 4',
      'property uchar red',
      'property float x',
      'property float y',
      'property float z',
      'end_header',
      '1 0 0 0',
      '2 10 0 0',
      '3 0 5 0',
      '4 0 0 8',
      '',
    ].join('\n');
    const scan = ok(parseScanText(text, { maxPoints: 2, keepPoints: true }));
    expect(scan.pointCount).toBe(4);
    expect(scan.downsampled).toBe(true);
    expect(scan.storedPointCount).toBe(2);
    expect(scan.points).toEqual([[0, 0, 0], [0, 5, 0]]);
    expect(scan.bbox.max).toEqual([10, 5, 8]);
  });

  it('reads little-endian binary PLY and refuses big-endian by format name', () => {
    const header = 'ply\nformat binary_little_endian 1.0\nelement vertex 2\nproperty float x\nproperty float y\nproperty float z\nend_header\n';
    const head = new TextEncoder().encode(header);
    const body = new Uint8Array(24);
    const view = new DataView(body.buffer);
    [0, 0, 0, 4, 5, 6].forEach((value, index) => view.setFloat32(index * 4, value, true));
    const bytes = new Uint8Array(head.length + body.length);
    bytes.set(head);
    bytes.set(body, head.length);
    const scan = ok(parseScanBytes(bytes));
    expect(scan.format).toBe('ply-binary-little-endian');
    expect(scan.bbox).toEqual({ min: [0, 0, 0], max: [4, 5, 6], size: [4, 5, 6] });

    const big = parseScanText('ply\nformat binary_big_endian 1.0\nelement vertex 1\nproperty float x\nproperty float y\nproperty float z\nend_header\n');
    expect(big.ok).toBe(false);
    if (big.ok) return;
    expect(big.errorCode).toBe('cli.invalid-args');
    expect(big.error).toMatch(/binary_big_endian/);
  });

  it('refuses a vertex list property by name', () => {
    const refused = parseScanText('ply\nformat ascii 1.0\nelement vertex 1\nproperty float x\nproperty list uchar int rest\nend_header\n0\n');
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.error).toMatch(/list property "rest"/);
  });
});

describe('scan envelope and bbox fit', () => {
  it('summarises a point list', () => {
    const envelope = ok(scanEnvelope([[0, 0, 0], [12, 22, 32]]));
    expect(envelope.bbox.size).toEqual([12, 22, 32]);
    expect(envelope.centroid).toEqual([6, 11, 16]);
  });

  it('reports center translation, scale, and per-axis slack', () => {
    const fit = ok(fitBboxToScan(
      { min: [0, 0, 0], max: [10, 20, 30] },
      { min: [100, 0, 1], max: [112, 22, 33] },
      { min_clearance_mm: 2 },
    ));
    expect(fit.translate_mm).toEqual([101, 1, 2]);
    expect(fit.clearance_mm).toEqual([2, 2, 2]);
    expect(fit.axis_deltas_mm.min_mm).toEqual([100, 0, 1]);
    expect(fit.axis_deltas_mm.max_mm).toEqual([102, 2, 3]);
    expect(fit.axis_deltas_mm.size_mm).toEqual([2, 2, 2]);
    expect(fit.scale.per_axis[0]).toBeCloseTo(1.2, 9);
    expect(fit.scale.per_axis[1]).toBeCloseTo(1.1, 9);
    expect(fit.scale.per_axis[2]).toBeCloseTo(32 / 30, 9);
    expect(fit.scale.uniform).toBeCloseTo(32 / 30, 9);
    expect(fit.requirement).toEqual({ min_clearance_mm: 2, pass: true });

    const tight = ok(fitBboxToScan(
      { min: [0, 0, 0], max: [10, 20, 30] },
      { min: [100, 0, 1], max: [112, 22, 33] },
      { min_clearance_mm: 2.1 },
    ));
    expect(tight.requirement?.pass).toBe(false);
  });

  it('refuses a zero-extent model box', () => {
    const fit = fitBboxToScan({ min: [0, 0, 0], max: [0, 1, 1] }, { min: [0, 0, 0], max: [1, 1, 1] });
    expect(fit.ok).toBe(false);
    if (fit.ok) return;
    expect(fit.error).toMatch(/axis x/);
  });
});

describe('scan boolean refusal', () => {
  it('refuses to boolean a scan reference', () => {
    const refused = refuseScanBoolean('union');
    expect(refused.ok).toBe(false);
    expect(refused.errorCode).toBe('cli.invalid-args');
    expect(refused.error).toMatch(/Boolean union is refused/);
    expect(refused.error).toMatch(/not solids/);
  });
});
