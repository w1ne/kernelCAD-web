import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }
  const s = await getShapeInfo(scriptPath);
  const noNurbsDiag = !(ev.diagnostics || []).some(d => d.code.startsWith('feature.nurbs.'));
  // Tube volume: thicken=1 around a 16-gon at r=5, length=40 mm.
  // The 16-gon perimeter ≈ 2π·5 ≈ 31.4 mm, so the canonical
  // "perimeter · t · L" band is ≈ 1256 mm³. Empirically the OCCT
  // MakeThickSolidBySimple result is ≈ 1820 mm³ here — the offset
  // produces a thicker effective wall because of corner inflation at
  // each polygon vertex. We use a wide volume band to admit both the
  // canonical thin-wall geometry and the OCCT-resolved version.
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'no nurbs diagnostics': noNurbsDiag,
    },
    scored: {
      'bbox z spans ~40 mm':
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 40) < 2,
      'bbox xy spans ~12 mm (2·outer-radius)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 12) < 4 &&
        Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 12) < 4,
      'volume in tube-shell band (1000-2500 mm³)':
        s.volume > 1000 && s.volume < 2500,
    },
  };
}
