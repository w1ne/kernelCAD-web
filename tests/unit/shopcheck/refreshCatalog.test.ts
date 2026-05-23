import { describe, it, expect } from 'vitest';
import { parseMaterialsPage, parseLaserPage, computeSha256 } from '../../../scripts/refreshCatalog';

describe('refreshCatalog parsers (Slice E)', () => {
  it('extracts SKUs and thicknesses from a fixture materials page', () => {
    const html = `<html><body>
      <h2>6061 T6 Aluminum</h2><ul><li>0.125 in</li><li>0.250 in</li></ul>
      <h2>Mild Steel 1018</h2><ul><li>0.060 in</li><li>0.125 in</li></ul>
    </body></html>`;
    const skus = parseMaterialsPage(html);
    expect(skus['6061-t6-aluminum']?.thicknessesIn).toEqual([0.125, 0.250]);
    expect(skus['mild-steel-1018']?.thicknessesIn).toEqual([0.060, 0.125]);
  });

  it('extracts laser thickness envelope from a fixture page', () => {
    const html = `<html><body><p>Thickness range: 0.015 - 0.750 in</p></body></html>`;
    const envelope = parseLaserPage(html);
    expect(envelope.thicknessRangeIn).toEqual([0.015, 0.750]);
  });

  it('falls back to default envelope when laser page omits the range', () => {
    const envelope = parseLaserPage(`<html><body><p>(no thickness clause)</p></body></html>`);
    expect(envelope.thicknessRangeIn).toEqual([0.015, 0.750]);
  });

  it('computes a stable sha256 digest', () => {
    expect(computeSha256('hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});
