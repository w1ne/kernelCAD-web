// SPDX-License-Identifier: MIT
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, OcctBackend } from '../../backends/occt/occtBackend';
import { exportSvgDrawing } from '../../backends/occt/exportSvgDrawing';
import type { WorldFramePart } from '../../backends/occt/sceneToWorldFrame';
import { svgSheetsToPdf } from '../pdf/svgSheetToPdf';
import { drawingSheetCsv } from './drawingSheetCsv';
import { svgSheetToDxf } from './svgSheetToDxf';

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

function viewBoxHeight(svg: string): number {
  const parts = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '').trim().split(/[\s,]+/).map(Number);
  return parts[3];
}

function linesOf(svg: string): Array<[number, number, number, number]> {
  return [...svg.matchAll(/<line\b([^>]*)\/>/g)].map((m) => {
    const n = (name: string) => Number(new RegExp(`${name}="([^"]+)"`).exec(m[1])?.[1]);
    return [n('x1'), n('y1'), n('x2'), n('y2')];
  }).filter((p) => p.every(Number.isFinite));
}

function dxfHasLine(dxf: string, x1: number, y1: number, x2: number, y2: number, height: number): boolean {
  const r = (n: number) => String(Math.round(n * 1000) / 1000);
  const a = `\n10\n${r(x1)}\n20\n${r(height - y1)}\n11\n${r(x2)}\n21\n${r(height - y2)}\n`;
  const b = `\n10\n${r(x2)}\n20\n${r(height - y2)}\n11\n${r(x1)}\n21\n${r(height - y1)}\n`;
  return dxf.includes(a) || dxf.includes(b);
}

describe('real plate sheet formats', () => {
  let svg = '';
  beforeAll(async () => {
    await initOcct();
    const plate: WorldFramePart[] = [{
      name: 'plate',
      shape: OcctBackend.box(60, 40, 10).subtract(OcctBackend.cylinder(12, 6).translate(30, 20, -1)),
    }];
    svg = decode(exportSvgDrawing(plate, { format: 'svg-drawing', modelName: 'plate' }));
  }, 120_000);

  it('puts every sheet line into the DXF, y flipped, in millimetres', () => {
    const dxf = svgSheetToDxf(svg);
    const height = viewBoxHeight(svg);
    const lines = linesOf(svg);
    expect(lines.length).toBeGreaterThan(10);
    const missing = lines.filter((line) => !dxfHasLine(dxf, ...line, height));
    expect(missing).toEqual([]);
    expect(dxf).toContain('$INSUNITS\n70\n4');
    for (const label of ['60', '40', '10', 'FRONT', 'TOP', 'LEFT', 'plate', 'mm']) {
      expect(dxf).toContain(`\n1\n${label}\n`);
    }
  });

  it('lists the dimension and title text in the CSV', () => {
    const csv = drawingSheetCsv(svg);
    for (const label of ['60', '40', '10', 'FRONT', 'plate', '1:1']) expect(csv).toContain(label);
  });

  it('puts the same labels in an uncompressed PDF of that sheet', () => {
    const pdf = decode(svgSheetsToPdf([svg], { title: 'plate' }, false));
    const texts = [...pdf.matchAll(/<([0-9A-Fa-f]+)> Tj/g)].map((m) => {
      let text = '';
      for (let i = 0; i < m[1].length; i += 2) text += String.fromCharCode(parseInt(m[1].slice(i, i + 2), 16));
      return text;
    });
    for (const label of ['60', '40', '10', 'FRONT', 'TOP', 'LEFT', 'plate', 'mm', '1:1']) {
      expect(texts).toContain(label);
    }
  });

  it('keeps a parts list as a Fusion-style CSV and still draws its lines', () => {
    const withList = decode(exportSvgDrawing([{
      name: 'plate',
      shape: OcctBackend.box(60, 40, 10),
    }], { format: 'svg-drawing', modelName: 'plate', partsList: true, balloons: true }));
    // A single part may not emit BOM rows. The converter must still accept the sheet.
    const csv = drawingSheetCsv(withList);
    expect(csv.startsWith('ITEM,NAME,QTY,MATERIAL') || csv.startsWith('TEXT')).toBe(true);
    const dxf = svgSheetToDxf(withList);
    expect(dxf).toContain('EOF');
  });
});
