// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { drawingSheetCsv } from './drawingSheetCsv';

describe('drawingSheetCsv', () => {
  it('exports the parts list the way a Fusion drawing CSV does', () => {
    const svg = '<g data-kc-bom-item="1" data-kc-bom-name="Plate, left" data-kc-bom-qty="2" data-kc-bom-material="Al 6061"></g>';
    expect(drawingSheetCsv(svg)).toBe('ITEM,NAME,QTY,MATERIAL\n1,"Plate, left",2,Al 6061\n');
  });

  it('exports sheet text when there is no parts list', () => {
    const svg = '<text>FRONT</text><text>60</text><text> </text>';
    expect(drawingSheetCsv(svg)).toBe('TEXT\nFRONT\n60\n');
  });
});
